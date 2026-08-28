import {
  changeOperationSchema,
  changeSetSchema,
  toolSectionAllowlists,
  type ApprovedToolName,
  type ChangeOperation,
  type ChangeSet,
  type LessonDraft,
  type LessonSection,
} from './lesson-schemas'
import { calculateGrouping } from './lesson-factories'

export const TOOL_SECTION_ALLOWLISTS: Readonly<Record<ApprovedToolName, readonly LessonSection[]>> = toolSectionAllowlists

export interface ProposedOperation {
  section: LessonSection
  before: unknown
  proposed: unknown
}
export interface ProposalIdentity {
  changeSetId: string
  operationIds: string[]
  createdAt: string
}

export type ChangeSetStatus = 'pending' | 'accepted' | 'rejected' | 'superseded' | 'partially-resolved'

export interface SectionAttribution {
  changeSetId: string
  operationId: string
  toolName: ApprovedToolName
  section: LessonSection
  acceptedAt: string
  historicalProposedValue: unknown
  historicalAcceptedValue: unknown
  currentValue: unknown
  currentSource: 'accepted-proposal' | 'teacher-edited'
}

export function deriveChangeSetStatus(changeSet: ChangeSet): ChangeSetStatus {
  const statuses = new Set(changeSet.operations.map(({ status }) => status))
  if (statuses.has('pending')) return 'pending'
  if (statuses.size === 1) return [...statuses][0] as Exclude<ChangeSetStatus, 'pending' | 'partially-resolved'>
  return 'partially-resolved'
}

export function structurallyEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function getSectionValue(draft: LessonDraft, section: LessonSection): unknown {
  const { mission, adaptations } = draft
  switch (section) {
    case 'class-context': return draft.classContext
    case 'tangible-resources': return draft.resources
    case 'lesson-identity': return { title: mission.title, theme: mission.theme, challengeLevel: mission.challengeLevel }
    case 'learning-intention': return mission.learningIntention
    case 'success-criteria': return mission.successCriteria
    case 'mission-story': return mission.missionStory
    case 'plan': return { content: mission.plan, durationMinutes: mission.planDurationMinutes }
    case 'build-and-explain': return { content: mission.buildAndExplain, durationMinutes: mission.buildAndExplainDurationMinutes }
    case 'test-and-debug': return { content: mission.testAndDebug, durationMinutes: mission.testAndDebugDurationMinutes }
    case 'reflect-and-improve': return { content: mission.reflectAndImprove, durationMinutes: mission.reflectAndImproveDurationMinutes }
    case 'assessment-evidence': return mission.assessmentEvidence
    case 'learner-support': return { supports: adaptations.supports, supportInstructions: adaptations.supportInstructions }
    case 'extension-challenge': return { extensions: adaptations.extensions, extensionInstructions: adaptations.extensionInstructions }
  }
}

export function getSectionAttribution(draft: LessonDraft, section: LessonSection): SectionAttribution | undefined {
  const accepted = [...draft.changeHistory, ...draft.pendingChanges]
    .flatMap((set) => set.operations.map((operation) => ({ set, operation })))
    .filter(({ operation }) => operation.section === section && operation.status === 'accepted' && operation.resolution)
    .sort((left, right) => (left.operation.resolution?.decidedAt ?? '').localeCompare(right.operation.resolution?.decidedAt ?? ''))
  const latest = accepted.at(-1)
  if (!latest?.operation.resolution) return undefined
  const currentValue = getSectionValue(draft, section)
  const historicalAcceptedValue = latest.operation.acceptedValue
  return {
    changeSetId: latest.set.changeSetId,
    operationId: latest.operation.operationId,
    toolName: latest.set.toolName,
    section,
    acceptedAt: latest.operation.resolution.decidedAt,
    historicalProposedValue: latest.operation.proposed,
    historicalAcceptedValue,
    currentValue,
    currentSource: structurallyEqual(currentValue, historicalAcceptedValue) ? 'accepted-proposal' : 'teacher-edited',
  }
}

function applySectionValue(draft: LessonDraft, section: LessonSection, value: unknown): LessonDraft {
  switch (section) {
    case 'class-context': {
      const classContext = value as LessonDraft['classContext']
      return { ...draft, classContext, groupingPlan: calculateGrouping(classContext, draft.resources) }
    }
    case 'tangible-resources': {
      const resources = value as LessonDraft['resources']
      return { ...draft, resources, groupingPlan: calculateGrouping(draft.classContext, resources) }
    }
    case 'lesson-identity': {
      const identity = value as Pick<LessonDraft['mission'], 'title' | 'theme' | 'challengeLevel'>
      return { ...draft, title: identity.title || 'Untitled mission', mission: { ...draft.mission, ...identity } }
    }
    case 'learning-intention': return { ...draft, mission: { ...draft.mission, learningIntention: value as string } }
    case 'success-criteria': return { ...draft, mission: { ...draft.mission, successCriteria: value as string[] } }
    case 'mission-story': return { ...draft, mission: { ...draft.mission, missionStory: value as string } }
    case 'plan': {
      const stage = value as { content: string; durationMinutes: number | null }
      return { ...draft, mission: { ...draft.mission, plan: stage.content, planDurationMinutes: stage.durationMinutes } }
    }
    case 'build-and-explain': {
      const stage = value as { content: string; durationMinutes: number | null }
      return { ...draft, mission: { ...draft.mission, buildAndExplain: stage.content, buildAndExplainDurationMinutes: stage.durationMinutes } }
    }
    case 'test-and-debug': {
      const stage = value as { content: string; durationMinutes: number | null }
      return { ...draft, mission: { ...draft.mission, testAndDebug: stage.content, testAndDebugDurationMinutes: stage.durationMinutes } }
    }
    case 'reflect-and-improve': {
      const stage = value as { content: string; durationMinutes: number | null }
      return { ...draft, mission: { ...draft.mission, reflectAndImprove: stage.content, reflectAndImproveDurationMinutes: stage.durationMinutes } }
    }
    case 'assessment-evidence': return { ...draft, mission: { ...draft.mission, assessmentEvidence: value as string[] } }
    case 'learner-support': {
      const support = value as Pick<LessonDraft['adaptations'], 'supports' | 'supportInstructions'>
      return { ...draft, adaptations: { ...draft.adaptations, ...support, noAdditionalAdaptation: support.supports.length > 0 || support.supportInstructions.trim() ? false : draft.adaptations.noAdditionalAdaptation } }
    }
    case 'extension-challenge': {
      const extension = value as Pick<LessonDraft['adaptations'], 'extensions' | 'extensionInstructions'>
      return { ...draft, adaptations: { ...draft.adaptations, ...extension, noAdditionalAdaptation: extension.extensions.length > 0 || extension.extensionInstructions.trim() ? false : draft.adaptations.noAdditionalAdaptation } }
    }
  }
}

function invalidatedValidation(draft: LessonDraft) {
  return { ...draft.validation, readiness: 'blocked' as const, score: 0, checks: [], preparedOutputs: [], acknowledgedWarningIds: [] }
}

function allKnownIds(draft: LessonDraft): Set<string> {
  return new Set([...draft.pendingChanges, ...draft.changeHistory].flatMap((set) => [set.changeSetId, ...set.operations.map(({ operationId }) => operationId)]))
}

export function createPendingChangeSet(draft: LessonDraft, toolName: ApprovedToolName, proposed: ProposedOperation[], identity: ProposalIdentity): ChangeSet {
  if (proposed.length === 0 || proposed.length !== identity.operationIds.length) throw new Error('A proposal requires one injected operation ID per operation.')
  const incomingIds = [identity.changeSetId, ...identity.operationIds]
  if (new Set(incomingIds).size !== incomingIds.length || incomingIds.some((id) => allKnownIds(draft).has(id))) throw new Error('Duplicate change-set or operation ID.')
  const allowed = TOOL_SECTION_ALLOWLISTS[toolName]
  if (proposed.some(({ section }) => !allowed.includes(section))) throw new Error(`Tool ${toolName} cannot propose one or more requested sections.`)
  const operations = proposed.map((operation, index) => ({
    ...operation,
    operationId: identity.operationIds[index],
    status: 'pending' as const,
    validation: { valid: true, messages: [] },
  }))
  const parsed = changeSetSchema.parse({ changeSetId: identity.changeSetId, source: 'webmcp-agent', toolName, operations, createdAt: identity.createdAt })
  if (parsed.operations.some((operation) => !structurallyEqual(getSectionValue(draft, operation.section), operation.before))) throw new Error('Proposal before value does not match current accepted content.')
  return parsed
}

function finishResolvedSets(pendingChanges: ChangeSet[], history: ChangeSet[], decidedAt: string) {
  const stillPending: ChangeSet[] = []
  const resolved: ChangeSet[] = []
  for (const set of pendingChanges) {
    if (set.operations.some(({ status }) => status === 'pending')) stillPending.push(set)
    else resolved.push(changeSetSchema.parse({ ...set, resolvedAt: set.resolvedAt ?? decidedAt }))
  }
  return { pendingChanges: stillPending, changeHistory: [...history, ...resolved].slice(-20) }
}

export function receiveChangeSet(draft: LessonDraft, changeSet: ChangeSet, now: string): LessonDraft {
  const incoming = changeSetSchema.parse(changeSet)
  if (incoming.operations.some(({ status }) => status !== 'pending')) throw new Error('Only pending operations may be received.')
  const parsed = createPendingChangeSet(draft, incoming.toolName, incoming.operations.map(({ section, before, proposed }) => ({ section, before, proposed })), {
    changeSetId: incoming.changeSetId,
    operationIds: incoming.operations.map(({ operationId }) => operationId),
    createdAt: incoming.createdAt,
  })
  return {
    ...draft,
    status: 'needs-review',
    validation: invalidatedValidation(draft),
    pendingChanges: [...draft.pendingChanges, parsed],
    approvedAt: undefined,
    activityLog: [...draft.activityLog, { id: `${parsed.changeSetId}:received`, source: 'webmcp-agent', message: `${parsed.toolName} proposed changes to ${parsed.operations.map(({ section }) => section).join(', ')}.`, createdAt: now }],
    updatedAt: now,
  }
}

export function resolveOperation(draft: LessonDraft, changeSetId: string, operationId: string, decision: 'accept' | 'edit-and-accept' | 'reject' | 'supersede', decidedAt: string, acceptedValue?: unknown): LessonDraft {
  let next = draft
  let found = false
  const pendingChanges = draft.pendingChanges.map((set) => {
    if (set.changeSetId !== changeSetId) return set
    const operations = set.operations.map((operation) => {
      if (operation.operationId !== operationId || operation.status !== 'pending') return operation
      found = true
      const stale = !structurallyEqual(getSectionValue(next, operation.section), operation.before)
      const outcome = decision === 'supersede' || stale ? 'superseded' : decision === 'reject' ? 'rejected' : 'accepted'
      const teacherModified = decision === 'edit-and-accept' && outcome === 'accepted'
      let resolved = { ...operation, status: outcome, resolution: { outcome, decidedAt, teacherModified } } as ChangeOperation
      if (outcome === 'accepted') {
        const value = teacherModified ? acceptedValue : operation.proposed
        resolved = changeOperationSchema.parse({ ...resolved, acceptedValue: value })
        next = applySectionValue(next, operation.section, value)
      }
      return changeOperationSchema.parse(resolved)
    })
    return { ...set, operations }
  })
  if (!found) throw new Error('Pending operation not found.')
  const collections = finishResolvedSets(pendingChanges, draft.changeHistory, decidedAt)
  return {
    ...next,
    ...collections,
    status: collections.pendingChanges.length > 0 ? 'needs-review' : 'draft',
    validation: invalidatedValidation(next),
    approvedAt: undefined,
    activityLog: [...next.activityLog, { id: `${operationId}:${decision}`, source: 'teacher', message: `Teacher resolved ${operationId} as ${decision === 'edit-and-accept' ? 'accepted with teacher edits' : decision}.`, createdAt: decidedAt }],
    updatedAt: decidedAt,
  }
}

export function supersedeSections(draft: LessonDraft, sections: LessonSection[], decidedAt: string): LessonDraft {
  const affected = new Set(sections)
  if (!draft.pendingChanges.some((set) => set.operations.some((operation) => operation.status === 'pending' && affected.has(operation.section)))) return draft
  let next = draft
  for (const set of [...next.pendingChanges]) {
    for (const operation of set.operations) {
      if (operation.status === 'pending' && affected.has(operation.section)) next = resolveOperation(next, set.changeSetId, operation.operationId, 'supersede', decidedAt)
    }
  }
  return next
}
