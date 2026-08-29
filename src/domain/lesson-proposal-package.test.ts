import { describe, expect, it } from 'vitest'
import { createGoldenPathDraft, lostStoryPathMission } from './lesson-factories'
import { createPendingChangeSet, receiveChangeSet, resolveOperation } from './lesson-change-control'
import { createLessonCommandBoundary, persistLessonDraft, restoreLessonDraft } from '../state/lesson-state'
import { createProposalPackage, importProposalPackage, MAX_PROPOSAL_PACKAGE_CHARACTERS, proposalPackageSchema } from './lesson-proposal-package'
import { createSetClassContextHandler } from '../webmcp/set-class-context'

const now = '2026-08-29T12:00:00.000Z'
const baseDraft = () => ({ ...createGoldenPathDraft(now), mission: { ...lostStoryPathMission } })
const storage = () => {
  let value: string | null = null
  return { getItem: () => value, setItem: (_key: string, next: string) => { value = next } }
}

function packagedClassProposal() {
  const draft = baseDraft()
  const set = createPendingChangeSet(draft, 'set_class_context', [{ section: 'class-context', before: draft.classContext, proposed: { ...draft.classContext, classSize: 20 } }], { changeSetId: 'portable-set', operationIds: ['portable-operation'], createdAt: now })
  return { draft, package: createProposalPackage(set) }
}

function populatedDraft() {
  const draft = baseDraft()
  const historical = createPendingChangeSet(draft, 'build_tangible_mission', [{ section: 'mission-story', before: draft.mission.missionStory, proposed: 'Historical proposed story.' }], { changeSetId: 'historical-set', operationIds: ['historical-operation'], createdAt: '2026-08-29T10:00:00.000Z' })
  const received = receiveChangeSet(draft, historical, '2026-08-29T10:01:00.000Z')
  const resolved = resolveOperation(received, 'historical-set', 'historical-operation', 'reject', '2026-08-29T10:02:00.000Z')
  return {
    ...resolved,
    status: 'approved' as const,
    approvedAt: '2026-08-29T10:03:00.000Z',
    validation: { readiness: 'ready' as const, score: 13, checks: [{ id: 'VAL-01', severity: 'pass' as const, message: 'Populated validation.', section: 'class-context', suggestedFix: '' }], preparedOutputs: [] as [], acknowledgedWarningIds: ['VAL-10'] },
    activityLog: [...resolved.activityLog, { id: 'populated-activity', source: 'teacher' as const, message: 'Existing teacher activity.', createdAt: '2026-08-29T10:03:00.000Z' }],
  }
}

function expectRejectedWithoutMutation(serialized: string, code: string, draft = populatedDraft()) {
  const snapshot = structuredClone(draft)
  const commands = createLessonCommandBoundary(draft, () => undefined)
  expect(importProposalPackage(serialized, commands.getDraft(), commands.receiveChangeSet)).toMatchObject({ ok: false, code })
  expect(commands.getDraft()).toEqual(snapshot)
}

describe('portable proposal packages', () => {
  it('uses a strict versioned pending-only format with structural revision evidence', () => {
    const { package: portable } = packagedClassProposal()
    expect(portable).toEqual({
      format: 'tangible-coding-agent-proposal', schemaVersion: 1, sourceTool: 'set_class_context', changeSetId: 'portable-set', createdAt: now,
      operations: [{ operationId: 'portable-operation', section: 'class-context', before: baseDraft().classContext, proposed: { ...baseDraft().classContext, classSize: 20 } }],
    })
    expect(JSON.stringify(portable)).not.toMatch(/approvedAt|preparedOutputs|validation|acceptedValue|lessonDraft/)
  })

  it('imports one proposal through the synchronous boundary without changing accepted content', () => {
    const { draft, package: portable } = packagedClassProposal()
    const commands = createLessonCommandBoundary(draft, () => undefined)
    const result = importProposalPackage(JSON.stringify(portable), commands.getDraft(), commands.receiveChangeSet)
    expect(result).toMatchObject({ ok: true, changeSetId: 'portable-set', operationCount: 1 })
    expect(commands.getDraft().pendingChanges).toHaveLength(1)
    expect(commands.getDraft().classContext).toEqual(draft.classContext)
    expect(commands.getDraft().status).toBe('needs-review')
    expect(commands.getDraft().approvedAt).toBeUndefined()
    expect(commands.getDraft().validation.preparedOutputs).toEqual([])
  })

  it('moves a proposal between two isolated browser storage contexts', () => {
    const agentStorage = storage()
    const teacherStorage = storage()
    const agentCommands = createLessonCommandBoundary(baseDraft(), (draft) => persistLessonDraft(agentStorage, draft))
    let id = 0
    const handler = createSetClassContextHandler({ getDraft: agentCommands.getDraft, receiveChangeSet: agentCommands.receiveChangeSet, createId: () => `isolated-${++id}`, now: () => now })
    const result = handler({ ...agentCommands.getDraft().classContext, classSize: 18 })
    if (!result.ok) throw new Error('Expected proposal creation')
    const teacherCommands = createLessonCommandBoundary(baseDraft(), (draft) => persistLessonDraft(teacherStorage, draft))
    expect(restoreLessonDraft(teacherStorage).pendingChanges).toEqual([])
    expect(importProposalPackage(JSON.stringify(result.proposalPackage), teacherCommands.getDraft(), teacherCommands.receiveChangeSet).ok).toBe(true)
    const restoredTeacher = restoreLessonDraft(teacherStorage)
    expect(restoredTeacher.pendingChanges).toHaveLength(1)
    expect(restoredTeacher.classContext.classSize).toBe(24)
    expect(restoreLessonDraft(agentStorage).pendingChanges).toHaveLength(1)
  })

  it.each([
    ['malformed JSON', '{', 'malformed-json'],
    ['wrong version', JSON.stringify({ ...packagedClassProposal().package, schemaVersion: 2 }), 'wrong-version'],
    ['unknown root field', JSON.stringify({ ...packagedClassProposal().package, surprise: true }), 'unknown-field'],
    ['unknown operation field', JSON.stringify({ ...packagedClassProposal().package, operations: [{ ...packagedClassProposal().package.operations[0], status: 'pending' }] }), 'forbidden-content'],
    ['invalid section value', JSON.stringify({ ...packagedClassProposal().package, operations: [{ ...packagedClassProposal().package.operations[0], proposed: { ...baseDraft().classContext, classSize: 999 } }] }), 'invalid-package'],
    ['forbidden approval', JSON.stringify({ ...packagedClassProposal().package, approvedAt: now }), 'forbidden-content'],
    ['forbidden resolution', JSON.stringify({ ...packagedClassProposal().package, resolution: { outcome: 'accepted' } }), 'forbidden-content'],
    ['forbidden validation', JSON.stringify({ ...packagedClassProposal().package, validation: { readiness: 'ready' } }), 'forbidden-content'],
    ['forbidden outputs', JSON.stringify({ ...packagedClassProposal().package, preparedOutputs: [] }), 'forbidden-content'],
    ['forbidden accepted value', JSON.stringify({ ...packagedClassProposal().package, operations: [{ ...packagedClassProposal().package.operations[0], acceptedValue: baseDraft().classContext }] }), 'forbidden-content'],
    ['forbidden complete draft', JSON.stringify({ ...packagedClassProposal().package, lessonDraft: baseDraft() }), 'forbidden-content'],
    ['unauthorized tool', JSON.stringify({ ...packagedClassProposal().package, sourceTool: 'validate_and_prepare_lesson' }), 'unauthorized-section'],
    ['unauthorized section', JSON.stringify({ ...packagedClassProposal().package, operations: [{ ...packagedClassProposal().package.operations[0], section: 'mission-story', before: '', proposed: 'story' }] }), 'unauthorized-section'],
  ])('rejects %s safely', (_label, serialized, code) => {
    expectRejectedWithoutMutation(serialized, code)
  })

  it('rejects excessive size before parsing', () => {
    expectRejectedWithoutMutation('x'.repeat(MAX_PROPOSAL_PACKAGE_CHARACTERS + 1), 'excessive-size')
  })

  it('rejects stale before values, ID collisions and re-imports without partial mutation', () => {
    const { package: portable } = packagedClassProposal()
    const stale = { ...portable, operations: [{ ...portable.operations[0], before: { ...portable.operations[0].before as object, classSize: 12 } }] }
    expectRejectedWithoutMutation(JSON.stringify(stale), 'stale-state')
    const draft = populatedDraft()
    const commands = createLessonCommandBoundary(draft, () => undefined)
    expect(importProposalPackage(JSON.stringify(portable), commands.getDraft(), commands.receiveChangeSet).ok).toBe(true)
    const afterFirstImport = structuredClone(commands.getDraft())
    expect(importProposalPackage(JSON.stringify(portable), commands.getDraft(), commands.receiveChangeSet)).toMatchObject({ ok: false, code: 'duplicate-id' })
    expect(commands.getDraft()).toEqual(afterFirstImport)
  })

  it('rejects duplicate operations and strictly rejects extra section-value fields', () => {
    const { package: portable } = packagedClassProposal()
    const duplicateSections = { ...portable, operations: [portable.operations[0], { ...portable.operations[0], operationId: 'second-operation' }] }
    expect(proposalPackageSchema.safeParse(duplicateSections).success).toBe(false)
    expectRejectedWithoutMutation(JSON.stringify(duplicateSections), 'duplicate-id')
    const duplicateIdentity = { ...portable, operations: [{ ...portable.operations[0], operationId: portable.changeSetId }] }
    expect(proposalPackageSchema.safeParse(duplicateIdentity).success).toBe(false)
    expectRejectedWithoutMutation(JSON.stringify(duplicateIdentity), 'duplicate-id')
    const unknownValueField = { ...portable, operations: [{ ...portable.operations[0], proposed: { ...portable.operations[0].proposed as object, unauthorized: true } }] }
    expect(proposalPackageSchema.safeParse(unknownValueField).success).toBe(false)
    expectRejectedWithoutMutation(JSON.stringify(unknownValueField), 'unknown-field')
  })

  it.each(['__proto__', 'constructor', 'prototype'])('rejects hostile %s keys without changing object prototypes', (key) => {
    for (const level of ['root', 'operation', 'proposed'] as const) {
      const portable = structuredClone(packagedClassProposal().package) as Record<string, unknown>
      const operations = portable.operations as Array<Record<string, unknown>>
      const target = level === 'root' ? portable : level === 'operation' ? operations[0] : operations[0].proposed as Record<string, unknown>
      Object.defineProperty(target, key, { configurable: true, enumerable: true, value: { polluted: true } })
      expectRejectedWithoutMutation(JSON.stringify(portable), 'unknown-field')
    }
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined()
    expect(Object.prototype).not.toHaveProperty('polluted')
  })
})
