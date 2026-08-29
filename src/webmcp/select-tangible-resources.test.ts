import { describe, expect, it } from 'vitest'
import { createCleanDraft, createGoldenPathDraft, goldenPathResources, lostStoryPathMission } from '../domain/lesson-factories'
import { createPendingChangeSet, getSectionValue, receiveChangeSet, resolveOperation } from '../domain/lesson-change-control'
import type { LessonDraft, ResourceInventory } from '../domain/lesson-schemas'
import { createLessonCommandBoundary } from '../state/lesson-state'
import { createProductionWebMcpHandlers } from './use-webmcp'
import { selectTangibleResourcesInputSchema, selectTangibleResourcesJsonSchema, createSelectTangibleResourcesHandler } from './select-tangible-resources'
import { WEBMCP_TOOL_CATALOGUE } from './webmcp-catalogue'

const input = { robots: 2, tileSets: 6, activityMats: 2, instructionCardPacks: 2, allowTileOnlyGroups: true }
const signal = () => new AbortController().signal

function harness(initial: LessonDraft = createGoldenPathDraft('2026-08-29T10:00:00.000Z')) {
  let draft = initial
  let sequence = 0
  const original = structuredClone(draft)
  const commands = createLessonCommandBoundary(draft, (next) => { draft = next })
  const handler = createSelectTangibleResourcesHandler({
    getDraft: commands.getDraft,
    receiveChangeSet: commands.receiveChangeSet,
    createId: () => `resource-id-${++sequence}`,
    now: () => '2026-08-29T10:01:00.000Z',
  })
  return { handler, commands, getDraft: () => draft, original }
}

describe('select_tangible_resources WebMCP handler', () => {
  it('keeps its strict runtime schema structurally aligned with the authoritative descriptor', () => {
    const descriptor = WEBMCP_TOOL_CATALOGUE.find(({ name }) => name === 'select_tangible_resources')
    expect(descriptor?.inputSchema).toBe(selectTangibleResourcesJsonSchema)
    expect(selectTangibleResourcesInputSchema.safeParse(input).success).toBe(true)
    expect(selectTangibleResourcesInputSchema.safeParse({ ...input, roleCards: 12 }).success).toBe(true)
    expect(selectTangibleResourcesInputSchema.safeParse({ ...input, roleCards: '12' }).success).toBe(false)
    expect(selectTangibleResourcesInputSchema.safeParse({ ...input, approval: true }).success).toBe(false)
    expect(selectTangibleResourcesInputSchema.safeParse({ ...input, section: 'class-context' }).success).toBe(false)
    expect(selectTangibleResourcesInputSchema.safeParse({ ...input, noAdditionalAdaptation: true }).success).toBe(false)
    for (const required of selectTangibleResourcesJsonSchema.required) {
      const withoutRequired = { ...input } as Record<string, unknown>
      delete withoutRequired[required]
      expect(selectTangibleResourcesInputSchema.safeParse(withoutRequired).success, required).toBe(false)
    }
    const boundaries = {
      robots: [0, 12], tileSets: [0, 30], activityMats: [0, 12], instructionCardPacks: [0, 12], roleCards: [0, 40],
    } as const
    for (const [field, [minimum, maximum]] of Object.entries(boundaries)) {
      expect(selectTangibleResourcesInputSchema.safeParse({ ...input, [field]: minimum }).success, `${field} minimum`).toBe(true)
      expect(selectTangibleResourcesInputSchema.safeParse({ ...input, [field]: maximum }).success, `${field} maximum`).toBe(true)
      expect(selectTangibleResourcesInputSchema.safeParse({ ...input, [field]: minimum - 1 }).success, `${field} below minimum`).toBe(false)
      expect(selectTangibleResourcesInputSchema.safeParse({ ...input, [field]: maximum + 1 }).success, `${field} above maximum`).toBe(false)
      expect(selectTangibleResourcesInputSchema.safeParse({ ...input, [field]: minimum + 0.5 }).success, `${field} fractional`).toBe(false)
    }
  })

  it('creates one resource proposal, preserves omitted role cards and leaves accepted state untouched', () => {
    const { handler, getDraft, original } = harness()
    const result = handler(input, { signal: signal() })
    const draft = getDraft()
    expect(result).toMatchObject({
      ok: true, tool: 'select_tangible_resources', changeSetId: 'resource-id-1', operationId: 'resource-id-2',
      section: 'tangible-resources', proposedInventory: { ...input, roleCards: original.resources.roleCards },
      roleCards: 'preserved', stateChanged: true,
    })
    expect(JSON.stringify(result).length).toBeLessThanOrEqual(1500)
    expect(draft.classContext).toEqual(original.classContext)
    expect(draft.resources).toEqual(original.resources)
    expect(draft.groupingPlan).toEqual(original.groupingPlan)
    expect(draft.mission).toEqual(original.mission)
    expect(draft.adaptations).toEqual(original.adaptations)
    expect(draft.changeHistory).toEqual(original.changeHistory)
    expect(draft.pendingChanges).toHaveLength(1)
    expect(draft.pendingChanges[0]).toMatchObject({ toolName: 'select_tangible_resources', operations: [{ section: 'tangible-resources', before: original.resources, proposed: { ...input, roleCards: original.resources.roleCards } }] })
    expect(draft.validation.preparedOutputs).toEqual([])
    expect(draft.approvedAt).toBeUndefined()
  })

  it('uses supplied role cards without silently changing any other inventory field', () => {
    const { handler, getDraft, original } = harness()
    expect(handler({ ...input, roleCards: 8 }, { signal: signal() })).toMatchObject({ ok: true, proposedInventory: { ...input, roleCards: 8 }, roleCards: 'provided' })
    expect(getDraft().resources).toEqual(original.resources)
  })

  it.each([
    [{ ...input, robots: -1 }],
    [{ ...input, tileSets: 31 }],
    [{ ...input, activityMats: 1.5 }],
    [{ ...input, instructionCardPacks: '2' }],
    [{ ...input, roleCards: -1 }],
    [{ ...input, roleCards: 41 }],
    [{ ...input, unknown: true }],
    [{ ...input, section: 'learner-support' }],
    [{ ...input, supportInstructions: 'unauthorised' }],
  ])('rejects invalid or unauthorised input atomically: %o', (invalid) => {
    const { handler, getDraft, original } = harness()
    expect(handler(invalid, { signal: signal() })).toMatchObject({ ok: false, error: { code: 'invalid-input' }, stateChanged: false })
    expect(getDraft()).toEqual(original)
  })

  it('returns a clearly derived grouping suggestion without mutating accepted grouping', () => {
    const { handler, getDraft, original } = harness()
    const result = handler({ ...input, robots: 0, tileSets: 0, activityMats: 0, instructionCardPacks: 0, allowTileOnlyGroups: false }, { signal: signal() })
    expect(result).toMatchObject({ ok: true, suggestedGrouping: { simultaneousCapacity: 0 }, resourceWarnings: [expect.stringContaining('Blocking:')] })
    expect(getDraft().groupingPlan).toEqual(original.groupingPlan)
  })

  it('preserves populated unrelated content and history while clearing stale validation and approval', () => {
    let enriched: LessonDraft = {
      ...createGoldenPathDraft('2026-08-29T09:00:00.000Z'), title: lostStoryPathMission.title, mission: { ...lostStoryPathMission },
      adaptations: { supports: ['visual-instructions'], extensions: ['loop-challenge'], supportInstructions: 'Use pictures.', extensionInstructions: 'Add a loop.', sectionsToUpdate: [], noAdditionalAdaptation: false },
    }
    const historical = createPendingChangeSet(enriched, 'build_tangible_mission', [{ section: 'mission-story', before: getSectionValue(enriched, 'mission-story'), proposed: 'Historical proposal.' }], { changeSetId: 'history', operationIds: ['history-op'], createdAt: '2026-08-29T09:01:00.000Z' })
    enriched = resolveOperation(receiveChangeSet(enriched, historical, '2026-08-29T09:02:00.000Z'), 'history', 'history-op', 'reject', '2026-08-29T09:03:00.000Z')
    enriched = { ...enriched, status: 'approved', approvedAt: '2026-08-29T09:05:00.000Z', validation: { readiness: 'ready', score: 1, checks: [{ id: 'VAL-01', severity: 'pass', message: 'Passed.', section: 'class-context', suggestedFix: '' }], acknowledgedWarningIds: [], preparedOutputs: [] } }
    const { handler, getDraft, original } = harness(enriched)
    expect(handler({ ...input, roleCards: 9 }, { signal: signal() })).toMatchObject({ ok: true })
    const draft = getDraft()
    expect(draft.classContext).toEqual(original.classContext)
    expect(draft.resources).toEqual(original.resources)
    expect(draft.groupingPlan).toEqual(original.groupingPlan)
    expect(draft.mission).toEqual(original.mission)
    expect(draft.adaptations).toEqual(original.adaptations)
    expect(draft.changeHistory).toEqual(original.changeHistory)
    expect(draft.validation).toEqual({ readiness: 'blocked', score: 0, checks: [], acknowledgedWarningIds: [], preparedOutputs: [] })
    expect(draft.status).toBe('needs-review')
    expect(draft.approvedAt).toBeUndefined()
  })

  it('checks cancellation before construction and immediately before receipt', () => {
    const before = harness()
    const aborted = new AbortController(); aborted.abort()
    expect(before.handler(input, { signal: aborted.signal })).toMatchObject({ ok: false, error: { code: 'aborted' }, stateChanged: false })
    expect(before.getDraft()).toEqual(before.original)

    const controller = new AbortController()
    let draft = createGoldenPathDraft('2026-08-29T10:00:00.000Z')
    const original = structuredClone(draft)
    let ids = 0
    const commands = createLessonCommandBoundary(draft, (next) => { draft = next })
    const handler = createSelectTangibleResourcesHandler({ getDraft: commands.getDraft, receiveChangeSet: commands.receiveChangeSet, createId: () => { ids += 1; if (ids === 2) controller.abort(); return `abort-${ids}` }, now: () => '2026-08-29T10:01:00.000Z' })
    expect(handler(input, { signal: controller.signal })).toMatchObject({ ok: false, error: { code: 'aborted' }, stateChanged: false })
    expect(draft).toEqual(original)
  })

  it('returns prerequisite and stale receipt failures with zero proposal mutation', () => {
    const malformed = { ...createCleanDraft(), classContext: { ...createCleanDraft().classContext, classSize: 0 } } as LessonDraft
    const handler = createSelectTangibleResourcesHandler({ getDraft: () => malformed, receiveChangeSet: () => { throw new Error('must not receive') }, createId: () => 'unused', now: () => new Date().toISOString() })
    expect(handler(input, { signal: signal() })).toMatchObject({ ok: false, error: { code: 'prerequisite-failed' }, stateChanged: false })

    const current = harness()
    const stale = createSelectTangibleResourcesHandler({
      getDraft: current.commands.getDraft,
      receiveChangeSet: (set) => {
        current.commands.dispatch({ type: 'update-resources', payload: { ...current.commands.getDraft().resources, robots: 1 } })
        return current.commands.receiveChangeSet(set)
      },
      createId: (() => { let id = 0; return () => `stale-${++id}` })(), now: () => '2026-08-29T10:01:00.000Z',
    })
    expect(stale(input, { signal: signal() })).toMatchObject({ ok: false, error: { code: 'stale-state' }, stateChanged: false })
    expect(current.commands.getDraft().pendingChanges).toEqual([])
  })

  it('reports reducer rejection as a structured failure without claiming a state change', () => {
    const draft = createGoldenPathDraft()
    const handler = createSelectTangibleResourcesHandler({
      getDraft: () => draft,
      receiveChangeSet: () => ({ ok: false, code: 'invalid-proposal', message: 'The proposal could not be recorded because it was invalid.' }),
      createId: (() => { let id = 0; return () => `rejected-${++id}` })(),
      now: () => '2026-08-29T10:01:00.000Z',
    })
    expect(handler(input, { signal: signal() })).toEqual({ ok: false, error: { code: 'invalid-proposal', message: 'The proposal could not be recorded because it was invalid.' }, stateChanged: false })
    expect(draft.pendingChanges).toEqual([])
  })

  it('reads the latest state, confirms production receipt synchronously and creates unique concurrent identities', async () => {
    const initial = createGoldenPathDraft('2026-08-29T10:00:00.000Z')
    let published = 0
    const commands = createLessonCommandBoundary(initial, () => { published += 1 })
    commands.dispatch({ type: 'update-resources', payload: { ...goldenPathResources, roleCards: 17 } })
    const production = createProductionWebMcpHandlers(commands).select_tangible_resources
    const first = production?.(input, { signal: signal() }) as { ok: boolean; proposedInventory: ResourceInventory }
    expect(first).toMatchObject({ ok: true, proposedInventory: { roleCards: 17 } })
    expect(published).toBe(2)
    const results = await Promise.all([
      Promise.resolve().then(() => production?.({ ...input, robots: 4 }, { signal: signal() })),
      Promise.resolve().then(() => production?.({ ...input, robots: 5 }, { signal: signal() })),
    ])
    const identities = results.map((result) => {
      const candidate = result as { changeSetId?: unknown; operationId?: unknown }
      return typeof candidate.changeSetId === 'string' && typeof candidate.operationId === 'string'
        ? [candidate.changeSetId, candidate.operationId]
        : []
    })
    expect(new Set(identities.flat()).size).toBe(4)
    expect(commands.getDraft().resources.roleCards).toBe(17)
    expect(commands.getDraft().pendingChanges).toHaveLength(3)
  })

  it('propagates unexpected receipt faults', () => {
    const draft = createGoldenPathDraft()
    const handler = createSelectTangibleResourcesHandler({ getDraft: () => draft, receiveChangeSet: () => { throw new Error('unexpected publication fault') }, createId: () => crypto.randomUUID(), now: () => new Date().toISOString() })
    expect(() => handler(input, { signal: signal() })).toThrow('unexpected publication fault')
  })
})
