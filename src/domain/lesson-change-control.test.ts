import { describe, expect, it } from 'vitest'
import { createGoldenPathDraft, lostStoryPathMission } from './lesson-factories'
import {
  TOOL_SECTION_ALLOWLISTS,
  createPendingChangeSet,
  deriveChangeSetStatus,
  getSectionValue,
  receiveChangeSet,
  resolveOperation,
  supersedeSections,
} from './lesson-change-control'
import { approvedToolNameSchema, changeSetSchema, lessonSectionSchema, toolSectionAllowlists, type ApprovedToolName, type LessonDraft, type LessonSection } from './lesson-schemas'

const time = '2026-08-28T12:00:00.000Z'
const later = '2026-08-28T12:05:00.000Z'

function populatedDraft(): LessonDraft {
  const draft = createGoldenPathDraft(time)
  return { ...draft, title: lostStoryPathMission.title, mission: { ...lostStoryPathMission, successCriteria: [...lostStoryPathMission.successCriteria], assessmentEvidence: [...lostStoryPathMission.assessmentEvidence] } }
}

function proposal(draft: LessonDraft, section: LessonSection = 'learning-intention', proposed: unknown = 'Proposed learning intention', suffix = '1', tool: ApprovedToolName = 'build_tangible_mission') {
  return createPendingChangeSet(draft, tool, [{ section, before: getSectionValue(draft, section) as never, proposed: proposed as never }], {
    changeSetId: `set-${suffix}`, operationIds: [`operation-${suffix}`], createdAt: time,
  })
}

describe('change-control schemas and authority', () => {
  it('contains exactly the five approved tools and thirteen named sections', () => {
    expect(approvedToolNameSchema.options).toEqual(['set_class_context', 'select_tangible_resources', 'build_tangible_mission', 'adapt_for_learners', 'validate_and_prepare_lesson'])
    expect(lessonSectionSchema.options).toEqual([
      'class-context', 'tangible-resources', 'lesson-identity', 'learning-intention',
      'success-criteria', 'mission-story', 'plan', 'build-and-explain',
      'test-and-debug', 'reflect-and-improve', 'assessment-evidence',
      'learner-support', 'extension-challenge',
    ])
    expect(new Set(lessonSectionSchema.options).size).toBe(13)
    expect(Object.keys(TOOL_SECTION_ALLOWLISTS)).toEqual(approvedToolNameSchema.options)
    expect(TOOL_SECTION_ALLOWLISTS).toBe(toolSectionAllowlists)
  })

  it.each(Object.entries(toolSectionAllowlists) as Array<[ApprovedToolName, readonly LessonSection[]]>)('accepts every permitted %s section and no others', (tool, allowed) => {
    const draft = populatedDraft()
    for (const section of lessonSectionSchema.options) {
      const invoke = () => proposal(draft, section, getSectionValue(draft, section), `${tool}-${section}`, tool)
      if (allowed.includes(section)) expect(invoke).not.toThrow()
      else expect(invoke).toThrow(/cannot propose/)
    }
    expect(allowed).not.toContain('noAdditionalAdaptation')
  })

  it('rejects unknown sections, arbitrary paths, duplicate IDs and invalid records', () => {
    const draft = populatedDraft()
    const valid = proposal(draft)
    expect(changeSetSchema.safeParse({ ...valid, extra: true }).success).toBe(false)
    expect(changeSetSchema.safeParse({ ...valid, operations: [{ ...valid.operations[0], section: 'mission.title' }] }).success).toBe(false)
    expect(() => createPendingChangeSet(draft, 'build_tangible_mission', [
      { section: 'learning-intention', before: draft.mission.learningIntention, proposed: 'One' },
      { section: 'mission-story', before: draft.mission.missionStory, proposed: 'Two' },
    ], { changeSetId: 'duplicate', operationIds: ['same', 'same'], createdAt: time })).toThrow(/Duplicate/)
  })

  it('rejects duplicate target sections atomically', () => {
    const draft = populatedDraft()
    expect(() => createPendingChangeSet(draft, 'build_tangible_mission', [
      { section: 'learning-intention', before: draft.mission.learningIntention, proposed: 'First' },
      { section: 'learning-intention', before: draft.mission.learningIntention, proposed: 'Second' },
    ], { changeSetId: 'duplicate-sections', operationIds: ['first-operation', 'second-operation'], createdAt: time })).toThrow()
    expect(draft.mission.learningIntention).toBe(lostStoryPathMission.learningIntention)
    expect(draft.pendingChanges).toEqual([])
  })
})

describe('proposal lifecycle', () => {
  it('receives a proposal without mutating accepted content and invalidates readiness', () => {
    const draft = { ...populatedDraft(), status: 'ready' as const, validation: { ...populatedDraft().validation, readiness: 'ready' as const, checks: [{ id: 'VAL-01', severity: 'pass' as const, message: 'Passed', section: 'class-context', suggestedFix: '' }], acknowledgedWarningIds: ['VAL-10'] } }
    const next = receiveChangeSet(draft, proposal(draft), later)
    expect(next.mission).toEqual(draft.mission)
    expect(next.status).toBe('needs-review')
    expect(next.validation.checks).toEqual([])
    expect(next.validation.acknowledgedWarningIds).toEqual([])
    expect(next.validation.preparedOutputs).toEqual([])
    expect(next.approvedAt).toBeUndefined()
  })

  it('accepts only the named section and moves the resolved set to history', () => {
    const draft = populatedDraft()
    const received = receiveChangeSet(draft, proposal(draft), time)
    const accepted = resolveOperation(received, 'set-1', 'operation-1', 'accept', later)
    expect(accepted.mission.learningIntention).toBe('Proposed learning intention')
    expect(accepted.mission.missionStory).toBe(draft.mission.missionStory)
    expect(accepted.pendingChanges).toEqual([])
    expect(accepted.changeHistory[0].operations[0].status).toBe('accepted')
    expect(deriveChangeSetStatus(accepted.changeHistory[0])).toBe('accepted')
    expect(accepted.status).toBe('draft')
    expect(accepted.validation.preparedOutputs).toEqual([])
    expect(accepted.approvedAt).toBeUndefined()
  })

  it('edit-and-accept preserves the proposal and records the teacher value', () => {
    const draft = populatedDraft()
    const received = receiveChangeSet(draft, proposal(draft), time)
    const accepted = resolveOperation(received, 'set-1', 'operation-1', 'edit-and-accept', later, 'Teacher wording')
    const operation = accepted.changeHistory[0].operations[0]
    expect(accepted.mission.learningIntention).toBe('Teacher wording')
    expect(operation.proposed).toBe('Proposed learning intention')
    expect(operation.acceptedValue).toBe('Teacher wording')
    expect(operation.resolution?.teacherModified).toBe(true)
  })

  it('rejects without changing content or approval boundaries', () => {
    const draft = { ...populatedDraft(), adaptations: { ...populatedDraft().adaptations, noAdditionalAdaptation: true } }
    const set = proposal(draft, 'learner-support', { supports: ['visual-instructions'], supportInstructions: 'Use pictures.' }, 'support', 'adapt_for_learners')
    const rejected = resolveOperation(receiveChangeSet(draft, set, time), 'set-support', 'operation-support', 'reject', later)
    expect(rejected.adaptations).toEqual(draft.adaptations)
    expect(rejected.changeHistory[0].operations[0].status).toBe('rejected')
    expect(rejected.approvedAt).toBeUndefined()
  })

  it('supersedes a stale operation while unrelated operations remain reviewable', () => {
    const draft = populatedDraft()
    const set = createPendingChangeSet(draft, 'build_tangible_mission', [
      { section: 'learning-intention', before: draft.mission.learningIntention, proposed: 'New intention' },
      { section: 'mission-story', before: draft.mission.missionStory, proposed: 'New story' },
    ], { changeSetId: 'set-two', operationIds: ['op-intention', 'op-story'], createdAt: time })
    const received = receiveChangeSet(draft, set, time)
    const teacherEdited = { ...received, mission: { ...received.mission, learningIntention: 'Teacher wins' } }
    const superseded = supersedeSections(teacherEdited, ['learning-intention'], later)
    expect(superseded.mission.learningIntention).toBe('Teacher wins')
    expect(superseded.pendingChanges[0].operations.find(({ operationId }) => operationId === 'op-intention')?.status).toBe('superseded')
    expect(superseded.pendingChanges[0].operations.find(({ operationId }) => operationId === 'op-story')?.status).toBe('pending')
    expect(superseded.status).toBe('needs-review')
  })

  it('detects structural staleness at acceptance and never applies stale content', () => {
    const draft = populatedDraft()
    const received = receiveChangeSet(draft, proposal(draft), time)
    const teacherEdited = { ...received, mission: { ...received.mission, learningIntention: 'Later teacher edit' } }
    const result = resolveOperation(teacherEdited, 'set-1', 'operation-1', 'accept', later)
    expect(result.mission.learningIntention).toBe('Later teacher edit')
    expect(result.changeHistory[0].operations[0].status).toBe('superseded')
  })

  it('rejects malformed edited acceptance atomically', () => {
    const draft = populatedDraft()
    const received = receiveChangeSet(draft, proposal(draft), time)
    expect(() => resolveOperation(received, 'set-1', 'operation-1', 'edit-and-accept', later, { invalid: true })).toThrow()
    expect(received.mission).toEqual(draft.mission)
    expect(received.pendingChanges[0].operations[0].status).toBe('pending')
  })
})

describe('D-017 adaptation boundary and history', () => {
  it('does not expose noAdditionalAdaptation in proposal section values', () => {
    const draft = { ...populatedDraft(), adaptations: { ...populatedDraft().adaptations, noAdditionalAdaptation: true } }
    expect(getSectionValue(draft, 'learner-support')).not.toHaveProperty('noAdditionalAdaptation')
    expect(getSectionValue(draft, 'extension-challenge')).not.toHaveProperty('noAdditionalAdaptation')
    expect(() => proposal(draft, 'learner-support', { supports: [], supportInstructions: '', noAdditionalAdaptation: true }, 'bad-support', 'adapt_for_learners')).toThrow()
  })

  it('clears explicit decline only when accepted support instructions create a contradiction', () => {
    const draft = { ...populatedDraft(), adaptations: { ...populatedDraft().adaptations, noAdditionalAdaptation: true } }
    const set = proposal(draft, 'learner-support', { supports: ['visual-instructions'], supportInstructions: 'Use pictures.' }, 'support', 'adapt_for_learners')
    const accepted = resolveOperation(receiveChangeSet(draft, set, time), 'set-support', 'operation-support', 'accept', later)
    expect(accepted.adaptations.noAdditionalAdaptation).toBe(false)
    expect(accepted.adaptations.extensions).toEqual([])
    expect(accepted.adaptations.extensionInstructions).toBe('')
  })

  it('reject and supersede preserve the teacher-only explicit decline', () => {
    const draft = { ...populatedDraft(), adaptations: { ...populatedDraft().adaptations, noAdditionalAdaptation: true } }
    const set = proposal(draft, 'extension-challenge', { extensions: ['loop-challenge'], extensionInstructions: 'Add a loop.' }, 'extension', 'adapt_for_learners')
    const received = receiveChangeSet(draft, set, time)
    expect(resolveOperation(received, 'set-extension', 'operation-extension', 'reject', later).adaptations.noAdditionalAdaptation).toBe(true)
    expect(resolveOperation(received, 'set-extension', 'operation-extension', 'supersede', later).adaptations.noAdditionalAdaptation).toBe(true)
  })

  it('retains only the newest twenty resolved sets and never prepares outputs', () => {
    let draft = populatedDraft()
    for (let index = 0; index < 21; index += 1) {
      const proposed = `Intention ${index}`
      const set = proposal(draft, 'learning-intention', proposed, String(index))
      draft = resolveOperation(receiveChangeSet(draft, set, time), `set-${index}`, `operation-${index}`, 'accept', later)
    }
    expect(draft.changeHistory).toHaveLength(20)
    expect(draft.changeHistory[0].changeSetId).toBe('set-1')
    expect(draft.changeHistory[19].changeSetId).toBe('set-20')
    expect(draft.validation.preparedOutputs).toEqual([])
  })
})
