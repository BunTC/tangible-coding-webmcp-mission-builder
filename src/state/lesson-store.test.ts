import { describe, expect, it } from 'vitest'
import { createCleanDraft, createGoldenPathDraft, lostStoryPathMission } from '../domain/lesson-factories'
import type { LessonDraft } from '../domain/lesson-schemas'
import { LESSON_STORAGE_KEY, lessonReducer, persistLessonDraft, restoreLessonDraft } from './lesson-state'
import { createPendingChangeSet, getSectionAttribution, getSectionValue } from '../domain/lesson-change-control'

function memoryStorage(initial?: string) {
  let value = initial ?? null
  return {
    getItem: (key: string) => key === LESSON_STORAGE_KEY ? value : null,
    setItem: (key: string, next: string) => { if (key === LESSON_STORAGE_KEY) value = next },
  }
}

describe('lesson persistence', () => {
  it('restores a valid persisted lesson', () => {
    const storage = memoryStorage()
    const draft = createGoldenPathDraft('2026-08-28T10:00:00.000Z')
    expect(persistLessonDraft(storage, draft)).toBe(true)
    expect(restoreLessonDraft(storage)).toEqual(draft)
  })

  it('falls back safely when persisted data is invalid', () => {
    const restored = restoreLessonDraft(memoryStorage('{"classContext":{"stage":"S1"}}'))
    expect(restored.title).toBe('Untitled mission')
    expect(restored.resources.robots).toBe(0)
    expect(restored.status).toBe('draft')
  })

  it('restores a persisted draft created before the decline field existed', () => {
    const draft = createGoldenPathDraft('2026-08-28T10:00:00.000Z')
    const serialized = JSON.parse(JSON.stringify(draft))
    delete serialized.adaptations.noAdditionalAdaptation
    const restored = restoreLessonDraft(memoryStorage(JSON.stringify(serialized)))
    expect(restored.adaptations.noAdditionalAdaptation).toBe(false)
  })

  it('migrates a legacy draft without changeHistory while preserving lesson content', () => {
    const draft = { ...createGoldenPathDraft('2026-08-28T10:00:00.000Z'), mission: { ...lostStoryPathMission } }
    const serialized = JSON.parse(JSON.stringify(draft))
    delete serialized.changeHistory
    const restored = restoreLessonDraft(memoryStorage(JSON.stringify(serialized)))
    expect(restored.mission).toEqual(draft.mission)
    expect(restored.changeHistory).toEqual([])
  })

  it('migrates a valid pre-Step-7 draft with neither proposal collection', () => {
    const draft = { ...createGoldenPathDraft('2026-08-28T10:00:00.000Z'), mission: { ...lostStoryPathMission } }
    const serialized = JSON.parse(JSON.stringify(draft))
    delete serialized.pendingChanges
    delete serialized.changeHistory
    const restored = restoreLessonDraft(memoryStorage(JSON.stringify(serialized)))
    expect(restored.classContext).toEqual(draft.classContext)
    expect(restored.resources).toEqual(draft.resources)
    expect(restored.groupingPlan).toEqual(draft.groupingPlan)
    expect(restored.mission).toEqual(draft.mission)
    expect(restored.adaptations).toEqual(draft.adaptations)
    expect(restored.validation).toEqual(draft.validation)
    expect(restored.pendingChanges).toEqual([])
    expect(restored.changeHistory).toEqual([])
    expect(restored.validation.preparedOutputs).toEqual([])
    expect(restored.approvedAt).toBeUndefined()
  })

  it('migrates a draft with only the pending-proposal collection missing', () => {
    const draft = createGoldenPathDraft('2026-08-28T10:00:00.000Z')
    const serialized = JSON.parse(JSON.stringify(draft))
    delete serialized.pendingChanges
    expect(restoreLessonDraft(memoryStorage(JSON.stringify(serialized)))).toMatchObject({ pendingChanges: [], changeHistory: [] })
  })

  it('discards only malformed legacy proposal data and clears stale readiness', () => {
    const draft = { ...createGoldenPathDraft('2026-08-28T10:00:00.000Z'), mission: { ...lostStoryPathMission }, status: 'ready', pendingChanges: [{ old: 'shape' }], changeHistory: [{ malformed: true }] }
    const restored = restoreLessonDraft(memoryStorage(JSON.stringify(draft)))
    expect(restored.mission).toEqual(lostStoryPathMission)
    expect(restored.pendingChanges).toEqual([])
    expect(restored.changeHistory).toEqual([])
    expect(restored.status).toBe('draft')
    expect(restored.validation.checks).toEqual([])
  })

  it('preserves valid records when mixed with malformed pending and history records', () => {
    const draft = { ...createGoldenPathDraft('2026-08-28T10:00:00.000Z'), mission: { ...lostStoryPathMission } }
    const pending = createPendingChangeSet(draft, 'build_tangible_mission', [{ section: 'learning-intention', before: draft.mission.learningIntention, proposed: 'Valid pending intention.' }], { changeSetId: 'valid-pending', operationIds: ['valid-pending-operation'], createdAt: '2026-08-28T12:00:00.000Z' })
    const received = lessonReducer(draft, { type: 'receive-change-set', payload: pending })
    const resolvedBase = lessonReducer(received, { type: 'resolve-change-operation', payload: { changeSetId: 'valid-pending', operationId: 'valid-pending-operation', decision: 'reject' } }).changeHistory[0]
    const resolved = { ...resolvedBase, changeSetId: 'valid-history', operations: [{ ...resolvedBase.operations[0], operationId: 'valid-history-operation' }] }
    const raw = { ...draft, status: 'ready', pendingChanges: [pending, { changeSetId: 'bad', toolName: 'approve_lesson' }], changeHistory: [resolved, { malformed: true }] }
    const restored = restoreLessonDraft(memoryStorage(JSON.stringify(raw)))
    expect(restored.pendingChanges.map(({ changeSetId }) => changeSetId)).toEqual(['valid-pending'])
    expect(restored.changeHistory.map(({ changeSetId }) => changeSetId)).toEqual(['valid-history'])
    expect(restored.status).toBe('needs-review')
    expect(restored.validation.checks).toEqual([])
    expect(restored.mission).toEqual(draft.mission)
    expect(restored.validation.preparedOutputs).toEqual([])
    expect(restored.approvedAt).toBeUndefined()
  })

  it('discards unauthorized or wrongly placed proposal records without losing lesson content', () => {
    const draft = { ...createGoldenPathDraft('2026-08-28T10:00:00.000Z'), mission: { ...lostStoryPathMission } }
    const pending = createPendingChangeSet(draft, 'build_tangible_mission', [{ section: 'mission-story', before: draft.mission.missionStory, proposed: 'Pending story.' }], { changeSetId: 'placement-set', operationIds: ['placement-operation'], createdAt: '2026-08-28T12:00:00.000Z' })
    const unauthorized = { ...pending, toolName: 'set_class_context' }
    const resolved = lessonReducer(lessonReducer(draft, { type: 'receive-change-set', payload: pending }), { type: 'resolve-change-operation', payload: { changeSetId: 'placement-set', operationId: 'placement-operation', decision: 'reject' } }).changeHistory[0]
    for (const raw of [
      { ...draft, pendingChanges: [unauthorized] },
      { ...draft, pendingChanges: [resolved] },
      { ...draft, changeHistory: [pending] },
    ]) {
      const restored = restoreLessonDraft(memoryStorage(JSON.stringify(raw)))
      expect(restored.mission).toEqual(draft.mission)
      expect(restored.pendingChanges).toEqual([])
      expect(restored.changeHistory).toEqual([])
      expect(restored.validation.preparedOutputs).toEqual([])
      expect(restored.approvedAt).toBeUndefined()
    }
  })

  it('normalizes resolved history to the newest twenty records and clears prepared outputs', () => {
    let draft = { ...createGoldenPathDraft('2026-08-28T10:00:00.000Z'), mission: { ...lostStoryPathMission } }
    for (let index = 0; index < 21; index += 1) {
      const set = createPendingChangeSet(draft, 'build_tangible_mission', [{ section: 'learning-intention', before: draft.mission.learningIntention, proposed: `History ${index}` }], { changeSetId: `migration-${index}`, operationIds: [`migration-operation-${index}`], createdAt: `2026-08-28T12:${String(index).padStart(2, '0')}:00.000Z` })
      draft = lessonReducer(lessonReducer(draft, { type: 'receive-change-set', payload: set }), { type: 'resolve-change-operation', payload: { changeSetId: `migration-${index}`, operationId: `migration-operation-${index}`, decision: 'accept' } })
    }
    const raw = { ...draft, changeHistory: [{ ...draft.changeHistory[0], changeSetId: 'oldest-extra', operations: [{ ...draft.changeHistory[0].operations[0], operationId: 'oldest-extra-operation' }] }, ...draft.changeHistory], validation: { ...draft.validation, preparedOutputs: ['teacher-guide'] }, status: 'ready' }
    const restored = restoreLessonDraft(memoryStorage(JSON.stringify(raw)))
    expect(restored.changeHistory).toHaveLength(20)
    expect(restored.changeHistory[0].changeSetId).not.toBe('oldest-extra')
    expect(restored.validation.preparedOutputs).toEqual([])
    expect(restored.status).toBe('draft')
    expect(restored.approvedAt).toBeUndefined()
  })

  it('keeps migrated lesson state usable through a subsequent valid lifecycle and reload', () => {
    const draft = { ...createGoldenPathDraft('2026-08-28T10:00:00.000Z'), mission: { ...lostStoryPathMission } }
    const raw = { ...draft, pendingChanges: [{ malformed: true }] }
    const migrated = restoreLessonDraft(memoryStorage(JSON.stringify(raw)))
    const set = createPendingChangeSet(migrated, 'build_tangible_mission', [{ section: 'learning-intention', before: migrated.mission.learningIntention, proposed: 'Usable after migration.' }], { changeSetId: 'after-migration', operationIds: ['after-migration-operation'], createdAt: '2026-08-28T13:00:00.000Z' })
    const accepted = lessonReducer(lessonReducer(migrated, { type: 'receive-change-set', payload: set }), { type: 'resolve-change-operation', payload: { changeSetId: 'after-migration', operationId: 'after-migration-operation', decision: 'accept' } })
    const storage = memoryStorage()
    expect(persistLessonDraft(storage, accepted)).toBe(true)
    const reloaded = restoreLessonDraft(storage)
    expect(reloaded.mission.learningIntention).toBe('Usable after migration.')
    expect(reloaded.changeHistory[0].changeSetId).toBe('after-migration')
    expect(reloaded.validation.preparedOutputs).toEqual([])
    expect(reloaded.approvedAt).toBeUndefined()
  })

  it('persists unresolved proposals and resolved history with stable identities', () => {
    const draft = { ...createGoldenPathDraft('2026-08-28T10:00:00.000Z'), mission: { ...lostStoryPathMission } }
    const set = createPendingChangeSet(draft, 'build_tangible_mission', [{ section: 'learning-intention', before: getSectionValue(draft, 'learning-intention') as never, proposed: 'Proposed intention' }], { changeSetId: 'persisted-set', operationIds: ['persisted-operation'], createdAt: '2026-08-28T12:00:00.000Z' })
    const received = lessonReducer(draft, { type: 'receive-change-set', payload: set })
    const storage = memoryStorage()
    expect(persistLessonDraft(storage, received)).toBe(true)
    expect(restoreLessonDraft(storage).pendingChanges[0].changeSetId).toBe('persisted-set')
    const resolved = lessonReducer(received, { type: 'resolve-change-operation', payload: { changeSetId: 'persisted-set', operationId: 'persisted-operation', decision: 'accept' } })
    expect(persistLessonDraft(storage, resolved)).toBe(true)
    expect(restoreLessonDraft(storage).changeHistory[0].operations[0].operationId).toBe('persisted-operation')
  })
})

describe('Step 7 reducer integration', () => {
  function withProposal() {
    const draft = { ...createGoldenPathDraft('2026-08-28T10:00:00.000Z'), mission: { ...lostStoryPathMission } }
    const set = createPendingChangeSet(draft, 'build_tangible_mission', [{ section: 'mission-story', before: draft.mission.missionStory, proposed: 'Proposed replacement story.' }], { changeSetId: 'reducer-set', operationIds: ['reducer-operation'], createdAt: '2026-08-28T12:00:00.000Z' })
    return lessonReducer(draft, { type: 'receive-change-set', payload: set })
  }

  it('receives and accepts a proposal without automatic readiness, outputs or approval', () => {
    const received = withProposal()
    expect(received.status).toBe('needs-review')
    expect(received.mission.missionStory).toBe(lostStoryPathMission.missionStory)
    const accepted = lessonReducer(received, { type: 'resolve-change-operation', payload: { changeSetId: 'reducer-set', operationId: 'reducer-operation', decision: 'accept' } })
    expect(accepted.mission.missionStory).toBe('Proposed replacement story.')
    expect(accepted.status).toBe('draft')
    expect(accepted.validation.preparedOutputs).toEqual([])
    expect(accepted.approvedAt).toBeUndefined()
  })

  it('a teacher edit supersedes the overlapping proposal', () => {
    const received = withProposal()
    const edited = lessonReducer(received, { type: 'update-mission', payload: { ...received.mission, missionStory: 'Teacher replacement story.' } })
    expect(edited.mission.missionStory).toBe('Teacher replacement story.')
    expect(edited.pendingChanges).toEqual([])
    expect(edited.changeHistory[0].operations[0].status).toBe('superseded')
  })

  it('an unrelated teacher edit keeps the proposal reviewable and status needs-review', () => {
    const received = withProposal()
    const edited = lessonReducer(received, { type: 'update-class-context', payload: { ...received.classContext, goal: 'Unrelated teacher goal.' } })
    expect(edited.classContext.goal).toBe('Unrelated teacher goal.')
    expect(edited.pendingChanges[0].operations[0].status).toBe('pending')
    expect(edited.status).toBe('needs-review')
    expect(edited.validation.checks).toEqual([])
  })

  it.each([
    ['class context', 'set_class_context' as const, 'class-context' as const, (draft: LessonDraft) => draft.classContext, (draft: LessonDraft) => ({ ...draft.classContext, goal: 'Proposed goal' }), (draft: LessonDraft) => ({ type: 'update-class-context' as const, payload: { ...draft.classContext, goal: 'Teacher goal' } })],
    ['resources', 'select_tangible_resources' as const, 'tangible-resources' as const, (draft: LessonDraft) => draft.resources, (draft: LessonDraft) => ({ ...draft.resources, robots: 2 }), (draft: LessonDraft) => ({ type: 'update-resources' as const, payload: { ...draft.resources, robots: 1 } })],
    ['learner support', 'adapt_for_learners' as const, 'learner-support' as const, (draft: LessonDraft) => ({ supports: draft.adaptations.supports, supportInstructions: draft.adaptations.supportInstructions }), () => ({ supports: ['visual-instructions'], supportInstructions: 'Proposed pictures.' }), (draft: LessonDraft) => ({ type: 'update-adaptations' as const, payload: { ...draft.adaptations, supports: ['reduced-reading'] as LessonDraft['adaptations']['supports'], supportInstructions: 'Teacher support.' } })],
    ['extension challenge', 'adapt_for_learners' as const, 'extension-challenge' as const, (draft: LessonDraft) => ({ extensions: draft.adaptations.extensions, extensionInstructions: draft.adaptations.extensionInstructions }), () => ({ extensions: ['loop-challenge'], extensionInstructions: 'Proposed loop.' }), (draft: LessonDraft) => ({ type: 'update-adaptations' as const, payload: { ...draft.adaptations, extensions: ['longer-route'] as LessonDraft['adaptations']['extensions'], extensionInstructions: 'Teacher extension.' } })],
  ])('a teacher %s edit supersedes only its overlapping proposal', (_label, tool, section, before, proposed, action) => {
    const draft = { ...createGoldenPathDraft('2026-08-28T10:00:00.000Z'), mission: { ...lostStoryPathMission } }
    const set = createPendingChangeSet(draft, tool, [{ section, before: before(draft), proposed: proposed(draft) }], { changeSetId: `edit-${section}`, operationIds: [`operation-${section}`], createdAt: '2026-08-28T12:00:00.000Z' })
    const received = lessonReducer(draft, { type: 'receive-change-set', payload: set })
    const edited = lessonReducer(received, action(received))
    expect(edited.pendingChanges).toEqual([])
    expect(edited.changeHistory[0].operations[0].status).toBe('superseded')
    expect(edited.status).toBe('draft')
    expect(edited.validation.checks).toEqual([])
    expect(edited.validation.acknowledgedWarningIds).toEqual([])
    expect(edited.validation.preparedOutputs).toEqual([])
    expect(edited.approvedAt).toBeUndefined()
  })

  it('reuses Manual Step 6 validation after proposal resolution', () => {
    const accepted = lessonReducer(withProposal(), { type: 'resolve-change-operation', payload: { changeSetId: 'reducer-set', operationId: 'reducer-operation', decision: 'accept' } })
    const validated = lessonReducer(accepted, { type: 'run-validation' })
    expect(validated.validation.checks.map(({ id }) => id)).toEqual(['VAL-01', 'VAL-02', 'VAL-03', 'VAL-04', 'VAL-05', 'VAL-06', 'VAL-07', 'VAL-08', 'VAL-09', 'VAL-10', 'VAL-11', 'VAL-12', 'VAL-13'])
    expect(validated.validation.preparedOutputs).toEqual([])
    expect(validated.approvedAt).toBeUndefined()
  })

  it('retains accepted proposal history while attributing a later section edit to the teacher across reload', () => {
    const received = withProposal()
    const accepted = lessonReducer(received, { type: 'resolve-change-operation', payload: { changeSetId: 'reducer-set', operationId: 'reducer-operation', decision: 'accept' } })
    const historicalRecord = JSON.stringify(accepted.changeHistory[0])
    const teacherEdited = lessonReducer(accepted, { type: 'update-mission', payload: { ...accepted.mission, missionStory: 'Teacher-edited current story.' } })
    expect(teacherEdited.mission.missionStory).toBe('Teacher-edited current story.')
    expect(JSON.stringify(teacherEdited.changeHistory[0])).toBe(historicalRecord)
    expect(getSectionAttribution(teacherEdited, 'mission-story')).toMatchObject({
      changeSetId: 'reducer-set', operationId: 'reducer-operation', toolName: 'build_tangible_mission',
      currentSource: 'teacher-edited', historicalProposedValue: 'Proposed replacement story.', currentValue: 'Teacher-edited current story.',
    })
    const storage = memoryStorage()
    expect(persistLessonDraft(storage, teacherEdited)).toBe(true)
    const reloaded = restoreLessonDraft(storage)
    expect(reloaded.mission.missionStory).toBe('Teacher-edited current story.')
    expect(JSON.stringify(reloaded.changeHistory[0])).toBe(historicalRecord)
    expect(getSectionAttribution(reloaded, 'mission-story')?.currentSource).toBe('teacher-edited')
    expect(reloaded.approvedAt).toBeUndefined()
  })

  it.each(['reset-demo', 'load-demo', 'load-sample-mission', 'clear-mission'] as const)('%s clears pending and resolved proposal state', (type) => {
    const received = withProposal()
    const withHistory = { ...received, changeHistory: [{ ...received.pendingChanges[0], operations: [{ ...received.pendingChanges[0].operations[0], status: 'rejected' as const, resolution: { outcome: 'rejected' as const, decidedAt: '2026-08-28T12:05:00.000Z', teacherModified: false } }], resolvedAt: '2026-08-28T12:05:00.000Z' }] }
    const result = lessonReducer(withHistory, { type })
    expect(result.pendingChanges).toEqual([])
    expect(result.changeHistory).toEqual([])
    expect(result.validation.preparedOutputs).toEqual([])
    expect(result.approvedAt).toBeUndefined()
  })
})

describe('manual adaptation state conflicts', () => {
  it('clears conflicting content for an explicit decline and never populates sectionsToUpdate', () => {
    const draft = createGoldenPathDraft('2026-08-28T10:00:00.000Z')
    const adapted = lessonReducer(draft, {
      type: 'update-adaptations',
      payload: {
        supports: ['reduced-reading'], extensions: ['loop-challenge'],
        supportInstructions: 'Use symbols.', extensionInstructions: 'Add a loop.',
        sectionsToUpdate: ['testAndDebug'], noAdditionalAdaptation: true,
      },
    })

    expect(adapted.adaptations).toEqual({
      supports: [], extensions: [], supportInstructions: '', extensionInstructions: '',
      sectionsToUpdate: [], noAdditionalAdaptation: true,
    })
  })

  it('does not change mission, resources or grouping for a manual adaptation update', () => {
    const draft = { ...createGoldenPathDraft('2026-08-28T10:00:00.000Z'), mission: lostStoryPathMission }
    const adapted = lessonReducer(draft, {
      type: 'update-adaptations',
      payload: {
        supports: ['visual-instructions'], extensions: [], supportInstructions: 'Use a visual sequence.',
        extensionInstructions: '', sectionsToUpdate: ['plan'], noAdditionalAdaptation: false,
      },
    })

    expect(adapted.mission).toEqual(draft.mission)
    expect(adapted.resources).toEqual(draft.resources)
    expect(adapted.groupingPlan).toEqual(draft.groupingPlan)
    expect(adapted.adaptations.sectionsToUpdate).toEqual([])
  })
})

describe('manual validation state transitions', () => {
  function validationReadyDraft(): LessonDraft {
    const draft = createGoldenPathDraft('2026-08-28T10:00:00.000Z')
    return {
      ...draft,
      title: lostStoryPathMission.title,
      mission: { ...lostStoryPathMission },
      adaptations: {
        supports: ['reduced-reading'], extensions: ['loop-challenge'],
        supportInstructions: 'Prepare short visual prompts.', extensionInstructions: 'Add a loop challenge.',
        sectionsToUpdate: [], noAdditionalAdaptation: false,
      },
    }
  }

  function readyDraftWithAcknowledgedWarnings(): LessonDraft {
    const draft = validationReadyDraft()
    const warningDraft: LessonDraft = {
      ...draft,
      classContext: { ...draft.classContext, teacherConfidence: 'beginner' },
      adaptations: {
        supports: [], extensions: [], supportInstructions: '', extensionInstructions: '',
        sectionsToUpdate: [], noAdditionalAdaptation: false,
      },
    }
    const checked = lessonReducer(warningDraft, { type: 'run-validation' })
    const firstAcknowledgement = lessonReducer(checked, { type: 'acknowledge-warning', payload: 'VAL-10' })
    const ready = lessonReducer(firstAcknowledgement, { type: 'acknowledge-warning', payload: 'VAL-11' })
    expect(ready.status).toBe('ready')
    expect(ready.validation.acknowledgedWarningIds).toEqual(['VAL-10', 'VAL-11'])
    return ready
  }

  function expectClearedValidation(draft: LessonDraft) {
    expect(draft.status).toBe('draft')
    expect(draft.validation.checks).toEqual([])
    expect(draft.validation.acknowledgedWarningIds).toEqual([])
    expect(draft.validation.preparedOutputs).toEqual([])
    expect(draft.approvedAt).toBeUndefined()
  }

  it('moves a passing draft to ready without approval or prepared outputs', () => {
    const ready = lessonReducer(validationReadyDraft(), { type: 'run-validation' })
    expect(ready.status).toBe('ready')
    expect(ready.validation.readiness).toBe('ready')
    expect(ready.validation.preparedOutputs).toEqual([])
    expect(ready.approvedAt).toBeUndefined()
  })

  it('persists an individually acknowledged warning across reload', () => {
    const draft = validationReadyDraft()
    const warningDraft = { ...draft, classContext: { ...draft.classContext, teacherConfidence: 'beginner' as const }, adaptations: { ...draft.adaptations, supports: [], extensions: [], supportInstructions: '', extensionInstructions: '', noAdditionalAdaptation: false } }
    const checked = lessonReducer(warningDraft, { type: 'run-validation' })
    const acknowledged = lessonReducer(lessonReducer(checked, { type: 'acknowledge-warning', payload: 'VAL-10' }), { type: 'acknowledge-warning', payload: 'VAL-11' })
    const rerun = lessonReducer(acknowledged, { type: 'run-validation' })
    expect(rerun.validation.acknowledgedWarningIds).toEqual(['VAL-10', 'VAL-11'])
    const storage = memoryStorage()
    expect(persistLessonDraft(storage, rerun)).toBe(true)
    expect(restoreLessonDraft(storage).validation.acknowledgedWarningIds).toEqual(['VAL-10', 'VAL-11'])
    expect(restoreLessonDraft(storage).status).toBe('ready')
  })

  it.each([
    ['class context', { type: 'update-class-context' as const, payload: { ...createGoldenPathDraft().classContext, goal: 'Changed' } }],
    ['resources', { type: 'update-resources' as const, payload: { ...createGoldenPathDraft().resources, robots: 2 } }],
    ['mission', { type: 'update-mission' as const, payload: { ...lostStoryPathMission, title: 'Changed' } }],
    ['adaptations', { type: 'update-adaptations' as const, payload: { ...validationReadyDraft().adaptations, supportInstructions: 'Changed guidance.' } }],
  ])('a Steps 1–5 %s edit resets ready and stale validation', (_label, action) => {
    const ready = readyDraftWithAcknowledgedWarnings()
    expect(ready.status).toBe('ready')
    expect(ready.validation.acknowledgedWarningIds).toEqual(['VAL-10', 'VAL-11'])
    const edited = lessonReducer(ready, action)
    expect(edited.status).toBe('draft')
    expect(edited.validation.checks).toEqual([])
    expect(edited.validation.acknowledgedWarningIds).toEqual([])
    expect(edited.validation.preparedOutputs).toEqual([])
    expect(edited.approvedAt).toBeUndefined()

    if (_label === 'class context') {
      expect(edited.classContext.goal).toBe('Changed')
      expect(edited.resources).toEqual(ready.resources)
      expect(edited.groupingPlan).toEqual(ready.groupingPlan)
      expect(edited.mission).toEqual(ready.mission)
      expect(edited.adaptations).toEqual(ready.adaptations)
    } else if (_label === 'resources') {
      expect(edited.resources.robots).toBe(2)
      expect(edited.classContext).toEqual(ready.classContext)
      expect(edited.groupingPlan).toEqual(ready.groupingPlan)
      expect(edited.mission).toEqual(ready.mission)
      expect(edited.adaptations).toEqual(ready.adaptations)
    } else if (_label === 'mission') {
      expect(edited.mission.title).toBe('Changed')
      expect(edited.classContext).toEqual(ready.classContext)
      expect(edited.resources).toEqual(ready.resources)
      expect(edited.groupingPlan).toEqual(ready.groupingPlan)
      expect(edited.adaptations).toEqual(ready.adaptations)
    } else {
      expect(edited.adaptations.supportInstructions).toBe('Changed guidance.')
      expect(edited.classContext).toEqual(ready.classContext)
      expect(edited.resources).toEqual(ready.resources)
      expect(edited.groupingPlan).toEqual(ready.groupingPlan)
      expect(edited.mission).toEqual(ready.mission)
    }
  })

  it('reset-demo clears ready validation and returns the canonical clean draft', () => {
    const result = lessonReducer(readyDraftWithAcknowledgedWarnings(), { type: 'reset-demo' })
    const clean = createCleanDraft()
    expectClearedValidation(result)
    expect(result.classContext).toEqual(clean.classContext)
    expect(result.resources).toEqual(clean.resources)
    expect(result.groupingPlan).toEqual(clean.groupingPlan)
    expect(result.mission).toEqual(clean.mission)
    expect(result.adaptations).toEqual(clean.adaptations)
  })

  it('load-demo clears ready validation and loads context without mission content', () => {
    const result = lessonReducer(readyDraftWithAcknowledgedWarnings(), { type: 'load-demo' })
    const demo = createGoldenPathDraft()
    expectClearedValidation(result)
    expect(result.classContext).toEqual(demo.classContext)
    expect(result.resources).toEqual(demo.resources)
    expect(result.groupingPlan).toEqual(demo.groupingPlan)
    expect(result.mission).toEqual(demo.mission)
    expect(result.adaptations).toEqual(demo.adaptations)
  })

  it('load-sample-mission clears ready validation while preserving current context', () => {
    const before = readyDraftWithAcknowledgedWarnings()
    const result = lessonReducer(before, { type: 'load-sample-mission' })
    expectClearedValidation(result)
    expect(result.mission.title).toBe('The Lost Story Path')
    expect(result.classContext).toEqual(before.classContext)
    expect(result.resources).toEqual(before.resources)
    expect(result.groupingPlan).toEqual(before.groupingPlan)
    expect(result.mission).toEqual(lostStoryPathMission)
    expect(result.adaptations).toEqual(createCleanDraft().adaptations)
  })

  it('clear-mission clears ready validation and mission while preserving current context', () => {
    const before = readyDraftWithAcknowledgedWarnings()
    const result = lessonReducer(before, { type: 'clear-mission' })
    expectClearedValidation(result)
    expect(result.classContext).toEqual(before.classContext)
    expect(result.resources).toEqual(before.resources)
    expect(result.groupingPlan).toEqual(before.groupingPlan)
    expect(result.mission).toEqual(createCleanDraft().mission)
    expect(result.adaptations).toEqual(createCleanDraft().adaptations)
  })
})
