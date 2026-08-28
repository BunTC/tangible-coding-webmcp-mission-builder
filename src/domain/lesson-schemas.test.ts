import { describe, expect, it } from 'vitest'
import { goldenPathClassContext, goldenPathResources, lostStoryPathMission } from './lesson-factories'
import { adaptationPlanSchema, classContextSchema, missionContentSchema, resourceInventorySchema, validationCheckSchema } from './lesson-schemas'

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
