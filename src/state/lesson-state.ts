import { calculateGrouping, createCleanDraft, createGoldenPathDraft, lostStoryPathMission } from '../domain/lesson-factories'
import { ZodError } from 'zod'
import {
  adaptationPlanSchema,
  classContextSchema,
  changeSetSchema,
  lessonDraftSchema,
  missionContentSchema,
  resourceInventorySchema,
  type AdaptationPlan,
  type ChangeSet,
  type ClassContext,
  type LessonDraft,
  type LessonSection,
  type MissionContent,
  type ResourceInventory,
} from '../domain/lesson-schemas'
import { validateLesson } from '../domain/lesson-validation'
import { getSectionValue, receiveChangeSet, resolveOperation, structurallyEqual, supersedeSections } from '../domain/lesson-change-control'

export const LESSON_STORAGE_KEY = 'tangible-coding-studio:mission-builder:draft:v1'

export type LessonAction =
  | { type: 'load-demo' }
  | { type: 'load-sample-mission' }
  | { type: 'update-class-context'; payload: ClassContext }
  | { type: 'update-resources'; payload: ResourceInventory }
  | { type: 'update-mission'; payload: MissionContent }
  | { type: 'update-adaptations'; payload: AdaptationPlan }
  | { type: 'clear-mission' }
  | { type: 'run-validation' }
  | { type: 'acknowledge-warning'; payload: string }
  | { type: 'receive-change-set'; payload: ChangeSet }
  | { type: 'resolve-change-operation'; payload: { changeSetId: string; operationId: string; decision: 'accept' | 'edit-and-accept' | 'reject' | 'supersede'; acceptedValue?: unknown } }
  | { type: 'reset-demo' }

export type ProposalReceiptResult =
  | { ok: true; draft: LessonDraft }
  | { ok: false; code: 'stale-state' | 'invalid-proposal'; message: string }

export type ValidationRunResult =
  | { ok: true; draft: LessonDraft }
  | { ok: false; code: 'stale-state' | 'aborted'; message: string }

export interface LessonCommandBoundary {
  getDraft(): LessonDraft
  dispatch(action: LessonAction): LessonDraft
  receiveChangeSet(changeSet: ChangeSet): ProposalReceiptResult
  runValidation(expectedDraft: LessonDraft, canPublish?: () => boolean): ValidationRunResult
}

export function createLessonCommandBoundary(initialDraft: LessonDraft, publish: (draft: LessonDraft) => void): LessonCommandBoundary {
  let current = initialDraft
  const dispatch = (action: LessonAction) => {
    const next = lessonReducer(current, action)
    current = next
    publish(next)
    return next
  }
  return {
    getDraft: () => current,
    dispatch,
    receiveChangeSet: (changeSet) => {
      try {
        return { ok: true, draft: dispatch({ type: 'receive-change-set', payload: changeSet }) }
      } catch (error) {
        const stale = error instanceof Error && /before value|Duplicate/.test(error.message)
        const invalid = error instanceof ZodError || (error instanceof Error && /Only pending operations|requires one injected operation ID|cannot propose/.test(error.message))
        if (!stale && !invalid) throw error
        return {
          ok: false,
          code: stale ? 'stale-state' : 'invalid-proposal',
          message: stale
            ? 'The accepted lesson changed before this proposal could be recorded. Try again with the current lesson.'
            : 'The proposal could not be recorded because it was invalid.',
        }
      }
    },
    runValidation: (expectedDraft, canPublish = () => true) => {
      if (current !== expectedDraft) {
        return { ok: false, code: 'stale-state', message: 'The accepted lesson changed before validation could be recorded. Run validation again.' }
      }
      const next = lessonReducer(current, { type: 'run-validation' })
      if (!canPublish()) {
        return { ok: false, code: 'aborted', message: 'The tool call was cancelled before validation could be recorded.' }
      }
      current = next
      publish(next)
      return { ok: true, draft: next }
    },
  }
}

const emptyValidation = (): LessonDraft['validation'] => ({ readiness: 'blocked', score: 0, checks: [], preparedOutputs: [], acknowledgedWarningIds: [] })

function withInvalidatedValidation(draft: LessonDraft): LessonDraft {
  return { ...draft, status: draft.pendingChanges.length > 0 ? 'needs-review' : 'draft', validation: emptyValidation() }
}

function normalizeStoredChangeSets(value: unknown, placement: 'pending' | 'history', seenIds: Set<string>) {
  if (value === undefined) return { sets: [] as ChangeSet[], malformed: false }
  if (!Array.isArray(value)) return { sets: [] as ChangeSet[], malformed: true }
  const sets: ChangeSet[] = []
  let malformed = false
  for (const candidate of value) {
    const parsed = changeSetSchema.safeParse(candidate)
    const correctlyPlaced = parsed.success && (placement === 'pending'
      ? parsed.data.operations.some(({ status }) => status === 'pending')
      : parsed.data.operations.every(({ status }) => status !== 'pending'))
    if (!parsed.success || !correctlyPlaced) {
      malformed = true
      continue
    }
    const ids = [parsed.data.changeSetId, ...parsed.data.operations.map(({ operationId }) => operationId)]
    if (ids.some((id) => seenIds.has(id))) {
      malformed = true
      continue
    }
    ids.forEach((id) => seenIds.add(id))
    sets.push(parsed.data)
  }
  return { sets, malformed }
}

export function restoreLessonDraft(storage: Pick<Storage, 'getItem'>): LessonDraft {
  try {
    const stored = storage.getItem(LESSON_STORAGE_KEY)
    if (!stored) return createCleanDraft()
    const raw: unknown = JSON.parse(stored)
    const parsed = lessonDraftSchema.safeParse(raw)
    if (parsed.success) return { ...parsed.data, groupingPlan: calculateGrouping(parsed.data.classContext, parsed.data.resources) }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return createCleanDraft()
    const record = raw as Record<string, unknown>
    const seenIds = new Set<string>()
    const pending = normalizeStoredChangeSets(record.pendingChanges, 'pending', seenIds)
    const history = normalizeStoredChangeSets(record.changeHistory, 'history', seenIds)
    const boundedHistory = history.sets.slice(-20)
    const rawValidation = record.validation && typeof record.validation === 'object' && !Array.isArray(record.validation)
      ? record.validation as Record<string, unknown>
      : undefined
    const outputsWerePresent = Array.isArray(rawValidation?.preparedOutputs) && rawValidation.preparedOutputs.length > 0
    const readinessIsStale = pending.malformed || outputsWerePresent
    const migrated = lessonDraftSchema.safeParse({
      ...record,
      pendingChanges: pending.sets,
      changeHistory: boundedHistory,
      status: pending.sets.length > 0 ? 'needs-review' : readinessIsStale ? 'draft' : record.status,
      validation: readinessIsStale ? emptyValidation() : rawValidation ? { ...rawValidation, preparedOutputs: [] } : record.validation,
      approvedAt: readinessIsStale ? undefined : record.approvedAt,
    })
    return migrated.success
      ? { ...migrated.data, groupingPlan: calculateGrouping(migrated.data.classContext, migrated.data.resources) }
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
  if (action.type === 'receive-change-set') return receiveChangeSet(state, action.payload, now)
  if (action.type === 'resolve-change-operation') return resolveOperation(state, action.payload.changeSetId, action.payload.operationId, action.payload.decision, now, action.payload.acceptedValue)
  if (action.type === 'run-validation') {
    const validation = validateLesson(state)
    return { ...state, validation, status: state.pendingChanges.length > 0 ? 'needs-review' : validation.readiness === 'ready' ? 'ready' : 'draft', updatedAt: now }
  }
  if (action.type === 'acknowledge-warning') {
    const acknowledged = state.validation.acknowledgedWarningIds.includes(action.payload)
      ? state.validation.acknowledgedWarningIds.filter((id) => id !== action.payload)
      : [...state.validation.acknowledgedWarningIds, action.payload]
    const validation = validateLesson(state, acknowledged)
    return { ...state, validation, status: state.pendingChanges.length > 0 ? 'needs-review' : validation.readiness === 'ready' ? 'ready' : 'draft', updatedAt: now }
  }
  if (action.type === 'load-sample-mission') return {
    ...state,
    title: lostStoryPathMission.title,
    mission: { ...lostStoryPathMission, successCriteria: [...lostStoryPathMission.successCriteria], assessmentEvidence: [...lostStoryPathMission.assessmentEvidence] },
    adaptations: createCleanDraft(now).adaptations,
    pendingChanges: [],
    changeHistory: [],
    validation: emptyValidation(),
    status: 'draft',
    updatedAt: now,
  }
  if (action.type === 'reset-demo') return createCleanDraft(now)
  if (action.type === 'clear-mission') {
    const clean = createCleanDraft(now)
    return { ...state, title: 'Untitled mission', mission: clean.mission, adaptations: clean.adaptations, validation: emptyValidation(), pendingChanges: [], changeHistory: [], status: 'draft', updatedAt: now }
  }
  if (action.type === 'update-class-context') {
    const classContext = classContextSchema.parse(action.payload)
    const edited = withInvalidatedValidation({ ...state, classContext, groupingPlan: calculateGrouping(classContext, state.resources), updatedAt: now })
    return supersedeSections(edited, ['class-context'], now)
  }
  if (action.type === 'update-mission') {
    const mission = missionContentSchema.parse(action.payload)
    const edited = withInvalidatedValidation({ ...state, title: mission.title || 'Untitled mission', mission, updatedAt: now })
    const sections: LessonSection[] = ['lesson-identity', 'learning-intention', 'success-criteria', 'mission-story', 'plan', 'build-and-explain', 'test-and-debug', 'reflect-and-improve', 'assessment-evidence']
    return supersedeSections(edited, sections.filter((section) => !structurallyEqual(getSectionValue(state, section), getSectionValue(edited, section))), now)
  }
  if (action.type === 'update-adaptations') {
    const parsed = adaptationPlanSchema.parse(action.payload)
    const adaptations: AdaptationPlan = parsed.noAdditionalAdaptation
      ? { supports: [], extensions: [], supportInstructions: '', extensionInstructions: '', sectionsToUpdate: [], noAdditionalAdaptation: true }
      : { ...parsed, sectionsToUpdate: [], noAdditionalAdaptation: false }
    const edited = withInvalidatedValidation({ ...state, adaptations, updatedAt: now })
    const sections: LessonSection[] = ['learner-support', 'extension-challenge']
    return supersedeSections(edited, sections.filter((section) => !structurallyEqual(getSectionValue(state, section), getSectionValue(edited, section))), now)
  }
  const resources = resourceInventorySchema.parse(action.payload)
  const edited = withInvalidatedValidation({ ...state, resources, groupingPlan: calculateGrouping(state.classContext, resources), updatedAt: now })
  return supersedeSections(edited, ['tangible-resources'], now)
}
