import { describe, expect, it } from 'vitest'
import { createCleanDraft, createGoldenPathDraft, lostStoryPathMission } from '../domain/lesson-factories'
import type { LessonDraft } from '../domain/lesson-schemas'
import { LESSON_STORAGE_KEY, lessonReducer, persistLessonDraft, restoreLessonDraft } from './lesson-state'

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
