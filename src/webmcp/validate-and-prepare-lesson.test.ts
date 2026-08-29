import { describe, expect, it } from 'vitest'
import { createGoldenPathDraft, lostStoryPathMission } from '../domain/lesson-factories'
import { validateLesson } from '../domain/lesson-validation'
import type { LessonDraft } from '../domain/lesson-schemas'
import { createLessonCommandBoundary } from '../state/lesson-state'
import { createProductionWebMcpHandlers } from './use-webmcp'
import { WEBMCP_TOOL_CATALOGUE } from './webmcp-catalogue'
import { createValidateAndPrepareLessonHandler, validateAndPrepareLessonInputSchema, validateAndPrepareLessonJsonSchema } from './validate-and-prepare-lesson'

function lessonDraft(): LessonDraft {
  const draft = createGoldenPathDraft('2026-08-29T14:00:00.000Z')
  return {
    ...draft,
    title: lostStoryPathMission.title,
    mission: structuredClone(lostStoryPathMission),
    adaptations: {
      supports: ['visual-instructions'],
      extensions: ['loop-challenge'],
      supportInstructions: 'Prepare visual instruction cards.',
      extensionInstructions: 'Invite confident groups to add a loop.',
      sectionsToUpdate: [],
      noAdditionalAdaptation: false,
    },
  }
}

function harness(initial = lessonDraft()) {
  let current = initial
  let publications = 0
  const commands = createLessonCommandBoundary(initial, (next) => { current = next; publications += 1 })
  const handler = createValidateAndPrepareLessonHandler({ getDraft: commands.getDraft, runValidation: commands.runValidation })
  return { commands, handler, getDraft: () => current, publications: () => publications }
}

const signal = () => new AbortController().signal

describe('validate_and_prepare_lesson WebMCP handler', () => {
  it('shares the exact canonical descriptor schema and accepts only the two run modes', () => {
    const descriptor = WEBMCP_TOOL_CATALOGUE.find(({ name }) => name === 'validate_and_prepare_lesson')
    expect(descriptor?.inputSchema).toBe(validateAndPrepareLessonJsonSchema)
    expect(validateAndPrepareLessonJsonSchema).toEqual({
      type: 'object', additionalProperties: false,
      properties: { runMode: { type: 'string', description: 'Validation run mode.', enum: ['validate', 'validate-and-prepare'] } },
      required: ['runMode'],
    })
    expect(validateAndPrepareLessonInputSchema.safeParse({ runMode: 'validate' }).success).toBe(true)
    expect(validateAndPrepareLessonInputSchema.safeParse({ runMode: 'validate-and-prepare' }).success).toBe(true)
    for (const invalid of [
      {}, { runMode: 'prepare' }, { runMode: '' }, { runMode: 'validate', extra: true },
      { runMode: 'validate', changeSetId: 'caller' }, { runMode: 'validate', operationId: 'caller' },
      { runMode: 'validate', approvedAt: new Date().toISOString() }, { runMode: 'validate', lesson: lessonDraft() },
    ]) expect(validateAndPrepareLessonInputSchema.safeParse(invalid).success).toBe(false)
  })

  it.each(['validate', 'validate-and-prepare'] as const)('reuses deterministic validation and returns the exact %s result', (runMode) => {
    const initial = lessonDraft()
    const expected = validateLesson(initial)
    const testHarness = harness(initial)
    const result = testHarness.handler({ runMode }, { signal: signal() })
    expect(result).toEqual({
      readiness: expected.readiness,
      score: expected.score,
      checks: expected.checks,
      preparedOutputs: [],
      preparationImplemented: false,
    })
    expect(testHarness.getDraft().validation).toEqual(expected)
    expect(testHarness.publications()).toBe(1)
  })

  it('returns deterministic ordered invalid-lesson results with stable rule data', () => {
    const initial = createGoldenPathDraft('2026-08-29T14:00:00.000Z')
    const expected = validateLesson(initial)
    const result = harness(initial).handler({ runMode: 'validate' }, { signal: signal() })
    expect(result).toMatchObject({ readiness: 'blocked', score: expected.score, checks: expected.checks, preparedOutputs: [], preparationImplemented: false })
    expect((result as { checks: typeof expected.checks }).checks.map(({ id }) => id)).toEqual(Array.from({ length: 13 }, (_, index) => `VAL-${String(index + 1).padStart(2, '0')}`))
    expect((result as { checks: typeof expected.checks }).checks.every(({ message, section }) => message.length > 0 && section.length > 0)).toBe(true)
  })

  it('returns safe structured input failures without publishing state', () => {
    const testHarness = harness()
    for (const candidate of [{}, { runMode: 'prepare' }, { runMode: 'validate', unknown: true }]) {
      expect(testHarness.handler(candidate, { signal: signal() })).toEqual({
        ok: false,
        error: { code: 'invalid-input', message: 'Choose either validate or validate-and-prepare.' },
        stateChanged: false,
      })
    }
    expect(testHarness.publications()).toBe(0)
    expect(testHarness.getDraft()).toEqual(lessonDraft())
  })

  it('changes only derived validation/status metadata and creates no proposal, approval or output', () => {
    const initial = { ...lessonDraft(), approvedAt: undefined }
    const original = structuredClone(initial)
    const testHarness = harness(initial)
    expect(testHarness.handler({ runMode: 'validate-and-prepare' }, { signal: signal() })).toMatchObject({ preparedOutputs: [], preparationImplemented: false })
    const current = testHarness.getDraft()
    expect(current.classContext).toEqual(original.classContext)
    expect(current.resources).toEqual(original.resources)
    expect(current.groupingPlan).toEqual(original.groupingPlan)
    expect(current.mission).toEqual(original.mission)
    expect(current.adaptations).toEqual(original.adaptations)
    expect(current.pendingChanges).toEqual(original.pendingChanges)
    expect(current.changeHistory).toEqual(original.changeHistory)
    expect(current.approvedAt).toBeUndefined()
    expect(current.validation.preparedOutputs).toEqual([])
  })

  it('preserves existing approval because validation has no approval authority', () => {
    const approved = { ...lessonDraft(), status: 'approved' as const, approvedAt: '2026-08-29T14:01:00.000Z' }
    const testHarness = harness(approved)
    testHarness.handler({ runMode: 'validate' }, { signal: signal() })
    expect(testHarness.getDraft().approvedAt).toBe(approved.approvedAt)
    expect(testHarness.getDraft().validation.preparedOutputs).toEqual([])
  })

  it('checks cancellation before validation', () => {
    const early = harness(); const earlyAbort = new AbortController(); earlyAbort.abort()
    expect(early.handler({ runMode: 'validate' }, { signal: earlyAbort.signal })).toMatchObject({ ok: false, error: { code: 'aborted' }, stateChanged: false })
    expect(early.publications()).toBe(0)
  })

  it('catches cancellation after deterministic validation and before atomic publication', () => {
    const controller = new AbortController()
    const initial = lessonDraft()
    let current = initial
    let validationCalculated = false
    let publications = 0
    const commands = createLessonCommandBoundary(initial, (next) => { current = next; publications += 1 })
    const handler = createValidateAndPrepareLessonHandler({
      getDraft: commands.getDraft,
      runValidation: (snapshot, canPublish) => commands.runValidation(snapshot, () => {
        validationCalculated = true
        controller.abort()
        return canPublish?.() ?? true
      }),
    })

    const result = handler({ runMode: 'validate-and-prepare' }, { signal: controller.signal })
    expect(validationCalculated).toBe(true)
    expect(result).toEqual({ ok: false, error: { code: 'aborted', message: 'The tool call was cancelled before validation could be recorded.' }, stateChanged: false })
    expect(publications).toBe(0)
    expect(current).toBe(initial)
    expect(commands.getDraft()).toBe(initial)
    expect(current.pendingChanges).toEqual([])
    expect(current.approvedAt).toBeUndefined()
    expect(current.validation.preparedOutputs).toEqual([])
  })

  it('uses latest production state and rejects an interleaved revision without false success', () => {
    const initial = lessonDraft()
    const latest = { ...initial.mission, assessmentEvidence: [] }
    const productionHarness = harness(initial)
    productionHarness.commands.dispatch({ type: 'update-mission', payload: latest })
    const production = createProductionWebMcpHandlers(productionHarness.commands).validate_and_prepare_lesson
    expect(production?.({ runMode: 'validate' }, { signal: signal() })).toMatchObject({ readiness: 'blocked' })
    expect(productionHarness.getDraft().validation.checks.find(({ id }) => id === 'VAL-06')?.severity).toBe('error')

    const staleHarness = harness(initial)
    const staleHandler = createValidateAndPrepareLessonHandler({
      getDraft: staleHarness.commands.getDraft,
      runValidation: (snapshot) => {
        staleHarness.commands.dispatch({ type: 'update-mission', payload: { ...staleHarness.commands.getDraft().mission, plan: 'Interleaved teacher plan.' } })
        return staleHarness.commands.runValidation(snapshot)
      },
    })
    expect(staleHandler({ runMode: 'validate' }, { signal: signal() })).toMatchObject({ ok: false, error: { code: 'stale-state' }, stateChanged: false })
    expect(staleHarness.getDraft().mission.plan).toBe('Interleaved teacher plan.')
    expect(staleHarness.getDraft().validation.checks).toEqual([])
  })

  it('is repeatably deterministic and propagates unexpected command faults', () => {
    const testHarness = harness()
    const first = testHarness.handler({ runMode: 'validate' }, { signal: signal() })
    const second = testHarness.handler({ runMode: 'validate' }, { signal: signal() })
    expect(second).toEqual(first)

    const draft = lessonDraft()
    const unexpected = createValidateAndPrepareLessonHandler({ getDraft: () => draft, runValidation: () => { throw new Error('unexpected validation publication fault') } })
    expect(() => unexpected({ runMode: 'validate' }, { signal: signal() })).toThrow('unexpected validation publication fault')
  })
})
