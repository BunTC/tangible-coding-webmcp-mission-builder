import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import type { LessonDraft } from '../domain/lesson-schemas'
import { lessonReducer, persistLessonDraft, restoreLessonDraft, type LessonAction } from './lesson-state'

interface LessonStoreValue {
  draft: LessonDraft
  dispatch: React.Dispatch<LessonAction>
}

const LessonStoreContext = createContext<LessonStoreValue | null>(null)

export function LessonStoreProvider({ children }: { children: ReactNode }) {
  const [draft, dispatch] = useReducer(lessonReducer, undefined, () => restoreLessonDraft(window.localStorage))
  useEffect(() => { persistLessonDraft(window.localStorage, draft) }, [draft])
  return <LessonStoreContext.Provider value={{ draft, dispatch }}>{children}</LessonStoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLessonStore() {
  const store = useContext(LessonStoreContext)
  if (!store) throw new Error('useLessonStore must be used inside LessonStoreProvider')
  return store
}
