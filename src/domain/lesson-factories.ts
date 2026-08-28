import type { ClassContext, LessonDraft, ResourceInventory } from './lesson-schemas'

export const cleanClassContext: ClassContext = {
  stage: 'P4',
  classSize: 24,
  durationMinutes: 45,
  learningFocus: ['debugging'],
  subjectContext: 'literacy',
  teacherConfidence: 'beginner',
  goal: '',
}

export const cleanResources: ResourceInventory = {
  robots: 0,
  tileSets: 0,
  activityMats: 0,
  instructionCardPacks: 0,
  roleCards: 0,
  allowTileOnlyGroups: true,
}

export const goldenPathClassContext: ClassContext = {
  ...cleanClassContext,
  goal: 'Create a storytelling mission focused on debugging.',
}

export const goldenPathResources: ResourceInventory = {
  robots: 3,
  tileSets: 9,
  activityMats: 3,
  instructionCardPacks: 3,
  roleCards: 24,
  allowTileOnlyGroups: true,
}

export function calculateGrouping(
  classContext: ClassContext,
  resources: ResourceInventory,
): LessonDraft['groupingPlan'] {
  const requiredGroups = classContext.classSize <= 0
    ? 0
    : Math.ceil(classContext.classSize / 8)
  const baseStationCapacity = Math.min(
    Math.floor(resources.tileSets / 3),
    resources.instructionCardPacks,
  )
  const robotStationCapacity = Math.min(
    resources.robots,
    resources.activityMats,
    baseStationCapacity,
  )
  const simultaneousCapacity = resources.allowTileOnlyGroups
    ? baseStationCapacity
    : robotStationCapacity
  const pupilsPerGroup = requiredGroups > 0
    ? Math.ceil(classContext.classSize / requiredGroups)
    : 0
  const rotationRequired = simultaneousCapacity > 0 && requiredGroups > simultaneousCapacity
  const blocking = requiredGroups > 0 && simultaneousCapacity === 0
  const warnings: string[] = []

  if (blocking && resources.robots === 0 && !resources.allowTileOnlyGroups) {
    warnings.push('Blocking: Add at least one robot or enable tile-only groups without a robot.')
  } else if (blocking) {
    warnings.push('Blocking: No usable group station is available. Each basic station needs 3 tile sets and 1 instruction-card pack.')
  }

  return {
    recommendedGroups: requiredGroups,
    pupilsPerGroup,
    simultaneousCapacity,
    rotationRequired,
    participationRoute: requiredGroups > 0 && !blocking
      ? `${requiredGroups} groups of up to ${pupilsPerGroup} pupils.${rotationRequired ? ` ${simultaneousCapacity} groups operate at once; groups rotate through the available stations.` : ''}`
      : '',
    warnings,
  }
}

export function createCleanDraft(now = new Date().toISOString()): LessonDraft {
  const classContext = { ...cleanClassContext, learningFocus: [...cleanClassContext.learningFocus] }
  const resources = { ...cleanResources }

  return {
    id: `fictional-draft-${now}`,
    title: 'Untitled mission',
    status: 'draft',
    classContext,
    resources,
    groupingPlan: calculateGrouping(classContext, resources),
    mission: {
      title: '', theme: '', challengeLevel: null, learningIntention: '', successCriteria: [],
      missionStory: '', plan: '', buildAndExplain: '', testAndDebug: '',
      reflectAndImprove: '', assessmentEvidence: [],
    },
    adaptations: {
      supports: [], extensions: [], supportInstructions: '', extensionInstructions: '', sectionsToUpdate: [],
    },
    validation: { readiness: 'blocked', score: 0, checks: [], preparedOutputs: [] },
    pendingChanges: [],
    activityLog: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function createGoldenPathDraft(now = new Date().toISOString()): LessonDraft {
  const draft = createCleanDraft(now)
  const classContext = { ...goldenPathClassContext, learningFocus: [...goldenPathClassContext.learningFocus] }
  const resources = { ...goldenPathResources }

  return {
    ...draft,
    title: 'The Lost Story Path',
    classContext,
    resources,
    groupingPlan: calculateGrouping(classContext, resources),
  }
}
