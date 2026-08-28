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
  const recommendedGroups = Math.max(resources.robots, resources.activityMats)
  const pupilsPerGroup = recommendedGroups > 0
    ? Math.ceil(classContext.classSize / recommendedGroups)
    : 0
  const warnings = recommendedGroups === 0
    ? ['Select at least one robot or activity mat to calculate groups.']
    : []

  return {
    recommendedGroups,
    pupilsPerGroup,
    rotationRequired: recommendedGroups > 0 && resources.robots < recommendedGroups,
    participationRoute: recommendedGroups > 0
      ? `${recommendedGroups} groups of up to ${pupilsPerGroup} pupils.`
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
