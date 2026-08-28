import { describe, expect, it } from 'vitest'
import { createGoldenPathDraft, lostStoryPathMission } from './lesson-factories'
import type { LessonDraft } from './lesson-schemas'
import { containsObviousPersonalData, validateLesson } from './lesson-validation'

function validDraft(): LessonDraft {
  return {
    ...createGoldenPathDraft('2026-08-28T12:00:00.000Z'),
    title: lostStoryPathMission.title,
    mission: { ...lostStoryPathMission, successCriteria: [...lostStoryPathMission.successCriteria], assessmentEvidence: [...lostStoryPathMission.assessmentEvidence] },
    adaptations: {
      supports: ['reduced-reading'], extensions: ['loop-challenge'],
      supportInstructions: 'Prepare short visual instructions before the lesson.',
      extensionInstructions: 'Ask pupils to replace repeated moves with a loop.',
      sectionsToUpdate: [], noAdditionalAdaptation: false,
    },
  }
}

const resultFor = (draft: LessonDraft, id: string) => validateLesson(draft).checks.find((item) => item.id === id)

describe('deterministic manual lesson validation', () => {
  it('returns unique stable rule IDs and a non-empty section for every check', () => {
    const checks = validateLesson(validDraft()).checks
    expect(new Set(checks.map(({ id }) => id)).size).toBe(checks.length)
    expect(checks.every(({ section }) => section.trim().length > 0)).toBe(true)
  })

  it('maps VAL-01 to invalid required class context', () => {
    const draft = validDraft()
    const invalid = { ...draft, classContext: { ...draft.classContext, classSize: 0 } } as LessonDraft
    expect(resultFor(invalid, 'VAL-01')?.severity).toBe('error')
  })

  it('maps VAL-02 to the absence of a physical participation route', () => {
    const draft = validDraft()
    const resources = { ...draft.resources, tileSets: 0 }
    const invalid = { ...draft, resources, groupingPlan: { ...draft.groupingPlan, simultaneousCapacity: 0, participationRoute: '', warnings: ['Blocking'] } }
    expect(resultFor(invalid, 'VAL-02')?.severity).toBe('error')
  })

  it('maps VAL-03 to a grouping plan that does not match inventory', () => {
    const draft = validDraft()
    expect(resultFor({ ...draft, groupingPlan: { ...draft.groupingPlan, simultaneousCapacity: 2 } }, 'VAL-03')?.severity).toBe('error')
  })

  it('passes a complete four-stage duration sum', () => {
    expect(resultFor(validDraft(), 'VAL-07')?.severity).toBe('pass')
    expect(validateLesson(validDraft()).readiness).toBe('ready')
  })

  it.each([
    ['missing', null], ['zero', 0], ['negative', -1], ['fractional', 2.5],
  ])('rejects a %s stage duration', (_label, value) => {
    const draft = validDraft()
    const invalid = { ...draft, mission: { ...draft.mission, planDurationMinutes: value } } as LessonDraft
    expect(resultFor(invalid, 'VAL-07')?.severity).toBe('error')
  })

  it('rejects a duration total that does not match the lesson duration', () => {
    const draft = validDraft()
    expect(resultFor({ ...draft, mission: { ...draft.mission, planDurationMinutes: 9 } }, 'VAL-07')?.severity).toBe('error')
  })

  it.each([
    ['title', { title: '' }], ['learning intention', { learningIntention: '' }],
    ['mission story', { missionStory: '' }], ['Plan', { plan: '' }],
    ['Build & Explain', { buildAndExplain: '' }], ['Test & Debug', { testAndDebug: '' }],
    ['Reflect & Improve', { reflectAndImprove: '' }],
  ])('reports missing required mission content: %s', (_label, patch) => {
    const draft = validDraft()
    expect(resultFor({ ...draft, mission: { ...draft.mission, ...patch } }, 'VAL-04')?.severity).toBe('error')
  })

  it('requires non-empty assessment evidence without criterion mapping', () => {
    const draft = validDraft()
    expect(resultFor({ ...draft, mission: { ...draft.mission, assessmentEvidence: ['  '] } }, 'VAL-06')?.severity).toBe('error')
  })

  it('requires two to four non-empty success criteria', () => {
    const draft = validDraft()
    expect(resultFor({ ...draft, mission: { ...draft.mission, successCriteria: ['Only one'] } }, 'VAL-05')?.severity).toBe('error')
  })

  it('requires a group or rotation route for every pupil', () => {
    const draft = validDraft()
    const resources = { ...draft.resources, instructionCardPacks: 0 }
    const invalid = { ...draft, resources }
    expect(resultFor(invalid, 'VAL-08')?.severity).toBe('error')
  })

  it('requires instructions for selected support and extension options', () => {
    const draft = validDraft()
    const noSupportInstructions = { ...draft, adaptations: { ...draft.adaptations, supportInstructions: '' } }
    const noExtensionInstructions = { ...draft, adaptations: { ...draft.adaptations, extensionInstructions: '' } }
    expect(resultFor(noSupportInstructions, 'VAL-09')?.severity).toBe('error')
    expect(resultFor(noExtensionInstructions, 'VAL-10')?.severity).toBe('error')
  })

  it('accepts a valid explicit decline state', () => {
    const draft = validDraft()
    const declined: LessonDraft = { ...draft, classContext: { ...draft.classContext, teacherConfidence: 'confident' }, adaptations: { supports: [], extensions: [], supportInstructions: '', extensionInstructions: '', sectionsToUpdate: [], noAdditionalAdaptation: true } }
    expect(resultFor(declined, 'VAL-10')?.severity).toBe('pass')
    expect(validateLesson(declined).readiness).toBe('ready')
  })

  it('warns when a beginner teacher has no preparation guidance', () => {
    const draft = validDraft()
    const invalid: LessonDraft = { ...draft, adaptations: { ...draft.adaptations, supports: [], supportInstructions: '' } }
    expect(resultFor(invalid, 'VAL-11')?.severity).toBe('warning')
  })

  it.each([
    ['email', 'Contact: teacher@example.org'],
    ['Phone label', 'Phone: 0131 555 0123'],
    ['Tel label', 'tel: 0207 123 4567'],
    ['Mobile label', 'MOBILE: 07123 456789'],
    ['international phone', 'Call +44 7700 900123'],
    ['pupil name', 'Pupil name: Alex Smith'],
    ['student name', 'student NAME: Jamie'],
  ])('detects the narrow %s pattern', (_label, value) => {
    expect(containsObviousPersonalData([value])).toBe(true)
    const draft = validDraft()
    expect(resultFor({ ...draft, mission: { ...draft.mission, missionStory: value } }, 'VAL-12')?.severity).toBe('error')
  })

  it.each([
    'Alex explains the route to Jamie.',
    'Use tiles 1 2 3 4 5 6 7 8 9 10.',
    'There are 24 pupils and 3 robots.',
    'The code is + plus a number tile.',
  ])('does not flag ordinary prose or arbitrary numbers: %s', (value) => {
    expect(containsObviousPersonalData([value])).toBe(false)
  })

  it('retains only current warning acknowledgements by stable ID', () => {
    const draft = validDraft()
    const warningDraft: LessonDraft = { ...draft, classContext: { ...draft.classContext, teacherConfidence: 'beginner' }, adaptations: { ...draft.adaptations, supports: [], extensions: [], supportInstructions: '', extensionInstructions: '', noAdditionalAdaptation: false } }
    const first = validateLesson(warningDraft)
    expect(first.readiness).toBe('warning')
    expect(first.checks.filter(({ severity }) => severity === 'warning').map(({ id }) => id)).toEqual(['VAL-10', 'VAL-11'])
    expect(validateLesson(warningDraft, ['VAL-10', 'stale-rule']).acknowledgedWarningIds).toEqual(['VAL-10'])
    expect(validateLesson(warningDraft, ['VAL-10', 'VAL-11']).readiness).toBe('ready')
  })

  it('keeps errors, unacknowledged warnings and pending changes from ready', () => {
    const draft = validDraft()
    expect(validateLesson({ ...draft, mission: { ...draft.mission, title: '' } }).readiness).toBe('blocked')
    const warningDraft: LessonDraft = { ...draft, classContext: { ...draft.classContext, teacherConfidence: 'beginner' }, adaptations: { ...draft.adaptations, supportInstructions: '' } }
    expect(validateLesson(warningDraft).readiness).not.toBe('ready')
    const pending: LessonDraft = { ...draft, pendingChanges: [{
      changeSetId: 'pending-1', source: 'webmcp-agent', toolName: 'set_class_context', createdAt: '2026-08-28T12:00:00.000Z',
      operations: [{ operationId: 'operation-1', section: 'class-context', before: draft.classContext, proposed: { ...draft.classContext, goal: 'Proposed goal' }, status: 'pending', validation: { valid: true, messages: [] } }],
    }] }
    expect(resultFor(pending, 'VAL-13')?.severity).toBe('error')
    expect(validateLesson(pending).readiness).toBe('blocked')
  })

  it('never prepares outputs or modifies lesson state while validating', () => {
    const draft = validDraft()
    const before = JSON.stringify({ mission: draft.mission, adaptations: draft.adaptations, resources: draft.resources, groupingPlan: draft.groupingPlan })
    const validation = validateLesson(draft)
    expect(validation.preparedOutputs).toEqual([])
    expect(JSON.stringify({ mission: draft.mission, adaptations: draft.adaptations, resources: draft.resources, groupingPlan: draft.groupingPlan })).toBe(before)
    expect(draft.approvedAt).toBeUndefined()
    expect(draft.status).toBe('draft')
  })
})
