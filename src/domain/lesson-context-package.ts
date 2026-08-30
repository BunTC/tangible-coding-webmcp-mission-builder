import { z } from 'zod'
import { calculateGrouping, createCleanDraft } from './lesson-factories'
import { containsObviousPersonalData } from './lesson-validation'
import {
  adaptationPlanSchema,
  classContextSchema,
  missionContentSchema,
  resourceInventorySchema,
  type LessonDraft,
} from './lesson-schemas'

export const TEACHER_CONTEXT_FORMAT = 'tangible-coding-teacher-context' as const
export const TEACHER_CONTEXT_VERSION = 1 as const
export const MAX_TEACHER_CONTEXT_CHARACTERS = 20_000
export const MAX_TEACHER_CONTEXT_DEPTH = 6

const uniqueArray = <T>(schema: z.ZodType<T>) => z.array(schema).refine((values) => new Set(values).size === values.length, 'Selections must be unique.')

const strictClassContextSchema = classContextSchema.extend({
  learningFocus: uniqueArray(classContextSchema.shape.learningFocus.element),
}).strict()
const strictResourceInventorySchema = resourceInventorySchema.strict()
const explicitNullablePositiveMinutes = z.number().int().positive().nullable()
const strictMissionContentSchema = z.object({
  title: missionContentSchema.shape.title,
  theme: missionContentSchema.shape.theme,
  challengeLevel: missionContentSchema.shape.challengeLevel,
  learningIntention: missionContentSchema.shape.learningIntention,
  successCriteria: missionContentSchema.shape.successCriteria,
  missionStory: missionContentSchema.shape.missionStory,
  plan: missionContentSchema.shape.plan,
  planDurationMinutes: explicitNullablePositiveMinutes,
  buildAndExplain: missionContentSchema.shape.buildAndExplain,
  buildAndExplainDurationMinutes: explicitNullablePositiveMinutes,
  testAndDebug: missionContentSchema.shape.testAndDebug,
  testAndDebugDurationMinutes: explicitNullablePositiveMinutes,
  reflectAndImprove: missionContentSchema.shape.reflectAndImprove,
  reflectAndImproveDurationMinutes: explicitNullablePositiveMinutes,
  assessmentEvidence: missionContentSchema.shape.assessmentEvidence,
}).strict()
export const acceptedAdaptationContentSchema = z.object({
  supports: uniqueArray(adaptationPlanSchema.shape.supports.element),
  extensions: uniqueArray(adaptationPlanSchema.shape.extensions.element),
  supportInstructions: adaptationPlanSchema.shape.supportInstructions,
  extensionInstructions: adaptationPlanSchema.shape.extensionInstructions,
  noAdditionalAdaptation: z.boolean(),
}).strict()

export const teacherContextContentSchema = z.object({
  classContext: strictClassContextSchema,
  tangibleResources: strictResourceInventorySchema,
  mission: strictMissionContentSchema,
  learnerAdaptations: acceptedAdaptationContentSchema,
}).strict()

export const teacherContextPackageSchema = teacherContextContentSchema.extend({
  format: z.literal(TEACHER_CONTEXT_FORMAT),
  schemaVersion: z.literal(TEACHER_CONTEXT_VERSION),
  contextFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  exportedAt: z.iso.datetime(),
}).strict()

export type TeacherContextContent = z.infer<typeof teacherContextContentSchema>
export type TeacherContextPackage = z.infer<typeof teacherContextPackageSchema>
export type TeacherContextParseResult =
  | { ok: true; package: TeacherContextPackage; draft: LessonDraft }
  | { ok: false; code: 'excessive-size' | 'malformed-json' | 'wrong-version' | 'excessive-depth' | 'invalid-package' | 'fingerprint-mismatch' | 'personal-data'; message: string }

export type JsonStructureValidation = 'valid' | 'non-json' | 'cyclic' | 'excessive-depth'

export function validateJsonStructureAndDepth(value: unknown, maximumDepth = MAX_TEACHER_CONTEXT_DEPTH): JsonStructureValidation {
  const pending: Array<{ value: unknown; depth: number; exiting?: boolean }> = [{ value, depth: 0 }]
  const active = new WeakSet<object>()
  while (pending.length > 0) {
    const current = pending.pop()!
    if (current.exiting) {
      active.delete(current.value as object)
      continue
    }
    if (current.depth > maximumDepth) return 'excessive-depth'
    if (current.value === null || typeof current.value === 'string' || typeof current.value === 'boolean') continue
    if (typeof current.value === 'number') {
      if (!Number.isFinite(current.value)) return 'non-json'
      continue
    }
    if (typeof current.value !== 'object') return 'non-json'
    if (active.has(current.value)) return 'cyclic'
    active.add(current.value)
    pending.push({ ...current, exiting: true })
    if (Array.isArray(current.value)) {
      for (let index = current.value.length - 1; index >= 0; index -= 1) pending.push({ value: current.value[index], depth: current.depth + 1 })
      continue
    }
    const prototype = Object.getPrototypeOf(current.value)
    if (prototype !== Object.prototype && prototype !== null) return 'non-json'
    const values = Object.values(current.value as Record<string, unknown>)
    for (let index = values.length - 1; index >= 0; index -= 1) pending.push({ value: values[index], depth: current.depth + 1 })
  }
  return 'valid'
}

function canonicalContent(content: TeacherContextContent): TeacherContextContent {
  const { classContext, tangibleResources, mission, learnerAdaptations } = content
  return {
    classContext: {
      stage: classContext.stage,
      classSize: classContext.classSize,
      durationMinutes: classContext.durationMinutes,
      learningFocus: [...classContext.learningFocus],
      subjectContext: classContext.subjectContext,
      teacherConfidence: classContext.teacherConfidence,
      ...(classContext.goal === undefined ? {} : { goal: classContext.goal }),
    },
    tangibleResources: {
      robots: tangibleResources.robots,
      tileSets: tangibleResources.tileSets,
      activityMats: tangibleResources.activityMats,
      instructionCardPacks: tangibleResources.instructionCardPacks,
      roleCards: tangibleResources.roleCards,
      allowTileOnlyGroups: tangibleResources.allowTileOnlyGroups,
    },
    mission: {
      title: mission.title,
      theme: mission.theme,
      challengeLevel: mission.challengeLevel,
      learningIntention: mission.learningIntention,
      successCriteria: [...mission.successCriteria],
      missionStory: mission.missionStory,
      plan: mission.plan,
      planDurationMinutes: mission.planDurationMinutes,
      buildAndExplain: mission.buildAndExplain,
      buildAndExplainDurationMinutes: mission.buildAndExplainDurationMinutes,
      testAndDebug: mission.testAndDebug,
      testAndDebugDurationMinutes: mission.testAndDebugDurationMinutes,
      reflectAndImprove: mission.reflectAndImprove,
      reflectAndImproveDurationMinutes: mission.reflectAndImproveDurationMinutes,
      assessmentEvidence: [...mission.assessmentEvidence],
    },
    learnerAdaptations: {
      supports: [...learnerAdaptations.supports],
      extensions: [...learnerAdaptations.extensions],
      supportInstructions: learnerAdaptations.supportInstructions,
      extensionInstructions: learnerAdaptations.extensionInstructions,
      noAdditionalAdaptation: learnerAdaptations.noAdditionalAdaptation,
    },
  }
}

function freeText(content: TeacherContextContent): string[] {
  return [
    content.classContext.goal ?? '', content.mission.title, content.mission.theme,
    content.mission.learningIntention, ...content.mission.successCriteria,
    content.mission.missionStory, content.mission.plan, content.mission.buildAndExplain,
    content.mission.testAndDebug, content.mission.reflectAndImprove,
    ...content.mission.assessmentEvidence, content.learnerAdaptations.supportInstructions,
    content.learnerAdaptations.extensionInstructions,
  ]
}

function containsContextPersonalData(content: TeacherContextContent): boolean {
  const values = freeText(content)
  const labelledExcludedDetail = /\b(?:school(?:\s+name)?|diagnosis|attainment(?:\s+(?:level|record))?)\s*:/i
  return containsObviousPersonalData(values) || labelledExcludedDetail.test(values.join('\n'))
}

export function acceptedContextFromDraft(draft: LessonDraft): TeacherContextContent {
  return teacherContextContentSchema.parse(canonicalContent({
    classContext: draft.classContext,
    tangibleResources: draft.resources,
    mission: draft.mission,
    learnerAdaptations: {
      supports: draft.adaptations.supports,
      extensions: draft.adaptations.extensions,
      supportInstructions: draft.adaptations.supportInstructions,
      extensionInstructions: draft.adaptations.extensionInstructions,
      noAdditionalAdaptation: draft.adaptations.noAdditionalAdaptation,
    },
  }))
}

export async function fingerprintTeacherContext(content: TeacherContextContent): Promise<string> {
  const parsed = teacherContextContentSchema.parse(content)
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalContent(parsed)))
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function createTeacherContextPackage(draft: LessonDraft, exportedAt = new Date().toISOString()): Promise<TeacherContextPackage> {
  const content = acceptedContextFromDraft(draft)
  if (containsContextPersonalData(content)) throw new Error('Accepted lesson context contains an obvious personal-data pattern and cannot be copied.')
  const contextFingerprint = await fingerprintTeacherContext(content)
  const packageValue = teacherContextPackageSchema.parse({
    format: TEACHER_CONTEXT_FORMAT,
    schemaVersion: TEACHER_CONTEXT_VERSION,
    contextFingerprint,
    exportedAt,
    ...content,
  })
  if (JSON.stringify(packageValue).length > MAX_TEACHER_CONTEXT_CHARACTERS) throw new Error(`Accepted context must be ${MAX_TEACHER_CONTEXT_CHARACTERS.toLocaleString()} characters or fewer.`)
  return packageValue
}

export function transientDraftFromContext(packageValue: TeacherContextPackage): LessonDraft {
  const clean = createCleanDraft(packageValue.exportedAt)
  return {
    ...clean,
    title: packageValue.mission.title || 'Untitled mission',
    classContext: packageValue.classContext,
    resources: packageValue.tangibleResources,
    groupingPlan: calculateGrouping(packageValue.classContext, packageValue.tangibleResources),
    mission: packageValue.mission,
    adaptations: { ...packageValue.learnerAdaptations, sectionsToUpdate: [] },
  }
}

export async function parseTeacherContextPackage(serialized: string): Promise<TeacherContextParseResult> {
  if (serialized.length > MAX_TEACHER_CONTEXT_CHARACTERS) return { ok: false, code: 'excessive-size', message: `Teacher context must be ${MAX_TEACHER_CONTEXT_CHARACTERS.toLocaleString()} characters or fewer.` }
  let raw: unknown
  try { raw = JSON.parse(serialized) } catch { return { ok: false, code: 'malformed-json', message: 'Teacher context must be complete valid JSON.' } }
  const structure = validateJsonStructureAndDepth(raw)
  if (structure === 'excessive-depth') return { ok: false, code: 'excessive-depth', message: `Teacher context nesting must not exceed ${MAX_TEACHER_CONTEXT_DEPTH}.` }
  if (structure !== 'valid') return { ok: false, code: 'invalid-package', message: 'Teacher context must contain plain, acyclic JSON values only.' }
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && (raw as Record<string, unknown>).schemaVersion !== TEACHER_CONTEXT_VERSION) return { ok: false, code: 'wrong-version', message: `This application accepts teacher-context version ${TEACHER_CONTEXT_VERSION} only.` }
  const parsed = teacherContextPackageSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, code: 'invalid-package', message: 'Teacher context does not match the strict accepted-context format.' }
  const content = acceptedContextFromPackage(parsed.data)
  if (containsContextPersonalData(content)) return { ok: false, code: 'personal-data', message: 'Teacher context contains an obvious personal-data pattern. Use fictional lesson content only.' }
  const fingerprint = await fingerprintTeacherContext(content)
  if (fingerprint !== parsed.data.contextFingerprint) return { ok: false, code: 'fingerprint-mismatch', message: 'Teacher context fingerprint does not match its accepted lesson content.' }
  return { ok: true, package: parsed.data, draft: transientDraftFromContext(parsed.data) }
}

export function acceptedContextFromPackage(packageValue: TeacherContextPackage): TeacherContextContent {
  return teacherContextContentSchema.parse({
    classContext: packageValue.classContext,
    tangibleResources: packageValue.tangibleResources,
    mission: packageValue.mission,
    learnerAdaptations: packageValue.learnerAdaptations,
  })
}
