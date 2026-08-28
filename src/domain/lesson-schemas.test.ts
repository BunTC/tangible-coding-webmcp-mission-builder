import { describe, expect, it } from 'vitest'
import { goldenPathClassContext, goldenPathResources } from './lesson-factories'
import { classContextSchema, resourceInventorySchema } from './lesson-schemas'

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
