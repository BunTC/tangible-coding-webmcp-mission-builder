import { describe, expect, it } from 'vitest'
import { createCleanDraft, createGoldenPathDraft, lostStoryPathMission } from '../domain/lesson-factories'
import { createPendingChangeSet, getSectionValue, receiveChangeSet, resolveOperation } from '../domain/lesson-change-control'
import type { LessonDraft } from '../domain/lesson-schemas'
import { createLessonCommandBoundary } from '../state/lesson-state'
import { createSetClassContextHandler } from './set-class-context'
import { createProductionWebMcpHandlers } from './use-webmcp'

const input = { stage: 'P4', classSize: 24, durationMinutes: 45, learningFocus: ['debugging'], subjectContext: 'literacy', teacherConfidence: 'beginner', goal: 'Debug a fictional story path.' }
const signal = () => new AbortController().signal

function harness() {
  let draft = createCleanDraft('2026-08-29T09:00:00.000Z')
  let sequence = 0
  const original = structuredClone(draft)
  const commands = createLessonCommandBoundary(draft, (next) => { draft = next })
  const handler = createSetClassContextHandler({
    getDraft: commands.getDraft,
    receiveChangeSet: commands.receiveChangeSet,
    createId: () => `transport-id-${++sequence}`,
    now: () => '2026-08-29T09:00:30.000Z',
  })
  return { handler, getDraft: () => draft, original }
}

describe('set_class_context WebMCP handler', () => {
  it.each(['omitted context', 'empty context', 'live signal'] as const)('preserves production proposal boundaries with %s', (mode) => {
    const initial = createCleanDraft('2026-08-29T09:00:00.000Z')
    const commands = createLessonCommandBoundary(initial, () => undefined)
    const production = createProductionWebMcpHandlers(commands).set_class_context
    const result = mode === 'omitted context'
      ? production?.(input)
      : production?.(input, mode === 'empty context' ? {} : { signal: signal() })
    expect(result).toMatchObject({ ok: true, stateChanged: true, section: 'class-context' })
    expect(commands.getDraft().classContext).toEqual(initial.classContext)
    expect(commands.getDraft().pendingChanges).toHaveLength(1)
    expect(commands.getDraft().approvedAt).toBeUndefined()
  })

  it('creates one reviewable proposal without changing accepted or unrelated content', () => {
    const { handler, getDraft, original } = harness()
    const result = handler(input, { signal: signal() })
    const draft = getDraft()
    expect(result).toEqual({ ok: true, changeSetId: 'transport-id-1', operationId: 'transport-id-2', section: 'class-context', proposedContext: input, validationMessages: [], stateChanged: true })
    expect(JSON.stringify(result).length).toBeLessThanOrEqual(1500)
    expect(draft.classContext).toEqual(original.classContext)
    expect(draft.resources).toEqual(original.resources)
    expect(draft.mission).toEqual(original.mission)
    expect(draft.adaptations).toEqual(original.adaptations)
    expect(draft.pendingChanges).toHaveLength(1)
    expect(draft.pendingChanges[0]).toMatchObject({ toolName: 'set_class_context', operations: [{ section: 'class-context', proposed: input }] })
    expect(draft.status).toBe('needs-review')
    expect(draft.validation.preparedOutputs).toEqual([])
    expect(draft.approvedAt).toBeUndefined()
  })

  it('preserves populated unrelated state and clears incompatible prior approval', () => {
    let enriched: LessonDraft = { ...createGoldenPathDraft('2026-08-29T08:00:00.000Z'), title: lostStoryPathMission.title, mission: { ...lostStoryPathMission }, adaptations: { supports: ['visual-instructions'], extensions: ['loop-challenge'], supportInstructions: 'Use visual sequence cards.', extensionInstructions: 'Add one loop challenge.', sectionsToUpdate: [], noAdditionalAdaptation: false } }
    const historical = createPendingChangeSet(enriched, 'build_tangible_mission', [{ section: 'learning-intention', before: getSectionValue(enriched, 'learning-intention'), proposed: 'Historical proposed intention.' }], { changeSetId: 'history-set', operationIds: ['history-operation'], createdAt: '2026-08-29T08:10:00.000Z' })
    enriched = resolveOperation(receiveChangeSet(enriched, historical, '2026-08-29T08:11:00.000Z'), 'history-set', 'history-operation', 'accept', '2026-08-29T08:12:00.000Z')
    enriched = { ...enriched, status: 'approved', approvedAt: '2026-08-29T08:20:00.000Z', validation: { readiness: 'ready', score: 1, checks: [{ id: 'VAL-01', severity: 'pass', message: 'Existing validation evidence.', section: 'class-context', suggestedFix: '' }], preparedOutputs: [], acknowledgedWarningIds: [] } }
    const original = structuredClone(enriched)
    let published = enriched
    let sequence = 0
    const commands = createLessonCommandBoundary(enriched, (next) => { published = next })
    const handler = createSetClassContextHandler({ getDraft: commands.getDraft, receiveChangeSet: commands.receiveChangeSet, createId: () => `approved-${++sequence}`, now: () => '2026-08-29T08:30:00.000Z' })
    expect(handler(input, { signal: signal() })).toMatchObject({ ok: true, stateChanged: true })
    expect(published.classContext).toEqual(original.classContext)
    expect(published.resources).toEqual(original.resources)
    expect(published.groupingPlan).toEqual(original.groupingPlan)
    expect(published.mission).toEqual(original.mission)
    expect(published.adaptations).toEqual(original.adaptations)
    expect(published.changeHistory).toEqual(original.changeHistory)
    expect(published.pendingChanges).toHaveLength(1)
    expect(published.pendingChanges[0].operations).toHaveLength(1)
    expect(published.validation).toEqual({ readiness: 'blocked', score: 0, checks: [], preparedOutputs: [], acknowledgedWarningIds: [] })
    expect(published.status).toBe('needs-review')
    expect(published.approvedAt).toBeUndefined()
  })

  it('returns a safe schema error with zero mutation', () => {
    const { handler, getDraft, original } = harness()
    expect(handler({ ...input, classSize: 0 }, { signal: signal() })).toEqual({ ok: false, error: { code: 'invalid-input', message: 'Class context is invalid. Check the stage, class size, duration and required selections.' }, stateChanged: false })
    expect(getDraft()).toEqual(original)
  })

  it('rejects unknown input properties rather than silently accepting them', () => {
    const { handler, getDraft, original } = harness()
    expect(handler({ ...input, approval: true }, { signal: signal() })).toMatchObject({ ok: false, error: { code: 'invalid-input' }, stateChanged: false })
    expect(getDraft()).toEqual(original)
  })

  it('stops before mutation when aborted', () => {
    const { handler, getDraft, original } = harness()
    const controller = new AbortController(); controller.abort()
    expect(handler(input, { signal: controller.signal })).toMatchObject({ ok: false, error: { code: 'aborted' }, stateChanged: false })
    expect(getDraft()).toEqual(original)
  })

  it('checks cancellation again immediately before mutation', () => {
    let draft = createCleanDraft('2026-08-29T09:00:00.000Z')
    const original = structuredClone(draft)
    const controller = new AbortController()
    let ids = 0
    const commands = createLessonCommandBoundary(draft, (next) => { draft = next })
    const handler = createSetClassContextHandler({ getDraft: commands.getDraft, receiveChangeSet: commands.receiveChangeSet, createId: () => { ids += 1; if (ids === 2) controller.abort(); return `abort-${ids}` }, now: () => '2026-08-29T09:00:30.000Z' })
    expect(handler(input, { signal: controller.signal })).toMatchObject({ ok: false, error: { code: 'aborted' }, stateChanged: false })
    expect(draft).toEqual(original)
  })

  it('returns a safe prerequisite failure when accepted context is malformed', () => {
    const original = createCleanDraft('2026-08-29T09:00:00.000Z')
    const malformed = { ...original, classContext: { ...original.classContext, classSize: 0 } } as LessonDraft
    const receiveChangeSet = () => { throw new Error('must not mutate') }
    const handler = createSetClassContextHandler({ getDraft: () => malformed, receiveChangeSet, createId: () => 'unused', now: () => '2026-08-29T09:00:30.000Z' })
    expect(handler(input, { signal: signal() })).toEqual({ ok: false, error: { code: 'prerequisite-failed', message: 'The current accepted class context is unavailable. Restore a valid lesson draft before proposing changes.' }, stateChanged: false })
  })

  it('injects stable unique identities for concurrent calls', async () => {
    let draft: LessonDraft = createCleanDraft('2026-08-29T09:00:00.000Z')
    let sequence = 0
    const commands = createLessonCommandBoundary(draft, (next) => { draft = next })
    const handler = createSetClassContextHandler({ getDraft: commands.getDraft, receiveChangeSet: commands.receiveChangeSet, createId: () => `concurrent-${++sequence}`, now: () => '2026-08-29T09:00:30.000Z' })
    const results = await Promise.all([Promise.resolve().then(() => handler(input, { signal: signal() })), Promise.resolve().then(() => handler({ ...input, classSize: 16 }, { signal: signal() }))])
    expect(results.map((result) => result.ok && [result.changeSetId, result.operationId])).toEqual([['concurrent-1', 'concurrent-2'], ['concurrent-3', 'concurrent-4']])
    expect(draft.pendingChanges).toHaveLength(2)
    expect(draft.classContext.classSize).not.toBe(16)
  })

  it('confirms production receipt synchronously before reporting success', () => {
    const initial = createCleanDraft('2026-08-29T09:00:00.000Z')
    let published = false
    const commands = createLessonCommandBoundary(initial, () => { published = true })
    const production = createProductionWebMcpHandlers(commands).set_class_context
    const result = production?.(input, { signal: signal() }) as { ok: boolean; stateChanged: boolean }
    expect(published).toBe(true)
    expect(result).toMatchObject({ ok: true, stateChanged: true })
    expect(commands.getDraft().pendingChanges).toHaveLength(1)
  })

  it('returns stale-state when a teacher edit is interleaved before receipt', () => {
    const initial = createCleanDraft('2026-08-29T09:00:00.000Z')
    const commands = createLessonCommandBoundary(initial, () => undefined)
    const interleaved = {
      getDraft: commands.getDraft,
      runValidation: commands.runValidation,
      receiveChangeSet: (set: Parameters<typeof commands.receiveChangeSet>[0]) => {
        commands.dispatch({ type: 'update-class-context', payload: { ...commands.getDraft().classContext, classSize: 12 } })
        return commands.receiveChangeSet(set)
      },
    }
    const production = createProductionWebMcpHandlers(interleaved).set_class_context
    const result = production?.(input, { signal: signal() })
    expect(result).toEqual({ ok: false, error: { code: 'stale-state', message: 'The accepted lesson changed before this proposal could be recorded. Try again with the current lesson.' }, stateChanged: false })
    expect(commands.getDraft().classContext.classSize).toBe(12)
    expect(commands.getDraft().pendingChanges).toEqual([])
  })

  it('returns a structured invalid-proposal result for reducer schema rejection', () => {
    const commands = createLessonCommandBoundary(createCleanDraft('2026-08-29T09:00:00.000Z'), () => undefined)
    const result = commands.receiveChangeSet({ changeSetId: '', source: 'webmcp-agent', toolName: 'set_class_context', operations: [], createdAt: 'invalid' } as never)
    expect(result).toEqual({ ok: false, code: 'invalid-proposal', message: 'The proposal could not be recorded because it was invalid.' })
    expect(commands.getDraft().pendingChanges).toEqual([])
  })

  it('does not convert unexpected reducer faults into expected failures', () => {
    const commands = createLessonCommandBoundary(createCleanDraft('2026-08-29T09:00:00.000Z'), () => { throw new Error('unexpected publish fault') })
    const set = createPendingChangeSet(commands.getDraft(), 'set_class_context', [{ section: 'class-context', before: commands.getDraft().classContext, proposed: input }], { changeSetId: 'unexpected-set', operationIds: ['unexpected-operation'], createdAt: '2026-08-29T09:01:00.000Z' })
    expect(() => commands.receiveChangeSet(set)).toThrow('unexpected publish fault')
  })

  it('does not let a rejected concurrent call overwrite accepted state', async () => {
    const initial = createCleanDraft('2026-08-29T09:00:00.000Z')
    const commands = createLessonCommandBoundary(initial, () => undefined)
    let first = true
    const interleaved = {
      getDraft: commands.getDraft,
      runValidation: commands.runValidation,
      receiveChangeSet: (set: Parameters<typeof commands.receiveChangeSet>[0]) => {
        if (first) {
          first = false
          commands.dispatch({ type: 'update-class-context', payload: { ...commands.getDraft().classContext, classSize: 18 } })
        }
        return commands.receiveChangeSet(set)
      },
    }
    const production = createProductionWebMcpHandlers(interleaved).set_class_context
    const results = await Promise.all([
      Promise.resolve().then(() => production?.(input, { signal: signal() })),
      Promise.resolve().then(() => production?.({ ...input, classSize: 20 }, { signal: signal() })),
    ])
    expect(results[0]).toMatchObject({ ok: false, error: { code: 'stale-state' }, stateChanged: false })
    expect(results[1]).toMatchObject({ ok: true, stateChanged: true })
    expect(commands.getDraft().classContext.classSize).toBe(18)
    expect(commands.getDraft().pendingChanges).toHaveLength(1)
  })
})
