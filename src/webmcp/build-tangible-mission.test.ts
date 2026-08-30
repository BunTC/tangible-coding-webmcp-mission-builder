import { describe, expect, it } from 'vitest'
import { createCleanDraft, createGoldenPathDraft, lostStoryPathMission } from '../domain/lesson-factories'
import { createPendingChangeSet, getSectionValue, receiveChangeSet, resolveOperation } from '../domain/lesson-change-control'
import type { LessonDraft } from '../domain/lesson-schemas'
import { createLessonCommandBoundary } from '../state/lesson-state'
import { BUILD_MISSION_SECTION_ORDER, buildTangibleMissionInputSchema, buildTangibleMissionJsonSchema, createBuildTangibleMissionHandler } from './build-tangible-mission'
import { createProductionWebMcpHandlers } from './use-webmcp'
import { WEBMCP_TOOL_CATALOGUE } from './webmcp-catalogue'
import { createProposalPackage, proposalPackageSchema } from '../domain/lesson-proposal-package'

const input = { ...lostStoryPathMission, challengeLevel: 'core' as const }
const signal = () => new AbortController().signal

function harness(initial: LessonDraft = createGoldenPathDraft('2026-08-29T11:00:00.000Z')) {
  let draft = initial
  let sequence = 0
  const original = structuredClone(draft)
  const commands = createLessonCommandBoundary(draft, (next) => { draft = next })
  const handler = createBuildTangibleMissionHandler({
    getDraft: commands.getDraft,
    receiveChangeSet: commands.receiveChangeSet,
    createId: () => `mission-id-${++sequence}`,
    now: () => '2026-08-29T11:01:00.000Z',
  })
  return { handler, commands, getDraft: () => draft, original }
}

describe('build_tangible_mission WebMCP handler', () => {
  it.each(['omitted context', 'empty context', 'live signal'] as const)('preserves production proposal boundaries with %s', (mode) => {
    const initial = createGoldenPathDraft('2026-08-29T11:00:00.000Z')
    const commands = createLessonCommandBoundary(initial, () => undefined)
    const production = createProductionWebMcpHandlers(commands).build_tangible_mission
    const result = mode === 'omitted context'
      ? production?.(input)
      : production?.(input, mode === 'empty context' ? {} : { signal: signal() })
    expect(result).toMatchObject({ ok: true, stateChanged: true })
    expect(commands.getDraft().mission).toEqual(initial.mission)
    expect(commands.getDraft().pendingChanges).toHaveLength(1)
    expect(commands.getDraft().approvedAt).toBeUndefined()
  })

  it('shares the exact descriptor schema and accepts the complete canonical boundary', () => {
    const descriptor = WEBMCP_TOOL_CATALOGUE.find(({ name }) => name === 'build_tangible_mission')
    expect(descriptor?.inputSchema).toBe(buildTangibleMissionJsonSchema)
    expect(Object.keys(buildTangibleMissionJsonSchema.properties)).toEqual([...buildTangibleMissionJsonSchema.required, 'teacherContext'])
    expect(buildTangibleMissionInputSchema.safeParse(input).success).toBe(true)
    expect(BUILD_MISSION_SECTION_ORDER).toEqual([
      'lesson-identity', 'learning-intention', 'success-criteria', 'mission-story', 'plan',
      'build-and-explain', 'test-and-debug', 'reflect-and-improve', 'assessment-evidence',
    ])
  })

  it('enforces every required field and rejects caller-supplied sections or identities', () => {
    for (const field of buildTangibleMissionJsonSchema.required) {
      const missing = { ...input } as Record<string, unknown>
      delete missing[field]
      expect(buildTangibleMissionInputSchema.safeParse(missing).success, field).toBe(false)
    }
    for (const unauthorized of [
      { sections: ['lesson-identity', 'lesson-identity'] },
      { operationId: 'caller-operation' },
      { changeSetId: 'caller-set' },
      { resources: { robots: 12 } },
      { adaptations: { noAdditionalAdaptation: true } },
      { approval: true },
    ]) expect(buildTangibleMissionInputSchema.safeParse({ ...input, ...unauthorized }).success).toBe(false)
  })

  it('enforces all text, list and duration boundaries', () => {
    const textLimits = {
      title: 100, theme: 160, learningIntention: 240, missionStory: 700,
      plan: 500, buildAndExplain: 500, testAndDebug: 500, reflectAndImprove: 500,
    } as const
    for (const [field, limit] of Object.entries(textLimits)) {
      expect(buildTangibleMissionInputSchema.safeParse({ ...input, [field]: 'x'.repeat(limit) }).success, `${field} maximum`).toBe(true)
      expect(buildTangibleMissionInputSchema.safeParse({ ...input, [field]: 'x'.repeat(limit + 1) }).success, `${field} over maximum`).toBe(false)
    }
    for (const field of ['planDurationMinutes', 'buildAndExplainDurationMinutes', 'testAndDebugDurationMinutes', 'reflectAndImproveDurationMinutes'] as const) {
      expect(buildTangibleMissionInputSchema.safeParse({ ...input, [field]: 1 }).success, `${field} minimum`).toBe(true)
      for (const value of [0, -1, 1.5, '10']) expect(buildTangibleMissionInputSchema.safeParse({ ...input, [field]: value }).success, `${field} ${value}`).toBe(false)
    }
    expect(buildTangibleMissionInputSchema.safeParse({ ...input, successCriteria: ['a', 'b'] }).success).toBe(true)
    expect(buildTangibleMissionInputSchema.safeParse({ ...input, successCriteria: ['a', 'b', 'c', 'd'] }).success).toBe(true)
    expect(buildTangibleMissionInputSchema.safeParse({ ...input, successCriteria: ['a'] }).success).toBe(false)
    expect(buildTangibleMissionInputSchema.safeParse({ ...input, successCriteria: ['a', 'b', 'c', 'd', 'e'] }).success).toBe(false)
    expect(buildTangibleMissionInputSchema.safeParse({ ...input, successCriteria: ['x'.repeat(181), 'b'] }).success).toBe(false)
    expect(buildTangibleMissionInputSchema.safeParse({ ...input, assessmentEvidence: ['a'] }).success).toBe(true)
    expect(buildTangibleMissionInputSchema.safeParse({ ...input, assessmentEvidence: ['a', 'b', 'c', 'd', 'e'] }).success).toBe(true)
    expect(buildTangibleMissionInputSchema.safeParse({ ...input, assessmentEvidence: [] }).success).toBe(false)
    expect(buildTangibleMissionInputSchema.safeParse({ ...input, assessmentEvidence: ['a', 'b', 'c', 'd', 'e', 'f'] }).success).toBe(false)
    expect(buildTangibleMissionInputSchema.safeParse({ ...input, assessmentEvidence: ['x'.repeat(181)] }).success).toBe(false)
    for (const challengeLevel of ['introductory', 'core', 'stretch']) expect(buildTangibleMissionInputSchema.safeParse({ ...input, challengeLevel }).success).toBe(true)
    expect(buildTangibleMissionInputSchema.safeParse({ ...input, challengeLevel: 'advanced' }).success).toBe(false)
  })

  it('creates one ordered nine-section proposal without mutating accepted lesson state', () => {
    const { handler, getDraft, original } = harness()
    const result = handler(input, { signal: signal() })
    const draft = getDraft()
    expect(result).toMatchObject({
      ok: true, tool: 'build_tangible_mission', changeSetId: 'mission-id-1',
      operationIds: Array.from({ length: 9 }, (_, index) => `mission-id-${index + 2}`), sections: BUILD_MISSION_SECTION_ORDER,
      missionVersion: { title: input.title, challengeLevel: input.challengeLevel }, feasibilityWarnings: original.groupingPlan.warnings, stateChanged: true,
    })
    expect(result).toHaveProperty('proposalPackage.operations')
    expect(result.ok && proposalPackageSchema.safeParse(result.proposalPackage).success).toBe(true)
    expect(result.ok && result.proposalPackage).toEqual(createProposalPackage(draft.pendingChanges[0]))
    expect(JSON.stringify(result).length).toBeLessThanOrEqual(15000)
    expect(draft.pendingChanges).toHaveLength(1)
    expect(draft.pendingChanges[0].toolName).toBe('build_tangible_mission')
    expect(draft.pendingChanges[0].operations.map(({ section }) => section)).toEqual(BUILD_MISSION_SECTION_ORDER)
    expect(draft.pendingChanges[0].operations.map(({ operationId }) => operationId)).toEqual(Array.from({ length: 9 }, (_, index) => `mission-id-${index + 2}`))
    expect(draft.mission).toEqual(original.mission)
    expect(draft.classContext).toEqual(original.classContext)
    expect(draft.resources).toEqual(original.resources)
    expect(draft.groupingPlan).toEqual(original.groupingPlan)
    expect(draft.adaptations).toEqual(original.adaptations)
    expect(draft.changeHistory).toEqual(original.changeHistory)
    expect(draft.validation.preparedOutputs).toEqual([])
    expect(draft.approvedAt).toBeUndefined()
  })

  it('rejects malformed and unknown input atomically', () => {
    for (const malformed of [
      { ...input, title: 24 },
      { ...input, successCriteria: 'two criteria' },
      { ...input, planDurationMinutes: null },
      { ...input, unknown: true },
      { ...input, sections: BUILD_MISSION_SECTION_ORDER },
    ]) {
      const { handler, getDraft, original } = harness()
      expect(handler(malformed, { signal: signal() })).toMatchObject({ ok: false, error: { code: 'invalid-input' }, stateChanged: false })
      expect(getDraft()).toEqual(original)
    }
  })

  it('preserves unresolved and resolved unrelated proposals', () => {
    let draft = createGoldenPathDraft('2026-08-29T10:00:00.000Z')
    const history = createPendingChangeSet(draft, 'set_class_context', [{ section: 'class-context', before: getSectionValue(draft, 'class-context'), proposed: { ...draft.classContext, classSize: 20 } }], { changeSetId: 'history', operationIds: ['history-op'], createdAt: '2026-08-29T10:01:00.000Z' })
    draft = resolveOperation(receiveChangeSet(draft, history, '2026-08-29T10:02:00.000Z'), 'history', 'history-op', 'reject', '2026-08-29T10:03:00.000Z')
    const pending = createPendingChangeSet(draft, 'select_tangible_resources', [{ section: 'tangible-resources', before: getSectionValue(draft, 'tangible-resources'), proposed: { ...draft.resources, robots: 2 } }], { changeSetId: 'pending', operationIds: ['pending-op'], createdAt: '2026-08-29T10:04:00.000Z' })
    draft = receiveChangeSet(draft, pending, '2026-08-29T10:05:00.000Z')
    const original = structuredClone(draft)
    const result = harness(draft)
    expect(result.handler(input, { signal: signal() })).toMatchObject({ ok: true })
    expect(result.getDraft().changeHistory).toEqual(original.changeHistory)
    expect(result.getDraft().pendingChanges.slice(0, 1)).toEqual(original.pendingChanges)
    expect(result.getDraft().pendingChanges[1].operations).toHaveLength(9)
  })

  it('clears stale validation and incompatible approval only through proposal receipt', () => {
    const approved: LessonDraft = {
      ...createGoldenPathDraft('2026-08-29T10:00:00.000Z'), status: 'approved', approvedAt: '2026-08-29T10:10:00.000Z',
      validation: { readiness: 'ready', score: 1, checks: [{ id: 'VAL-01', severity: 'pass', message: 'Passed.', section: 'class-context', suggestedFix: '' }], acknowledgedWarningIds: [], preparedOutputs: [] },
    }
    const { handler, getDraft } = harness(approved)
    expect(handler(input, { signal: signal() })).toMatchObject({ ok: true })
    expect(getDraft()).toMatchObject({ status: 'needs-review', approvedAt: undefined, validation: { readiness: 'blocked', score: 0, checks: [], acknowledgedWarningIds: [], preparedOutputs: [] } })
  })

  it('checks abort before construction and immediately before receipt', () => {
    const early = harness()
    const aborted = new AbortController(); aborted.abort()
    expect(early.handler(input, { signal: aborted.signal })).toMatchObject({ ok: false, error: { code: 'aborted' }, stateChanged: false })
    expect(early.getDraft()).toEqual(early.original)

    const controller = new AbortController()
    let draft = createGoldenPathDraft('2026-08-29T11:00:00.000Z')
    const original = structuredClone(draft)
    let ids = 0
    const commands = createLessonCommandBoundary(draft, (next) => { draft = next })
    const handler = createBuildTangibleMissionHandler({ getDraft: commands.getDraft, receiveChangeSet: commands.receiveChangeSet, createId: () => { ids += 1; if (ids === 10) controller.abort(); return `abort-${ids}` }, now: () => '2026-08-29T11:01:00.000Z' })
    expect(handler(input, { signal: controller.signal })).toMatchObject({ ok: false, error: { code: 'aborted' }, stateChanged: false })
    expect(draft).toEqual(original)
  })

  it('confirms production receipt synchronously using the latest mission before-values', () => {
    const initial = createGoldenPathDraft('2026-08-29T11:00:00.000Z')
    let published = 0
    const commands = createLessonCommandBoundary(initial, () => { published += 1 })
    commands.dispatch({ type: 'update-mission', payload: { ...initial.mission, title: 'Teacher current title' } })
    const production = createProductionWebMcpHandlers(commands).build_tangible_mission
    expect(production?.(input, { signal: signal() })).toMatchObject({ ok: true, stateChanged: true })
    expect(published).toBe(2)
    expect(commands.getDraft().pendingChanges[0].operations[0].before).toMatchObject({ title: 'Teacher current title' })
    expect(commands.getDraft().mission.title).toBe('Teacher current title')
  })

  it('returns structured rejection and stale interleaving without false success', () => {
    const rejectedDraft = createGoldenPathDraft()
    const rejected = createBuildTangibleMissionHandler({ getDraft: () => rejectedDraft, receiveChangeSet: () => ({ ok: false, code: 'invalid-proposal', message: 'The proposal could not be recorded because it was invalid.' }), createId: (() => { let id = 0; return () => `rejected-${++id}` })(), now: () => new Date().toISOString() })
    expect(rejected(input, { signal: signal() })).toMatchObject({ ok: false, error: { code: 'invalid-proposal' }, stateChanged: false })
    expect(rejectedDraft.pendingChanges).toEqual([])

    const current = harness()
    const stale = createBuildTangibleMissionHandler({
      getDraft: current.commands.getDraft,
      receiveChangeSet: (set) => {
        current.commands.dispatch({ type: 'update-mission', payload: { ...current.commands.getDraft().mission, title: 'Interleaved teacher title' } })
        return current.commands.receiveChangeSet(set)
      },
      createId: (() => { let id = 0; return () => `stale-${++id}` })(), now: () => '2026-08-29T11:01:00.000Z',
    })
    expect(stale(input, { signal: signal() })).toMatchObject({ ok: false, error: { code: 'stale-state' }, stateChanged: false })
    expect(current.commands.getDraft().mission.title).toBe('Interleaved teacher title')
    expect(current.commands.getDraft().pendingChanges).toEqual([])
  })

  it('creates unique identities for concurrent proposals without overwriting accepted content', async () => {
    const initial = createGoldenPathDraft('2026-08-29T11:00:00.000Z')
    const commands = createLessonCommandBoundary(initial, () => undefined)
    const production = createProductionWebMcpHandlers(commands).build_tangible_mission
    const results = await Promise.all([
      Promise.resolve().then(() => production?.(input, { signal: signal() })),
      Promise.resolve().then(() => production?.({ ...input, title: 'Second proposed mission' }, { signal: signal() })),
    ])
    const ids = results.flatMap((result) => {
      const candidate = result as { changeSetId?: unknown; operationIds?: unknown }
      return typeof candidate.changeSetId === 'string' && Array.isArray(candidate.operationIds) ? [candidate.changeSetId, ...candidate.operationIds] : []
    })
    expect(ids).toHaveLength(20)
    expect(new Set(ids).size).toBe(20)
    expect(commands.getDraft().pendingChanges).toHaveLength(2)
    expect(commands.getDraft().mission).toEqual(initial.mission)
  })

  it('propagates unexpected faults', () => {
    const draft = createGoldenPathDraft()
    const handler = createBuildTangibleMissionHandler({ getDraft: () => draft, receiveChangeSet: () => { throw new Error('unexpected publication fault') }, createId: () => crypto.randomUUID(), now: () => new Date().toISOString() })
    expect(() => handler(input, { signal: signal() })).toThrow('unexpected publication fault')
  })

  it('rejects malformed prerequisites before constructing a proposal', () => {
    const clean = createCleanDraft()
    const malformed = { ...clean, resources: { ...clean.resources, robots: -1 } } as LessonDraft
    const handler = createBuildTangibleMissionHandler({ getDraft: () => malformed, receiveChangeSet: () => { throw new Error('must not receive') }, createId: () => 'unused', now: () => new Date().toISOString() })
    expect(handler(input, { signal: signal() })).toMatchObject({ ok: false, error: { code: 'prerequisite-failed' }, stateChanged: false })
  })
})
