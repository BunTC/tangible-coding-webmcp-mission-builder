import { describe, expect, it } from 'vitest'
import { goldenPathClassContext, goldenPathResources } from './lesson-factories'
import { adaptationPlanSchema, classContextSchema, resourceInventorySchema } from './lesson-schemas'

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
