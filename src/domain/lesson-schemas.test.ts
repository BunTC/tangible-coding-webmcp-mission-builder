import { describe, expect, it } from 'vitest'
import { createGoldenPathDraft, goldenPathClassContext, goldenPathResources, lostStoryPathMission } from './lesson-factories'
import { adaptationPlanSchema, approvedToolNameSchema, changeSetSchema, classContextSchema, lessonDraftSchema, lessonSectionSchema, missionContentSchema, resourceInventorySchema, validationCheckSchema } from './lesson-schemas'

describe('manual context schemas', () => {
  it('accepts the canonical P4 class and resource context', () => {
    expect(classContextSchema.safeParse(goldenPathClassContext).success).toBe(true)
    expect(resourceInventorySchema.safeParse(goldenPathResources).success).toBe(true)
  })

  it.each([
    ['stage', { ...goldenPathClassContext, stage: 'S1' }],
    ['class size', { ...goldenPathClassContext, classSize: 0 }],
    ['duration', { ...goldenPathClassContext, durationMinutes: 50 }],
  ])('rejects invalid %s', (_label, context) => {
    expect(classContextSchema.safeParse(context).success).toBe(false)
  })

  it.each(['robots', 'tileSets', 'activityMats', 'instructionCardPacks'] as const)('rejects a negative %s count', (resource) => {
    expect(resourceInventorySchema.safeParse({ ...goldenPathResources, [resource]: -1 }).success).toBe(false)
  })
})

describe('manual learner adaptation schema', () => {
  const adaptation = {
    supports: ['reduced-reading'] as const,
    extensions: ['loop-challenge'] as const,
    supportInstructions: '',
    extensionInstructions: '',
    sectionsToUpdate: [],
    noAdditionalAdaptation: false,
  }

  it('accepts both instruction fields at the 500-character boundary', () => {
    expect(adaptationPlanSchema.safeParse({ ...adaptation, supports: [...adaptation.supports], extensions: [...adaptation.extensions], supportInstructions: 's'.repeat(500), extensionInstructions: 'e'.repeat(500) }).success).toBe(true)
  })

  it.each(['supportInstructions', 'extensionInstructions'] as const)('rejects %s over 500 characters', (field) => {
    expect(adaptationPlanSchema.safeParse({ ...adaptation, supports: [...adaptation.supports], extensions: [...adaptation.extensions], [field]: 'x'.repeat(501) }).success).toBe(false)
  })

  it('rejects unknown support and extension values', () => {
    expect(adaptationPlanSchema.safeParse({ ...adaptation, supports: ['pupil-diagnosis'], extensions: [] }).success).toBe(false)
    expect(adaptationPlanSchema.safeParse({ ...adaptation, supports: [], extensions: ['unapproved-extension'] }).success).toBe(false)
  })

  it('defaults the decline state for drafts created before the field existed', () => {
    const { noAdditionalAdaptation: _omitted, ...legacyAdaptation } = adaptation
    expect(_omitted).toBe(false)
    expect(adaptationPlanSchema.parse({ ...legacyAdaptation, supports: [...legacyAdaptation.supports], extensions: [...legacyAdaptation.extensions] }).noAdditionalAdaptation).toBe(false)
  })
})

describe('learning-cycle duration schema', () => {
  it('accepts positive whole-minute durations', () => {
    expect(missionContentSchema.safeParse(lostStoryPathMission).success).toBe(true)
  })

  it.each([0, -1, 1.5])('rejects an invalid stage duration: %s', (value) => {
    expect(missionContentSchema.safeParse({ ...lostStoryPathMission, planDurationMinutes: value }).success).toBe(false)
  })

  it('defaults missing legacy stage durations to null', () => {
    const legacy = { ...lostStoryPathMission } as Record<string, unknown>
    delete legacy.planDurationMinutes
    delete legacy.buildAndExplainDurationMinutes
    delete legacy.testAndDebugDurationMinutes
    delete legacy.reflectAndImproveDurationMinutes
    expect(missionContentSchema.parse(legacy)).toMatchObject({
      planDurationMinutes: null, buildAndExplainDurationMinutes: null,
      testAndDebugDurationMinutes: null, reflectAndImproveDurationMinutes: null,
    })
  })
})

describe('validation check schema', () => {
  it('requires a non-empty affected section reference', () => {
    const check = { id: 'VAL-01', severity: 'error', message: 'Fix this.', suggestedFix: 'Update the field.' }
    expect(validationCheckSchema.safeParse(check).success).toBe(false)
    expect(validationCheckSchema.safeParse({ ...check, section: '' }).success).toBe(false)
    expect(validationCheckSchema.safeParse({ ...check, section: 'classContext' }).success).toBe(true)
  })
})

describe('transport-independent change schemas', () => {
  const operation = {
    operationId: 'operation-1', section: 'learning-intention' as const,
    before: 'Before', proposed: 'After', status: 'pending' as const,
    validation: { valid: true, messages: [] },
  }
  const set = { changeSetId: 'set-1', source: 'webmcp-agent' as const, toolName: 'build_tangible_mission' as const, operations: [operation], createdAt: '2026-08-28T12:00:00.000Z' }

  it('strictly validates a pending section-level change set', () => {
    expect(changeSetSchema.safeParse(set).success).toBe(true)
    expect(changeSetSchema.safeParse({ ...set, status: 'pending' }).success).toBe(false)
  })

  it('requires lifecycle metadata for resolved operations', () => {
    expect(changeSetSchema.safeParse({ ...set, operations: [{ ...operation, status: 'rejected' }], resolvedAt: '2026-08-28T12:05:00.000Z' }).success).toBe(false)
    expect(changeSetSchema.safeParse({ ...set, operations: [{ ...operation, status: 'rejected', resolution: { outcome: 'rejected', decidedAt: '2026-08-28T12:05:00.000Z', teacherModified: false } }], resolvedAt: '2026-08-28T12:05:00.000Z' }).success).toBe(true)
  })

  it('rejects a sixth tool, unknown section and noAdditionalAdaptation payload', () => {
    expect(approvedToolNameSchema.safeParse('approve_lesson').success).toBe(false)
    expect(lessonSectionSchema.safeParse('no-additional-adaptation').success).toBe(false)
    expect(changeSetSchema.safeParse({ ...set, operations: [{ ...operation, section: 'learner-support', before: { supports: [], supportInstructions: '' }, proposed: { supports: [], supportInstructions: '', noAdditionalAdaptation: true } }] }).success).toBe(false)
  })

  it('rejects empty identities, duplicate operations, duplicate sections and invalid lifecycle status', () => {
    expect(changeSetSchema.safeParse({ ...set, changeSetId: '' }).success).toBe(false)
    expect(changeSetSchema.safeParse({ ...set, operations: [{ ...operation, operationId: '' }] }).success).toBe(false)
    expect(changeSetSchema.safeParse({ ...set, operations: [operation, operation] }).success).toBe(false)
    expect(changeSetSchema.safeParse({ ...set, operations: [operation, { ...operation, operationId: 'operation-2' }] }).success).toBe(false)
    expect(changeSetSchema.safeParse({ ...set, operations: [{ ...operation, status: 'reviewed' }] }).success).toBe(false)
  })

  it('rejects tool-section violations and invalid resolution metadata or chronology', () => {
    expect(changeSetSchema.safeParse({ ...set, toolName: 'set_class_context' }).success).toBe(false)
    expect(changeSetSchema.safeParse({ ...set, createdAt: 'not-a-timestamp' }).success).toBe(false)
    const accepted = {
      ...operation,
      status: 'accepted', acceptedValue: 'After',
      resolution: { outcome: 'accepted', decidedAt: '2026-08-28T12:05:00.000Z', teacherModified: false },
    }
    expect(changeSetSchema.safeParse({ ...set, operations: [{ ...accepted, resolution: { ...accepted.resolution, outcome: 'rejected' } }], resolvedAt: '2026-08-28T12:05:00.000Z' }).success).toBe(false)
    expect(changeSetSchema.safeParse({ ...set, operations: [{ ...accepted, resolution: { ...accepted.resolution, decidedAt: '2026-08-28T11:59:00.000Z' } }], resolvedAt: '2026-08-28T12:05:00.000Z' }).success).toBe(false)
    expect(changeSetSchema.safeParse({ ...set, operations: [accepted], resolvedAt: '2026-08-28T12:04:00.000Z' }).success).toBe(false)
  })

  it('strictly separates pending and resolved collections and enforces global identity uniqueness', () => {
    const draft = createGoldenPathDraft('2026-08-28T10:00:00.000Z')
    const pending = changeSetSchema.parse(set)
    const resolved = changeSetSchema.parse({ ...set, changeSetId: 'resolved-set', operations: [{ ...operation, operationId: 'resolved-operation', status: 'rejected', resolution: { outcome: 'rejected', decidedAt: '2026-08-28T12:05:00.000Z', teacherModified: false } }], resolvedAt: '2026-08-28T12:05:00.000Z' })
    expect(lessonDraftSchema.safeParse({ ...draft, status: 'needs-review', pendingChanges: [resolved] }).success).toBe(false)
    expect(lessonDraftSchema.safeParse({ ...draft, changeHistory: [pending] }).success).toBe(false)
    expect(lessonDraftSchema.safeParse({ ...draft, status: 'needs-review', pendingChanges: [pending], changeHistory: [{ ...resolved, changeSetId: pending.changeSetId }] }).success).toBe(false)
    expect(lessonDraftSchema.safeParse({ ...draft, status: 'needs-review', pendingChanges: [pending], changeHistory: [{ ...resolved, operations: [{ ...resolved.operations[0], operationId: pending.operations[0].operationId }] }] }).success).toBe(false)
    expect(lessonDraftSchema.safeParse({ ...draft, status: 'approved', approvedAt: '2026-08-28T13:00:00.000Z', pendingChanges: [pending] }).success).toBe(false)
    expect(changeSetSchema.safeParse({ ...set, approvedAt: '2026-08-28T13:00:00.000Z' }).success).toBe(false)
  })

  it('rejects non-empty prepared outputs and history beyond the bounded twenty sets', () => {
    const draft = createGoldenPathDraft('2026-08-28T10:00:00.000Z')
    expect(lessonDraftSchema.safeParse({ ...draft, validation: { ...draft.validation, preparedOutputs: ['teacher-guide'] } }).success).toBe(false)
    const history = Array.from({ length: 21 }, (_, index) => changeSetSchema.parse({
      ...set, changeSetId: `history-${index}`, operations: [{ ...operation, operationId: `history-operation-${index}`, status: 'rejected', resolution: { outcome: 'rejected', decidedAt: '2026-08-28T12:05:00.000Z', teacherModified: false } }], resolvedAt: '2026-08-28T12:05:00.000Z',
    }))
    expect(lessonDraftSchema.safeParse({ ...draft, changeHistory: history }).success).toBe(false)
  })
})
