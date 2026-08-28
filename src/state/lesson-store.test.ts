import { describe, expect, it } from 'vitest'
import { createGoldenPathDraft } from '../domain/lesson-factories'
import { LESSON_STORAGE_KEY, persistLessonDraft, restoreLessonDraft } from './lesson-state'

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
})
