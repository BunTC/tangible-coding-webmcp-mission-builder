import { describe, expect, it } from 'vitest'
import { createGoldenPathDraft, lostStoryPathMission } from '../domain/lesson-factories'
import { createPendingChangeSet, getSectionValue, receiveChangeSet, resolveOperation } from '../domain/lesson-change-control'
import type { LessonDraft } from '../domain/lesson-schemas'
import { createLessonCommandBoundary } from '../state/lesson-state'
import { ADAPTATION_SECTION_ORDER, adaptForLearnersInputSchema, adaptForLearnersJsonSchema, createAdaptForLearnersHandler } from './adapt-for-learners'
import { createProductionWebMcpHandlers } from './use-webmcp'
import { WEBMCP_TOOL_CATALOGUE } from './webmcp-catalogue'

const input = {
  supports: ['visual-instructions' as const], extensions: ['loop-challenge' as const],
  supportInstructions: 'Use visual instruction cards.', extensionInstructions: 'Add a loop challenge.',
  sectionsToUpdate: ['plan', 'build-and-explain', 'test-and-debug', 'reflect-and-improve', 'learner-support', 'extension-challenge'] as const,
  cycleSections: [
    { section: 'plan' as const, content: 'Proposed plan.', durationMinutes: 8 },
    { section: 'build-and-explain' as const, content: 'Proposed build.', durationMinutes: 17 },
    { section: 'test-and-debug' as const, content: 'Proposed test.', durationMinutes: 14 },
    { section: 'reflect-and-improve' as const, content: 'Proposed reflection.', durationMinutes: 6 },
  ],
}
const signal = () => new AbortController().signal

function acceptedMissionDraft(now = '2026-08-29T12:00:00.000Z'): LessonDraft {
  const draft = createGoldenPathDraft(now)
  return { ...draft, title: lostStoryPathMission.title, mission: structuredClone(lostStoryPathMission) }
}

function harness(initial: LessonDraft = acceptedMissionDraft()) {
  let draft = initial
  let sequence = 0
  const original = structuredClone(draft)
  const commands = createLessonCommandBoundary(draft, (next) => { draft = next })
  const handler = createAdaptForLearnersHandler({
    getDraft: commands.getDraft, receiveChangeSet: commands.receiveChangeSet,
    createId: () => `adapt-id-${++sequence}`, now: () => '2026-08-29T12:01:00.000Z',
  })
  return { handler, commands, getDraft: () => draft, original }
}

describe('adapt_for_learners WebMCP handler', () => {
  it.each(['omitted context', 'empty context', 'live signal'] as const)('preserves production proposal boundaries with %s', (mode) => {
    const initial = acceptedMissionDraft()
    const commands = createLessonCommandBoundary(initial, () => undefined)
    const production = createProductionWebMcpHandlers(commands).adapt_for_learners
    const result = mode === 'omitted context'
      ? production?.(input)
      : production?.(input, mode === 'empty context' ? {} : { signal: signal() })
    expect(result).toMatchObject({ ok: true, stateChanged: true })
    expect(commands.getDraft().mission).toEqual(initial.mission)
    expect(commands.getDraft().adaptations).toEqual(initial.adaptations)
    expect(commands.getDraft().pendingChanges).toHaveLength(1)
    expect(commands.getDraft().approvedAt).toBeUndefined()
  })

  it('shares the exact six-field canonical descriptor and excludes resource authority', () => {
    const descriptor = WEBMCP_TOOL_CATALOGUE.find(({ name }) => name === 'adapt_for_learners')
    expect(descriptor?.inputSchema).toBe(adaptForLearnersJsonSchema)
    expect(Object.keys(adaptForLearnersJsonSchema.properties)).toEqual(['supports', 'extensions', 'supportInstructions', 'extensionInstructions', 'sectionsToUpdate', 'cycleSections'])
    expect(adaptForLearnersJsonSchema.required).toEqual(Object.keys(adaptForLearnersJsonSchema.properties))
    expect(adaptForLearnersInputSchema.safeParse(input).success).toBe(true)
    for (const unauthorized of [
      { roleCards: 24 }, { robots: 3 }, { resources: {} }, { noAdditionalAdaptation: true },
      { changeSetId: 'caller-set' }, { operationId: 'caller-operation' }, { createdAt: new Date().toISOString() }, { approvedAt: new Date().toISOString() },
    ]) expect(adaptForLearnersInputSchema.safeParse({ ...input, ...unauthorized }).success).toBe(false)
  })

  it('enforces required fields, enums, instruction limits and cycle payload boundaries', () => {
    for (const field of adaptForLearnersJsonSchema.required) {
      const missing = { ...input } as Record<string, unknown>
      delete missing[field]
      expect(adaptForLearnersInputSchema.safeParse(missing).success, field).toBe(false)
    }
    expect(adaptForLearnersInputSchema.safeParse({ ...input, supports: [] }).success).toBe(true)
    expect(adaptForLearnersInputSchema.safeParse({ ...input, extensions: [] }).success).toBe(true)
    expect(adaptForLearnersInputSchema.safeParse({ ...input, supports: ['unknown-support'] }).success).toBe(false)
    expect(adaptForLearnersInputSchema.safeParse({ ...input, extensions: ['unknown-extension'] }).success).toBe(false)
    for (const field of ['supportInstructions', 'extensionInstructions'] as const) {
      expect(adaptForLearnersInputSchema.safeParse({ ...input, [field]: 'x'.repeat(500) }).success).toBe(true)
      expect(adaptForLearnersInputSchema.safeParse({ ...input, [field]: 'x'.repeat(501) }).success).toBe(false)
    }
    const [plan, ...rest] = input.cycleSections
    expect(adaptForLearnersInputSchema.safeParse({ ...input, cycleSections: [{ ...plan, content: 'x'.repeat(500) }, ...rest] }).success).toBe(true)
    expect(adaptForLearnersInputSchema.safeParse({ ...input, cycleSections: [{ ...plan, content: 'x'.repeat(501) }, ...rest] }).success).toBe(false)
    for (const durationMinutes of [0, -1, 1.5, '8']) expect(adaptForLearnersInputSchema.safeParse({ ...input, cycleSections: [{ ...plan, durationMinutes }, ...rest] }).success).toBe(false)
    expect(adaptForLearnersInputSchema.safeParse({ ...input, cycleSections: [{ ...plan, durationMinutes: 1 }, ...rest] }).success).toBe(true)
  })

  it('requires sectionsToUpdate and cycleSections to match exactly and atomically', () => {
    const [plan, build, test, reflect] = input.cycleSections
    const invalid = [
      { ...input, sectionsToUpdate: ['plan', 'plan'], cycleSections: [plan] },
      { ...input, sectionsToUpdate: ['plan'], cycleSections: [] },
      { ...input, sectionsToUpdate: [], cycleSections: [plan] },
      { ...input, sectionsToUpdate: ['plan'], cycleSections: [plan, plan] },
      { ...input, sectionsToUpdate: ['plan'], cycleSections: [build] },
      { ...input, sectionsToUpdate: ['plan'], cycleSections: [{ ...plan, section: 'unknown' }] },
      { ...input, sectionsToUpdate: ['mission-story'], cycleSections: [] },
      { ...input, sectionsToUpdate: ['learner-support'], cycleSections: [test] },
      { ...input, sectionsToUpdate: ['plan'], cycleSections: [{ ...plan, unknown: true }] },
      { ...input, sectionsToUpdate: ['plan'], cycleSections: [{ section: 'plan', content: 'missing duration' }] },
      { ...input, sectionsToUpdate: ['plan', 'reflect-and-improve'], cycleSections: [plan, reflect, build] },
    ]
    for (const candidate of invalid) {
      const testHarness = harness()
      expect(testHarness.handler(candidate, { signal: signal() })).toMatchObject({ ok: false, error: { code: 'invalid-input' }, stateChanged: false })
      expect(testHarness.getDraft()).toEqual(testHarness.original)
    }
    const empty = harness()
    expect(empty.handler({ ...input, sectionsToUpdate: [], cycleSections: [] }, { signal: signal() })).toMatchObject({ ok: false, error: { code: 'invalid-input' }, stateChanged: false })
    expect(empty.getDraft()).toEqual(empty.original)
  })

  it('records latest accepted cycle pairs as before and proposed replacements as after', () => {
    const { handler, getDraft, original } = harness()
    const reversedInput = { ...input, sectionsToUpdate: [...input.sectionsToUpdate].reverse(), cycleSections: [...input.cycleSections].reverse() }
    expect(handler(reversedInput, { signal: signal() })).toMatchObject({ ok: true, sections: ADAPTATION_SECTION_ORDER, stateChanged: true })
    const operations = getDraft().pendingChanges[0].operations
    expect(operations.map(({ section }) => section)).toEqual(ADAPTATION_SECTION_ORDER)
    expect(operations[0]).toMatchObject({ before: { content: original.mission.plan, durationMinutes: original.mission.planDurationMinutes }, proposed: { content: 'Proposed plan.', durationMinutes: 8 } })
    expect(operations[1]).toMatchObject({ before: { content: original.mission.buildAndExplain, durationMinutes: original.mission.buildAndExplainDurationMinutes }, proposed: { content: 'Proposed build.', durationMinutes: 17 } })
    expect(operations[2]).toMatchObject({ before: { content: original.mission.testAndDebug, durationMinutes: original.mission.testAndDebugDurationMinutes }, proposed: { content: 'Proposed test.', durationMinutes: 14 } })
    expect(operations[3]).toMatchObject({ before: { content: original.mission.reflectAndImprove, durationMinutes: original.mission.reflectAndImproveDurationMinutes }, proposed: { content: 'Proposed reflection.', durationMinutes: 6 } })
    expect(operations[4]).toMatchObject({ before: { supports: [], supportInstructions: '' }, proposed: { supports: ['visual-instructions'], supportInstructions: input.supportInstructions } })
    expect(operations[5]).toMatchObject({ before: { extensions: [], extensionInstructions: '' }, proposed: { extensions: ['loop-challenge'], extensionInstructions: input.extensionInstructions } })
  })

  it('permits content-only, duration-only and combined cycle replacements', () => {
    const draft = acceptedMissionDraft()
    const cases = [
      { content: 'Changed content only.', durationMinutes: draft.mission.planDurationMinutes },
      { content: draft.mission.plan, durationMinutes: 9 },
      { content: 'Changed content and duration.', durationMinutes: 7 },
    ]
    for (const proposed of cases) {
      const testHarness = harness(draft)
      const result = testHarness.handler({ ...input, sectionsToUpdate: ['plan'], cycleSections: [{ section: 'plan', ...proposed }] }, { signal: signal() })
      expect(result).toMatchObject({ ok: true, sections: ['plan'] })
      expect(testHarness.getDraft().pendingChanges[0].operations[0]).toMatchObject({ before: { content: draft.mission.plan, durationMinutes: draft.mission.planDurationMinutes }, proposed })
      expect(testHarness.getDraft().mission).toEqual(draft.mission)
    }
  })

  it('creates one complete ordered proposal with internal unique identities and no accepted-state mutation', () => {
    const { handler, getDraft, original } = harness()
    const result = handler(input, { signal: signal() })
    expect(result).toEqual({ ok: true, tool: 'adapt_for_learners', changeSetId: 'adapt-id-1', operationIds: Array.from({ length: 6 }, (_, index) => `adapt-id-${index + 2}`), sections: ADAPTATION_SECTION_ORDER, stateChanged: true })
    expect(JSON.stringify(result).length).toBeLessThanOrEqual(1500)
    const draft = getDraft()
    expect(draft.pendingChanges).toHaveLength(1)
    expect(draft.pendingChanges[0].operations).toHaveLength(6)
    expect(draft.pendingChanges[0].operations.map(({ operationId }) => operationId)).toEqual(Array.from({ length: 6 }, (_, index) => `adapt-id-${index + 2}`))
    expect(draft.classContext).toEqual(original.classContext)
    expect(draft.resources).toEqual(original.resources)
    expect(draft.groupingPlan).toEqual(original.groupingPlan)
    expect(draft.mission).toEqual(original.mission)
    expect(draft.adaptations).toEqual(original.adaptations)
    expect(draft.changeHistory).toEqual(original.changeHistory)
    expect(draft.validation.preparedOutputs).toEqual([])
    expect(draft.approvedAt).toBeUndefined()
  })

  it('preserves unrelated pending and resolved histories', () => {
    let draft = acceptedMissionDraft('2026-08-29T11:00:00.000Z')
    const resolved = createPendingChangeSet(draft, 'set_class_context', [{ section: 'class-context', before: getSectionValue(draft, 'class-context'), proposed: { ...draft.classContext, classSize: 20 } }], { changeSetId: 'history', operationIds: ['history-op'], createdAt: '2026-08-29T11:01:00.000Z' })
    draft = resolveOperation(receiveChangeSet(draft, resolved, '2026-08-29T11:02:00.000Z'), 'history', 'history-op', 'reject', '2026-08-29T11:03:00.000Z')
    const pending = createPendingChangeSet(draft, 'select_tangible_resources', [{ section: 'tangible-resources', before: getSectionValue(draft, 'tangible-resources'), proposed: { ...draft.resources, robots: 2 } }], { changeSetId: 'pending', operationIds: ['pending-op'], createdAt: '2026-08-29T11:04:00.000Z' })
    draft = receiveChangeSet(draft, pending, '2026-08-29T11:05:00.000Z')
    const original = structuredClone(draft)
    const result = harness(draft)
    expect(result.handler({ ...input, sectionsToUpdate: ['learner-support'], cycleSections: [] }, { signal: signal() })).toMatchObject({ ok: true })
    expect(result.getDraft().changeHistory).toEqual(original.changeHistory)
    expect(result.getDraft().pendingChanges[0]).toEqual(original.pendingChanges[0])
  })

  it('clears stale validation and incompatible approval through canonical receipt', () => {
    const draft: LessonDraft = { ...acceptedMissionDraft(), status: 'approved', approvedAt: '2026-08-29T12:05:00.000Z', validation: { readiness: 'ready', score: 1, checks: [{ id: 'VAL-01', severity: 'pass', message: 'Passed.', section: 'class-context', suggestedFix: '' }], acknowledgedWarningIds: [], preparedOutputs: [] } }
    const result = harness(draft)
    expect(result.handler({ ...input, sectionsToUpdate: ['learner-support'], cycleSections: [] }, { signal: signal() })).toMatchObject({ ok: true })
    expect(result.getDraft()).toMatchObject({ status: 'needs-review', approvedAt: undefined, validation: { readiness: 'blocked', score: 0, checks: [], acknowledgedWarningIds: [], preparedOutputs: [] } })
  })

  it('checks cancellation before construction and immediately before receipt', () => {
    const early = harness(); const aborted = new AbortController(); aborted.abort()
    expect(early.handler(input, { signal: aborted.signal })).toMatchObject({ ok: false, error: { code: 'aborted' }, stateChanged: false })
    expect(early.getDraft()).toEqual(early.original)

    const controller = new AbortController(); let draft = acceptedMissionDraft(); const original = structuredClone(draft); let ids = 0
    const commands = createLessonCommandBoundary(draft, (next) => { draft = next })
    const handler = createAdaptForLearnersHandler({ getDraft: commands.getDraft, receiveChangeSet: commands.receiveChangeSet, createId: () => { ids += 1; if (ids === 7) controller.abort(); return `abort-${ids}` }, now: () => '2026-08-29T12:01:00.000Z' })
    expect(handler(input, { signal: controller.signal })).toMatchObject({ ok: false, error: { code: 'aborted' }, stateChanged: false })
    expect(draft).toEqual(original)
  })

  it('uses latest state through production receipt and rejects stale interleaving', () => {
    const initial = acceptedMissionDraft(); let published = 0
    const commands = createLessonCommandBoundary(initial, () => { published += 1 })
    commands.dispatch({ type: 'update-mission', payload: { ...initial.mission, plan: 'Latest teacher plan.', planDurationMinutes: 11 } })
    const production = createProductionWebMcpHandlers(commands).adapt_for_learners
    expect(production?.({ ...input, sectionsToUpdate: ['plan'], cycleSections: [{ section: 'plan', content: 'Proposed plan.', durationMinutes: 9 }] }, { signal: signal() })).toMatchObject({ ok: true, stateChanged: true })
    expect(published).toBe(2)
    expect(commands.getDraft().pendingChanges[0].operations[0].before).toEqual({ content: 'Latest teacher plan.', durationMinutes: 11 })

    const staleHarness = harness()
    const stale = createAdaptForLearnersHandler({
      getDraft: staleHarness.commands.getDraft,
      receiveChangeSet: (set) => {
        staleHarness.commands.dispatch({ type: 'update-mission', payload: { ...staleHarness.commands.getDraft().mission, plan: 'Interleaved teacher plan.' } })
        return staleHarness.commands.receiveChangeSet(set)
      },
      createId: (() => { let id = 0; return () => `stale-${++id}` })(), now: () => '2026-08-29T12:01:00.000Z',
    })
    expect(stale({ ...input, sectionsToUpdate: ['plan'], cycleSections: [input.cycleSections[0]] }, { signal: signal() })).toMatchObject({ ok: false, error: { code: 'stale-state' }, stateChanged: false })
    expect(staleHarness.commands.getDraft().pendingChanges).toEqual([])
    expect(staleHarness.commands.getDraft().mission.plan).toBe('Interleaved teacher plan.')
  })

  it('returns structured reducer rejection and propagates unexpected faults', () => {
    const draft = acceptedMissionDraft()
    const rejected = createAdaptForLearnersHandler({ getDraft: () => draft, receiveChangeSet: () => ({ ok: false, code: 'invalid-proposal', message: 'The proposal could not be recorded because it was invalid.' }), createId: (() => { let id = 0; return () => `reject-${++id}` })(), now: () => new Date().toISOString() })
    expect(rejected({ ...input, sectionsToUpdate: ['learner-support'], cycleSections: [] }, { signal: signal() })).toMatchObject({ ok: false, error: { code: 'invalid-proposal' }, stateChanged: false })
    expect(draft.pendingChanges).toEqual([])
    const unexpected = createAdaptForLearnersHandler({ getDraft: () => draft, receiveChangeSet: () => { throw new Error('unexpected publication fault') }, createId: () => crypto.randomUUID(), now: () => new Date().toISOString() })
    expect(() => unexpected({ ...input, sectionsToUpdate: ['learner-support'], cycleSections: [] }, { signal: signal() })).toThrow('unexpected publication fault')
  })

  it('creates concurrent unique identities without overwriting accepted content', async () => {
    const initial = acceptedMissionDraft(); const commands = createLessonCommandBoundary(initial, () => undefined)
    const production = createProductionWebMcpHandlers(commands).adapt_for_learners
    const payload = { ...input, sectionsToUpdate: ['learner-support'], cycleSections: [] }
    const results = await Promise.all([Promise.resolve().then(() => production?.(payload, { signal: signal() })), Promise.resolve().then(() => production?.({ ...payload, supportInstructions: 'Second proposal.' }, { signal: signal() }))])
    const ids = results.flatMap((result) => { const candidate = result as { changeSetId?: unknown; operationIds?: unknown }; return typeof candidate.changeSetId === 'string' && Array.isArray(candidate.operationIds) ? [candidate.changeSetId, ...candidate.operationIds] : [] })
    expect(ids).toHaveLength(4)
    expect(new Set(ids).size).toBe(4)
    expect(commands.getDraft().pendingChanges).toHaveLength(2)
    expect(commands.getDraft().adaptations).toEqual(initial.adaptations)
  })

  it('requires an accepted mission prerequisite', () => {
    const draft = createGoldenPathDraft()
    const handler = createAdaptForLearnersHandler({ getDraft: () => draft, receiveChangeSet: () => { throw new Error('must not receive') }, createId: () => 'unused', now: () => new Date().toISOString() })
    expect(handler({ ...input, sectionsToUpdate: ['learner-support'], cycleSections: [] }, { signal: signal() })).toMatchObject({ ok: false, error: { code: 'prerequisite-failed' }, stateChanged: false })
  })
})
