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
  planDurationMinutes: z.number().int().positive().nullable().default(null),
  buildAndExplain: z.string().max(500),
  buildAndExplainDurationMinutes: z.number().int().positive().nullable().default(null),
  testAndDebug: z.string().max(500),
  testAndDebugDurationMinutes: z.number().int().positive().nullable().default(null),
  reflectAndImprove: z.string().max(500),
  reflectAndImproveDurationMinutes: z.number().int().positive().nullable().default(null),
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
  section: z.string().min(1),
  suggestedFix: z.string().default(''),
})

export const validationResultSchema = z.object({
  readiness: z.enum(['blocked', 'warning', 'ready']),
  score: z.number().int().min(0),
  checks: z.array(validationCheckSchema),
  preparedOutputs: z.array(z.enum(['teacher-guide', 'mission-card', 'observation-checklist'])).max(0),
  acknowledgedWarningIds: z.array(z.string()).default([]),
})

export const approvedToolNameSchema = z.enum([
  'set_class_context',
  'select_tangible_resources',
  'build_tangible_mission',
  'adapt_for_learners',
  'validate_and_prepare_lesson',
])

export const lessonSectionSchema = z.enum([
  'class-context', 'tangible-resources', 'lesson-identity', 'learning-intention',
  'success-criteria', 'mission-story', 'plan', 'build-and-explain',
  'test-and-debug', 'reflect-and-improve', 'assessment-evidence',
  'learner-support', 'extension-challenge',
])

export const toolSectionAllowlists = {
  set_class_context: ['class-context'],
  select_tangible_resources: ['tangible-resources'],
  build_tangible_mission: ['lesson-identity', 'learning-intention', 'success-criteria', 'mission-story', 'plan', 'build-and-explain', 'test-and-debug', 'reflect-and-improve', 'assessment-evidence'],
  adapt_for_learners: ['plan', 'build-and-explain', 'test-and-debug', 'reflect-and-improve', 'learner-support', 'extension-challenge'],
  validate_and_prepare_lesson: [],
} as const satisfies Record<z.infer<typeof approvedToolNameSchema>, readonly z.infer<typeof lessonSectionSchema>[]>

export const operationStatusSchema = z.enum(['pending', 'accepted', 'rejected', 'superseded'])
const operationValidationSchema = z.object({ valid: z.boolean(), messages: z.array(z.string().min(1)) }).strict()
const resolutionSchema = z.object({
  outcome: z.enum(['accepted', 'rejected', 'superseded']),
  decidedAt: z.iso.datetime(),
  teacherModified: z.boolean(),
}).strict()
const identitySchema = missionContentSchema.pick({ title: true, theme: true, challengeLevel: true }).strict()
const cycleSectionSchema = z.object({ content: z.string().max(500), durationMinutes: z.number().int().positive().nullable() }).strict()
const learnerSupportSectionSchema = adaptationPlanSchema.pick({ supports: true, supportInstructions: true }).strict()
const extensionChallengeSectionSchema = adaptationPlanSchema.pick({ extensions: true, extensionInstructions: true }).strict()

const operationFor = <T extends string, S extends z.ZodType>(section: T, valueSchema: S) => z.object({
  operationId: z.string().min(1),
  section: z.literal(section),
  before: valueSchema,
  proposed: valueSchema,
  acceptedValue: valueSchema.optional(),
  status: operationStatusSchema,
  validation: operationValidationSchema,
  resolution: resolutionSchema.optional(),
}).strict().superRefine((operation, context) => {
  if (operation.status === 'pending' && operation.resolution) context.addIssue({ code: 'custom', path: ['resolution'], message: 'Pending operations cannot have a resolution.' })
  if (operation.status !== 'pending' && !operation.resolution) context.addIssue({ code: 'custom', path: ['resolution'], message: 'Resolved operations require a resolution.' })
  if (operation.status !== 'accepted' && operation.acceptedValue !== undefined) context.addIssue({ code: 'custom', path: ['acceptedValue'], message: 'Only accepted operations may record an accepted value.' })
  if (operation.status === 'accepted' && operation.acceptedValue === undefined) context.addIssue({ code: 'custom', path: ['acceptedValue'], message: 'Accepted operations require an accepted value.' })
  if (operation.resolution && operation.resolution.outcome !== operation.status) context.addIssue({ code: 'custom', path: ['resolution', 'outcome'], message: 'Resolution outcome must match operation status.' })
  if (operation.resolution?.teacherModified && operation.status !== 'accepted') context.addIssue({ code: 'custom', path: ['resolution', 'teacherModified'], message: 'Only accepted operations may be teacher modified.' })
})

export const changeOperationSchema = z.discriminatedUnion('section', [
  operationFor('class-context', classContextSchema),
  operationFor('tangible-resources', resourceInventorySchema),
  operationFor('lesson-identity', identitySchema),
  operationFor('learning-intention', z.string().max(240)),
  operationFor('success-criteria', z.array(z.string().max(180)).max(4)),
  operationFor('mission-story', z.string().max(700)),
  operationFor('plan', cycleSectionSchema),
  operationFor('build-and-explain', cycleSectionSchema),
  operationFor('test-and-debug', cycleSectionSchema),
  operationFor('reflect-and-improve', cycleSectionSchema),
  operationFor('assessment-evidence', z.array(z.string().max(180)).max(5)),
  operationFor('learner-support', learnerSupportSectionSchema),
  operationFor('extension-challenge', extensionChallengeSectionSchema),
])

export const changeSetSchema = z.object({
  changeSetId: z.string().min(1),
  source: z.literal('webmcp-agent'),
  toolName: approvedToolNameSchema,
  operations: z.array(changeOperationSchema).min(1),
  createdAt: z.iso.datetime(),
  resolvedAt: z.iso.datetime().optional(),
}).strict().superRefine((set, context) => {
  const ids = set.operations.map(({ operationId }) => operationId)
  if (new Set(ids).size !== ids.length) context.addIssue({ code: 'custom', path: ['operations'], message: 'Operation IDs must be unique.' })
  const sections = set.operations.map(({ section }) => section)
  if (new Set(sections).size !== sections.length) context.addIssue({ code: 'custom', path: ['operations'], message: 'A change set may contain only one operation per section.' })
  const hasPending = set.operations.some(({ status }) => status === 'pending')
  if (hasPending && set.resolvedAt) context.addIssue({ code: 'custom', path: ['resolvedAt'], message: 'Unresolved sets cannot have a resolution timestamp.' })
  if (!hasPending && !set.resolvedAt) context.addIssue({ code: 'custom', path: ['resolvedAt'], message: 'Resolved sets require a resolution timestamp.' })
  const allowed = toolSectionAllowlists[set.toolName] as readonly string[]
  set.operations.forEach((operation, index) => {
    if (!allowed.includes(operation.section)) context.addIssue({ code: 'custom', path: ['operations', index, 'section'], message: `${set.toolName} cannot propose ${operation.section}.` })
    if (operation.resolution && Date.parse(operation.resolution.decidedAt) < Date.parse(set.createdAt)) context.addIssue({ code: 'custom', path: ['operations', index, 'resolution', 'decidedAt'], message: 'A decision cannot predate proposal creation.' })
    if (set.resolvedAt && operation.resolution && Date.parse(operation.resolution.decidedAt) > Date.parse(set.resolvedAt)) context.addIssue({ code: 'custom', path: ['resolvedAt'], message: 'A set cannot resolve before its operation decisions.' })
  })
  if (set.resolvedAt && Date.parse(set.resolvedAt) < Date.parse(set.createdAt)) context.addIssue({ code: 'custom', path: ['resolvedAt'], message: 'A set cannot resolve before proposal creation.' })
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
  pendingChanges: z.array(changeSetSchema).default([]),
  changeHistory: z.array(changeSetSchema).max(20).default([]),
  activityLog: z.array(activityEventSchema),
  approvedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).superRefine((draft, context) => {
  draft.pendingChanges.forEach((set, index) => {
    if (!set.operations.some(({ status }) => status === 'pending')) context.addIssue({ code: 'custom', path: ['pendingChanges', index], message: 'Pending changes must contain an unresolved operation.' })
  })
  if (draft.pendingChanges.length > 0 && draft.status !== 'needs-review') context.addIssue({ code: 'custom', path: ['status'], message: 'A draft with unresolved proposals must need review.' })
  if (draft.pendingChanges.length > 0 && draft.approvedAt) context.addIssue({ code: 'custom', path: ['approvedAt'], message: 'Unresolved proposals cannot coexist with teacher approval.' })
  draft.changeHistory.forEach((set, index) => {
    if (set.operations.some(({ status }) => status === 'pending')) context.addIssue({ code: 'custom', path: ['changeHistory', index], message: 'Resolved history cannot contain pending operations.' })
  })
  const ids = [...draft.pendingChanges, ...draft.changeHistory].flatMap((set) => [set.changeSetId, ...set.operations.map(({ operationId }) => operationId)])
  if (new Set(ids).size !== ids.length) context.addIssue({ code: 'custom', path: ['pendingChanges'], message: 'Change-set and operation IDs must be unique across proposal state.' })
})

export type LessonDraft = z.infer<typeof lessonDraftSchema>
export type ClassContext = z.infer<typeof classContextSchema>
export type ResourceInventory = z.infer<typeof resourceInventorySchema>
export type GroupingPlan = z.infer<typeof groupingPlanSchema>
export type MissionContent = z.infer<typeof missionContentSchema>
export type AdaptationPlan = z.infer<typeof adaptationPlanSchema>
export type ValidationResult = z.infer<typeof validationResultSchema>
export type ChangeSet = z.infer<typeof changeSetSchema>
export type ChangeOperation = z.infer<typeof changeOperationSchema>
export type ApprovedToolName = z.infer<typeof approvedToolNameSchema>
export type LessonSection = z.infer<typeof lessonSectionSchema>
export type ActivityEvent = z.infer<typeof activityEventSchema>
