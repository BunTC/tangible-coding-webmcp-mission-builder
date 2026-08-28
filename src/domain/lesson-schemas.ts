import { z } from 'zod'

export const primaryStageSchema = z.enum(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'])
export const durationMinutesSchema = z.union([
  z.literal(30),
  z.literal(45),
  z.literal(60),
  z.literal(90),
])
export const learningFocusSchema = z.enum([
  'sequencing',
  'algorithms',
  'loops',
  'debugging',
  'conditionals',
  'collaboration',
])
export const subjectContextSchema = z.enum(['computing', 'literacy', 'maths', 'STEM', 'IDL'])
export const teacherConfidenceSchema = z.enum(['beginner', 'developing', 'confident'])

export const classContextSchema = z.object({
  stage: primaryStageSchema,
  classSize: z.number().int().min(1).max(40),
  durationMinutes: durationMinutesSchema,
  learningFocus: z.array(learningFocusSchema).min(1),
  subjectContext: subjectContextSchema,
  teacherConfidence: teacherConfidenceSchema,
  goal: z.string().max(280).optional(),
})

export const resourceInventorySchema = z.object({
  robots: z.number().int().min(0).max(12),
  tileSets: z.number().int().min(0).max(30),
  activityMats: z.number().int().min(0).max(12),
  instructionCardPacks: z.number().int().min(0).max(12),
  roleCards: z.number().int().min(0).max(40),
  allowTileOnlyGroups: z.boolean(),
})

export const groupingPlanSchema = z.object({
  recommendedGroups: z.number().int().min(0),
  pupilsPerGroup: z.number().int().min(0),
  simultaneousCapacity: z.number().int().min(0).default(0),
  rotationRequired: z.boolean(),
  participationRoute: z.string().max(500),
  warnings: z.array(z.string().max(280)),
})

export const missionContentSchema = z.object({
  title: z.string().max(100),
  theme: z.string().max(160),
  challengeLevel: z.enum(['introductory', 'core', 'stretch']).nullable(),
  learningIntention: z.string().max(240),
  successCriteria: z.array(z.string().max(180)).max(4),
  missionStory: z.string().max(700),
  plan: z.string().max(500),
  buildAndExplain: z.string().max(500),
  testAndDebug: z.string().max(500),
  reflectAndImprove: z.string().max(500),
  assessmentEvidence: z.array(z.string().max(180)).max(5),
})

export const adaptationPlanSchema = z.object({
  supports: z.array(z.enum([
    'reduced-reading',
    'visual-instructions',
    'fewer-steps',
    'additional-time',
    'paired-explanation',
    'predictable-roles',
  ])),
  extensions: z.array(z.enum([
    'longer-route',
    'extra-debugging-fault',
    'loop-challenge',
    'compare-solutions',
    'design-new-mission',
  ])),
  supportInstructions: z.string().max(500),
  extensionInstructions: z.string().max(500),
  sectionsToUpdate: z.array(z.string()),
  noAdditionalAdaptation: z.boolean().default(false),
})

export const validationCheckSchema = z.object({
  id: z.string(),
  severity: z.enum(['error', 'warning', 'pass']),
  message: z.string(),
  section: z.string().optional(),
})

export const validationResultSchema = z.object({
  readiness: z.enum(['blocked', 'warning', 'ready']),
  score: z.number().int().min(0),
  checks: z.array(validationCheckSchema),
  preparedOutputs: z.array(z.enum(['teacher-guide', 'mission-card', 'observation-checklist'])),
})

export const fieldChangeSchema = z.object({
  field: z.string(),
  before: z.unknown(),
  proposed: z.unknown(),
})

export const changeSetSchema = z.object({
  id: z.string(),
  source: z.enum(['teacher', 'webmcp-agent']),
  toolName: z.string().optional(),
  changes: z.array(fieldChangeSchema),
  status: z.enum(['pending', 'accepted', 'rejected', 'partially-accepted']),
  createdAt: z.string(),
})

export const activityEventSchema = z.object({
  id: z.string(),
  source: z.enum(['teacher', 'webmcp-agent', 'system']),
  message: z.string().max(280),
  createdAt: z.string(),
})

export const lessonDraftSchema = z.object({
  id: z.string(),
  title: z.string().max(100),
  status: z.enum(['draft', 'needs-review', 'ready', 'approved']),
  classContext: classContextSchema,
  resources: resourceInventorySchema,
  groupingPlan: groupingPlanSchema,
  mission: missionContentSchema,
  adaptations: adaptationPlanSchema,
  validation: validationResultSchema,
  pendingChanges: z.array(changeSetSchema),
  activityLog: z.array(activityEventSchema),
  approvedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type LessonDraft = z.infer<typeof lessonDraftSchema>
export type ClassContext = z.infer<typeof classContextSchema>
export type ResourceInventory = z.infer<typeof resourceInventorySchema>
export type GroupingPlan = z.infer<typeof groupingPlanSchema>
export type MissionContent = z.infer<typeof missionContentSchema>
export type AdaptationPlan = z.infer<typeof adaptationPlanSchema>
export type ValidationResult = z.infer<typeof validationResultSchema>
export type ChangeSet = z.infer<typeof changeSetSchema>
export type ActivityEvent = z.infer<typeof activityEventSchema>
