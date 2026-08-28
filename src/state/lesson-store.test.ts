import { describe, expect, it } from 'vitest'
import { createGoldenPathDraft, lostStoryPathMission } from '../domain/lesson-factories'
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
