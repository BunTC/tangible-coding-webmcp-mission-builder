import { describe, expect, it } from 'vitest'
import { calculateGrouping, goldenPathClassContext, goldenPathResources } from './lesson-factories'

describe('resource-aware grouping', () => {
  it('gives the P4 demo three groups, capacity three and no rotation', () => {
    expect(calculateGrouping(goldenPathClassContext, goldenPathResources)).toMatchObject({
      recommendedGroups: 3,
      pupilsPerGroup: 8,
      simultaneousCapacity: 3,
      rotationRequired: false,
      participationRoute: '3 groups of up to 8 pupils.',
      warnings: [],
    })
  })

  it('does not rotate with fewer robots when tile-only capacity covers every group', () => {
    const plan = calculateGrouping(goldenPathClassContext, {
      ...goldenPathResources,
      robots: 2,
    })

    expect(plan.simultaneousCapacity).toBe(3)
    expect(plan.rotationRequired).toBe(false)
  })

  it('requires rotation for the same resources when tile-only groups are disabled', () => {
    const plan = calculateGrouping(goldenPathClassContext, {
      ...goldenPathResources,
      robots: 2,
      allowTileOnlyGroups: false,
    })

    expect(plan.simultaneousCapacity).toBe(2)
    expect(plan.rotationRequired).toBe(true)
    expect(plan.participationRoute).toContain('2 groups operate at once; groups rotate through the available stations.')
  })

  it('blocks zero robots when tile-only groups are disabled', () => {
    const plan = calculateGrouping(goldenPathClassContext, {
      ...goldenPathResources,
      robots: 0,
      allowTileOnlyGroups: false,
    })

    expect(plan.simultaneousCapacity).toBe(0)
    expect(plan.warnings).toContain('Blocking: Add at least one robot or enable tile-only groups without a robot.')
  })

  it('blocks when no complete basic station is available', () => {
    const plan = calculateGrouping(goldenPathClassContext, {
      ...goldenPathResources,
      tileSets: 2,
    })

    expect(plan.simultaneousCapacity).toBe(0)
    expect(plan.warnings).toContain('Blocking: No usable group station is available. Each basic station needs 3 tile sets and 1 instruction-card pack.')
  })

  it('never creates more than one required group for one pupil', () => {
    const plan = calculateGrouping({ ...goldenPathClassContext, classSize: 1 }, goldenPathResources)
    expect(plan.recommendedGroups).toBe(1)
    expect(plan.pupilsPerGroup).toBe(1)
  })

  it('creates zero required groups for zero pupils', () => {
    const plan = calculateGrouping({ ...goldenPathClassContext, classSize: 0 }, goldenPathResources)
    expect(plan.recommendedGroups).toBe(0)
    expect(plan.pupilsPerGroup).toBe(0)
    expect(plan.rotationRequired).toBe(false)
    expect(plan.warnings).toEqual([])
  })

  it.each([
    ['tile sets', { tileSets: 6, instructionCardPacks: 3 }, 2],
    ['instruction packs', { tileSets: 9, instructionCardPacks: 1 }, 1],
  ])('reduces simultaneous capacity when %s are insufficient', (_label, patch, expectedCapacity) => {
    const plan = calculateGrouping(goldenPathClassContext, {
      ...goldenPathResources,
      ...patch,
    })
    expect(plan.simultaneousCapacity).toBe(expectedCapacity)
    expect(plan.rotationRequired).toBe(true)
  })
})
