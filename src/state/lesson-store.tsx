import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { LessonDraft } from '../domain/lesson-schemas'
import { createLessonCommandBoundary, persistLessonDraft, restoreLessonDraft, type LessonAction, type ProposalReceiptResult } from './lesson-state'
import type { ChangeSet } from '../domain/lesson-schemas'

interface LessonStoreValue {
  draft: LessonDraft
  dispatch: React.Dispatch<LessonAction>
  getDraft(): LessonDraft
  receiveChangeSet(changeSet: ChangeSet): ProposalReceiptResult
}

const LessonStoreContext = createContext<LessonStoreValue | null>(null)

export function LessonStoreProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(() => restoreLessonDraft(window.localStorage))
  const [commands] = useState(() => createLessonCommandBoundary(draft, setDraft))
  useEffect(() => { persistLessonDraft(window.localStorage, draft) }, [draft])
  return <LessonStoreContext.Provider value={{ draft, dispatch: commands.dispatch, getDraft: commands.getDraft, receiveChangeSet: commands.receiveChangeSet }}>{children}</LessonStoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLessonStore() {
  const store = useContext(LessonStoreContext)
  if (!store) throw new Error('useLessonStore must be used inside LessonStoreProvider')
  return store
}
