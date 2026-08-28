import { calculateGrouping } from './lesson-factories'
import { classContextSchema, type LessonDraft, type ValidationResult } from './lesson-schemas'

type Check = ValidationResult['checks'][number]

function check(id: string, passes: boolean, failureSeverity: 'error' | 'warning', messages: { pass: string; fail: string }, section: string, suggestedFix: string): Check {
  return {
    id,
    severity: passes ? 'pass' : failureSeverity,
    message: passes ? messages.pass : messages.fail,
    section,
    suggestedFix: passes ? '' : suggestedFix,
  }
}

function freeTextValues(draft: LessonDraft): string[] {
  const { mission, adaptations, classContext } = draft
  return [
    classContext.goal ?? '', mission.title, mission.theme, mission.learningIntention,
    ...mission.successCriteria, mission.missionStory, mission.plan, mission.buildAndExplain,
    mission.testAndDebug, mission.reflectAndImprove, ...mission.assessmentEvidence,
    adaptations.supportInstructions, adaptations.extensionInstructions,
  ]
}

export function containsObviousPersonalData(values: string[]): boolean {
  const text = values.join('\n')
  const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
  const labelledPhone = /\b(?:phone|tel|mobile)\s*:\s*(?:\+?\d[\d ()-]{5,}\d)/i
  const internationalPhone = /(?:^|[^\w])\+\d[\d ()-]{6,}\d(?:\b|$)/i
  const labelledName = /\b(?:pupil|student)\s+name\s*:\s*[^\s,;][^\n,;]*/i
  return email.test(text) || labelledPhone.test(text) || internationalPhone.test(text) || labelledName.test(text)
}

export function validateLesson(draft: LessonDraft, requestedAcknowledgements: string[] = draft.validation.acknowledgedWarningIds): ValidationResult {
  const { mission, adaptations, groupingPlan, classContext } = draft
  const expectedGrouping = calculateGrouping(classContext, draft.resources)
  const cycleTextComplete = [mission.plan, mission.buildAndExplain, mission.testAndDebug, mission.reflectAndImprove].every((value) => value.trim().length > 0)
  const requiredMissionComplete = mission.title.trim().length > 0 && mission.learningIntention.trim().length > 0 && mission.missionStory.trim().length > 0 && cycleTextComplete
  const criteria = mission.successCriteria.filter((value) => value.trim().length > 0)
  const evidence = mission.assessmentEvidence.filter((value) => value.trim().length > 0)
  const durations = [mission.planDurationMinutes, mission.buildAndExplainDurationMinutes, mission.testAndDebugDurationMinutes, mission.reflectAndImproveDurationMinutes]
  const durationsValid = durations.every((value) => typeof value === 'number' && Number.isInteger(value) && value > 0)
    && durations.reduce<number>((sum, value) => sum + (typeof value === 'number' ? value : 0), 0) === classContext.durationMinutes
  const supportValid = adaptations.supports.length === 0 || adaptations.supportInstructions.trim().length > 0
  const extensionSelected = adaptations.extensions.length > 0
  const extensionInstructionsPresent = adaptations.extensionInstructions.trim().length > 0
  const extensionValid = !extensionSelected || extensionInstructionsPresent
  const extensionDefinedOrDeclined = (extensionSelected && extensionInstructionsPresent) || adaptations.noAdditionalAdaptation
  const groupingMatches = JSON.stringify(groupingPlan) === JSON.stringify(expectedGrouping)
  const participationAvailable = expectedGrouping.recommendedGroups > 0 && expectedGrouping.simultaneousCapacity > 0
  const participationComplete = participationAvailable && (expectedGrouping.simultaneousCapacity >= expectedGrouping.recommendedGroups || expectedGrouping.rotationRequired)

  const checks: Check[] = [
    check('VAL-01', classContextSchema.safeParse(classContext).success, 'error', { pass: 'Required class context is complete.', fail: 'Required class context is incomplete or invalid.' }, 'class-context', 'Complete every required class-context field.'),
    check('VAL-02', participationAvailable, 'error', { pass: 'At least one physical participation route is available.', fail: 'No usable physical participation route is available.' }, 'resource-plan', 'Add a complete station or enable an available tile-only participation route.'),
    check('VAL-03', groupingMatches, 'error', { pass: 'The group allocation matches the current inventory.', fail: 'The group allocation does not match the current inventory.' }, 'resource-plan', 'Review the current resource inventory so the grouping plan can be recalculated.'),
    check('VAL-04', requiredMissionComplete, 'error', { pass: 'Required mission content and all four learning-cycle stages are complete.', fail: 'Required mission content or a learning-cycle stage is missing.' }, 'mission-content', 'Complete the title, learning intention, mission problem and all four learning-cycle stages.'),
    check('VAL-05', criteria.length >= 2 && criteria.length <= 4, 'error', { pass: 'Two to four observable success criteria are present.', fail: 'The lesson needs two to four non-empty success criteria.' }, 'success-criteria', 'Add two to four observable success criteria.'),
    check('VAL-06', evidence.length > 0, 'error', { pass: 'Assessment evidence is present.', fail: 'Assessment evidence is missing.' }, 'assessment-evidence', 'Add at least one non-empty assessment-evidence statement.'),
    check('VAL-07', durationsValid, 'error', { pass: 'Four positive whole-number stage durations match the lesson duration.', fail: 'Stage durations must be positive whole minutes and sum exactly to the lesson duration.' }, 'cycle-durations', `Set all four stage durations so their total is ${classContext.durationMinutes} minutes.`),
    check('VAL-08', participationComplete, 'error', { pass: 'Every pupil has a group or rotation route.', fail: 'The current plan does not give every pupil a group or rotation route.' }, 'resource-plan', 'Provide enough simultaneous capacity or retain a valid rotation route.'),
    check('VAL-09', supportValid, 'error', { pass: 'Selected learner supports have instructions.', fail: 'A selected learner support has no support instructions.' }, 'support-instructions', 'Add support instructions or clear the selected support.'),
    check('VAL-10', extensionValid && extensionDefinedOrDeclined, extensionValid ? 'warning' : 'error', { pass: 'Extension is defined or explicitly declined.', fail: extensionValid ? 'No extension is defined or explicitly declined.' : 'A selected extension has no extension instructions.' }, 'extension-instructions', extensionValid ? 'Add an extension with instructions or explicitly decline additional adaptation.' : 'Add extension instructions or clear the selected extension.'),
    check('VAL-11', classContext.teacherConfidence !== 'beginner' || adaptations.supportInstructions.trim().length > 0, 'warning', { pass: 'Preparation guidance is available for the teacher confidence level.', fail: 'A beginner teacher has no preparation guidance in support instructions.' }, 'support-instructions', 'Add preparation guidance to Support instructions, or acknowledge this warning.'),
    check('VAL-12', !containsObviousPersonalData(freeTextValues(draft)), 'error', { pass: 'No limited obvious personal-data pattern was detected.', fail: 'A limited obvious personal-data pattern was detected.' }, 'mission-content', 'Remove email addresses, labelled phone numbers, international phone numbers, or labelled pupil/student names.'),
    check('VAL-13', draft.pendingChanges.length === 0, 'error', { pass: 'No unresolved pending changes exist.', fail: 'Unresolved pending changes prevent readiness.' }, 'review-changes', 'Resolve all pending changes in the later review workflow.'),
  ]
  const warningIds = new Set(checks.filter(({ severity }) => severity === 'warning').map(({ id }) => id))
  const acknowledgedWarningIds = [...new Set(requestedAcknowledgements)].filter((id) => warningIds.has(id))
  const hasErrors = checks.some(({ severity }) => severity === 'error')
  const hasUnacknowledgedWarnings = checks.some(({ id, severity }) => severity === 'warning' && !acknowledgedWarningIds.includes(id))

  return {
    readiness: hasErrors ? 'blocked' : hasUnacknowledgedWarnings ? 'warning' : 'ready',
    score: checks.filter(({ severity }) => severity === 'pass').length,
    checks,
    preparedOutputs: [],
    acknowledgedWarningIds,
  }
}
