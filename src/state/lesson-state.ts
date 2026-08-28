import { calculateGrouping, createCleanDraft, createGoldenPathDraft, lostStoryPathMission } from '../domain/lesson-factories'
import {
  adaptationPlanSchema,
  classContextSchema,
  lessonDraftSchema,
  missionContentSchema,
  resourceInventorySchema,
  type AdaptationPlan,
  type ClassContext,
  type LessonDraft,
  type MissionContent,
  type ResourceInventory,
} from '../domain/lesson-schemas'

export const LESSON_STORAGE_KEY = 'tangible-coding-studio:mission-builder:draft:v1'

export type LessonAction =
  | { type: 'load-demo' }
  | { type: 'load-sample-mission' }
  | { type: 'update-class-context'; payload: ClassContext }
  | { type: 'update-resources'; payload: ResourceInventory }
  | { type: 'update-mission'; payload: MissionContent }
  | { type: 'update-adaptations'; payload: AdaptationPlan }
  | { type: 'clear-mission' }
  | { type: 'reset-demo' }

export function restoreLessonDraft(storage: Pick<Storage, 'getItem'>): LessonDraft {
  try {
    const stored = storage.getItem(LESSON_STORAGE_KEY)
    if (!stored) return createCleanDraft()
    const parsed = lessonDraftSchema.safeParse(JSON.parse(stored))
    return parsed.success
      ? { ...parsed.data, groupingPlan: calculateGrouping(parsed.data.classContext, parsed.data.resources) }
      : createCleanDraft()
  } catch {
    return createCleanDraft()
  }
}

export function persistLessonDraft(storage: Pick<Storage, 'setItem'>, draft: LessonDraft): boolean {
  try {
    storage.setItem(LESSON_STORAGE_KEY, JSON.stringify(lessonDraftSchema.parse(draft)))
    return true
  } catch {
    return false
  }
}

export function lessonReducer(state: LessonDraft, action: LessonAction): LessonDraft {
  const now = new Date().toISOString()
  if (action.type === 'load-demo') return createGoldenPathDraft(now)
  if (action.type === 'load-sample-mission') return {
    ...state,
    title: lostStoryPathMission.title,
    mission: { ...lostStoryPathMission, successCriteria: [...lostStoryPathMission.successCriteria], assessmentEvidence: [...lostStoryPathMission.assessmentEvidence] },
    adaptations: createCleanDraft(now).adaptations,
    status: 'draft',
    updatedAt: now,
  }
  if (action.type === 'reset-demo') return createCleanDraft(now)
  if (action.type === 'clear-mission') {
    const clean = createCleanDraft(now)
    return { ...state, title: 'Untitled mission', mission: clean.mission, adaptations: clean.adaptations, status: 'draft', updatedAt: now }
  }
  if (action.type === 'update-class-context') {
    const classContext = classContextSchema.parse(action.payload)
    return { ...state, classContext, groupingPlan: calculateGrouping(classContext, state.resources), updatedAt: now }
  }
  if (action.type === 'update-mission') {
    const mission = missionContentSchema.parse(action.payload)
    return { ...state, title: mission.title || 'Untitled mission', mission, status: 'draft', updatedAt: now }
  }
  if (action.type === 'update-adaptations') {
    const parsed = adaptationPlanSchema.parse(action.payload)
    const adaptations: AdaptationPlan = parsed.noAdditionalAdaptation
      ? { supports: [], extensions: [], supportInstructions: '', extensionInstructions: '', sectionsToUpdate: [], noAdditionalAdaptation: true }
      : { ...parsed, sectionsToUpdate: [], noAdditionalAdaptation: false }
    return { ...state, adaptations, status: 'draft', updatedAt: now }
  }
  const resources = resourceInventorySchema.parse(action.payload)
  return { ...state, resources, groupingPlan: calculateGrouping(state.classContext, resources), updatedAt: now }
}
