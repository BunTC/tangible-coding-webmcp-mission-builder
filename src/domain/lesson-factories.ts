import type { ClassContext, LessonDraft, MissionContent, ResourceInventory } from './lesson-schemas'

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

export const lostStoryPathMission: MissionContent = {
  title: 'The Lost Story Path',
  theme: 'Storytelling and debugging a mixed-up journey',
  challengeLevel: 'core',
  learningIntention: 'We are learning to test a story sequence, spot a mistake and improve the instructions.',
  successCriteria: [
    'I can arrange instructions in a clear story order.',
    'I can test the route and identify where it goes wrong.',
    'I can explain one change that fixes the route.',
  ],
  missionStory: 'The story character has lost the path through the tale. Build a tile route that visits the story places in order, then test it with a robot or a tile-only walkthrough. A mixed-up instruction is hiding in the route: find it, explain it and repair the story path.',
  plan: 'In groups of up to eight, choose the story places, put them in order and agree the route the character should follow. Give each pupil a turn to suggest or check an instruction.',
  planDurationMinutes: 10,
  buildAndExplain: 'Build the route with three tile sets at each station. One pupil points to each instruction while another explains what the character should do. Swap roles before testing.',
  buildAndExplainDurationMinutes: 15,
  testAndDebug: 'Run the robot or trace the tile-only route one instruction at a time. Pause when the route no longer matches the story, name the faulty instruction, replace it and test again.',
  testAndDebugDurationMinutes: 15,
  reflectAndImprove: 'Show the repaired route. Each group explains the bug, the change they made and one way the new sequence improves the story journey.',
  reflectAndImproveDurationMinutes: 5,
  assessmentEvidence: [
    'The group orders instructions to match the planned story.',
    'Pupils identify the faulty instruction during testing.',
    'Pupils explain how their change repairs the route.',
  ],
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
      missionStory: '', plan: '', planDurationMinutes: null, buildAndExplain: '', buildAndExplainDurationMinutes: null,
      testAndDebug: '', testAndDebugDurationMinutes: null, reflectAndImprove: '', reflectAndImproveDurationMinutes: null, assessmentEvidence: [],
    },
    adaptations: {
      supports: [], extensions: [], supportInstructions: '', extensionInstructions: '', sectionsToUpdate: [], noAdditionalAdaptation: false,
    },
    validation: { readiness: 'blocked', score: 0, checks: [], preparedOutputs: [], acknowledgedWarningIds: [] },
    pendingChanges: [],
    changeHistory: [],
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
    classContext,
    resources,
    groupingPlan: calculateGrouping(classContext, resources),
  }
}
