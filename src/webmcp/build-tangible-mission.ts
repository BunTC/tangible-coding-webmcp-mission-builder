import { z } from 'zod'
import { createPendingChangeSet, getSectionValue, type ProposedOperation } from '../domain/lesson-change-control'
import { classContextSchema, resourceInventorySchema, type ChangeSet, type LessonDraft, type LessonSection } from '../domain/lesson-schemas'
import type { ProposalReceiptResult } from '../state/lesson-state'
import type { ExpectedToolErrorCode, ToolFailure } from './set-class-context'
import { isWebMcpInvocationAborted } from './webmcp-execution'

const challengeLevelSchema = z.enum(['introductory', 'core', 'stretch'])
const positiveMinutes = z.number().int().positive()

export const buildTangibleMissionInputSchema = z.object({
  title: z.string().max(100),
  theme: z.string().max(160),
  challengeLevel: challengeLevelSchema,
  learningIntention: z.string().max(240),
  successCriteria: z.array(z.string().max(180)).min(2).max(4),
  missionStory: z.string().max(700),
  plan: z.string().max(500),
  planDurationMinutes: positiveMinutes,
  buildAndExplain: z.string().max(500),
  buildAndExplainDurationMinutes: positiveMinutes,
  testAndDebug: z.string().max(500),
  testAndDebugDurationMinutes: positiveMinutes,
  reflectAndImprove: z.string().max(500),
  reflectAndImproveDurationMinutes: positiveMinutes,
  assessmentEvidence: z.array(z.string().max(180)).min(1).max(5),
}).strict()

const text = (description: string, maxLength: number) => ({ type: 'string', description, maxLength })
const integer = (description: string) => ({ type: 'integer', description, minimum: 1 })
const enumString = (description: string, values: readonly string[]) => ({ type: 'string', description, enum: values })

export const buildTangibleMissionJsonSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    title: text('Mission title.', 100), theme: text('Mission theme.', 160), challengeLevel: enumString('Challenge level.', ['introductory', 'core', 'stretch']),
    learningIntention: text('Learning intention.', 240),
    successCriteria: { type: 'array', description: 'Observable success criteria.', items: text('One success criterion.', 180), minItems: 2, maxItems: 4 },
    missionStory: text('Mission story or problem.', 700), plan: text('Plan stage content.', 500), planDurationMinutes: integer('Plan stage minutes.'),
    buildAndExplain: text('Build and Explain content.', 500), buildAndExplainDurationMinutes: integer('Build and Explain minutes.'),
    testAndDebug: text('Test and Debug content.', 500), testAndDebugDurationMinutes: integer('Test and Debug minutes.'),
    // Canonical schema name; 32 characters deliberately exceed Chrome's approximate, non-normative 30-character recommendation.
    reflectAndImprove: text('Reflect and Improve content.', 500), reflectAndImproveDurationMinutes: integer('Reflect and Improve minutes.'),
    assessmentEvidence: { type: 'array', description: 'Observable assessment evidence.', items: text('One evidence statement.', 180), minItems: 1, maxItems: 5 },
  },
  required: ['title', 'theme', 'challengeLevel', 'learningIntention', 'successCriteria', 'missionStory', 'plan', 'planDurationMinutes', 'buildAndExplain', 'buildAndExplainDurationMinutes', 'testAndDebug', 'testAndDebugDurationMinutes', 'reflectAndImprove', 'reflectAndImproveDurationMinutes', 'assessmentEvidence'],
} as const

export const BUILD_MISSION_SECTION_ORDER = [
  'lesson-identity', 'learning-intention', 'success-criteria', 'mission-story', 'plan',
  'build-and-explain', 'test-and-debug', 'reflect-and-improve', 'assessment-evidence',
] as const satisfies readonly LessonSection[]

type MissionInput = z.infer<typeof buildTangibleMissionInputSchema>
export type BuildTangibleMissionSuccess = {
  ok: true
  tool: 'build_tangible_mission'
  changeSetId: string
  operationIds: string[]
  sections: typeof BUILD_MISSION_SECTION_ORDER
  missionVersion: { title: string; challengeLevel: MissionInput['challengeLevel'] }
  feasibilityWarnings: string[]
  stateChanged: true
}

export interface BuildTangibleMissionDependencies {
  getDraft(): LessonDraft
  receiveChangeSet(changeSet: ChangeSet): ProposalReceiptResult
  createId(): string
  now(): string
}

const failure = (code: ExpectedToolErrorCode, message: string): ToolFailure => ({ ok: false, error: { code, message }, stateChanged: false })

function proposedOperations(draft: LessonDraft, mission: MissionInput): ProposedOperation[] {
  const proposed = {
    'lesson-identity': { title: mission.title, theme: mission.theme, challengeLevel: mission.challengeLevel },
    'learning-intention': mission.learningIntention,
    'success-criteria': mission.successCriteria,
    'mission-story': mission.missionStory,
    plan: { content: mission.plan, durationMinutes: mission.planDurationMinutes },
    'build-and-explain': { content: mission.buildAndExplain, durationMinutes: mission.buildAndExplainDurationMinutes },
    'test-and-debug': { content: mission.testAndDebug, durationMinutes: mission.testAndDebugDurationMinutes },
    'reflect-and-improve': { content: mission.reflectAndImprove, durationMinutes: mission.reflectAndImproveDurationMinutes },
    'assessment-evidence': mission.assessmentEvidence,
  } satisfies Record<(typeof BUILD_MISSION_SECTION_ORDER)[number], unknown>
  return BUILD_MISSION_SECTION_ORDER.map((section) => ({ section, before: getSectionValue(draft, section), proposed: proposed[section] }))
}

export function createBuildTangibleMissionHandler(dependencies: BuildTangibleMissionDependencies) {
  return (input: unknown, context?: WebMcpExecutionContext): BuildTangibleMissionSuccess | ToolFailure => {
    if (isWebMcpInvocationAborted(context)) return failure('aborted', 'The tool call was cancelled before any change was proposed.')
    const parsed = buildTangibleMissionInputSchema.safeParse(input)
    if (!parsed.success) return failure('invalid-input', 'Mission content is invalid. Supply every authorised mission field using the permitted lengths and durations.')
    const draft = dependencies.getDraft()
    if (!classContextSchema.safeParse(draft.classContext).success || !resourceInventorySchema.safeParse(draft.resources).success) {
      return failure('prerequisite-failed', 'Valid accepted class and resource context is required before proposing a mission.')
    }
    const changeSetId = dependencies.createId()
    const operationIds = BUILD_MISSION_SECTION_ORDER.map(() => dependencies.createId())
    let proposal: ChangeSet
    try {
      proposal = createPendingChangeSet(draft, 'build_tangible_mission', proposedOperations(draft, parsed.data), {
        changeSetId, operationIds, createdAt: dependencies.now(),
      })
    } catch (error) {
      if (error instanceof Error && /before value|Duplicate/.test(error.message)) return failure('stale-state', 'The accepted lesson changed before this proposal could be recorded. Try again with the current lesson.')
      throw error
    }
    if (isWebMcpInvocationAborted(context)) return failure('aborted', 'The tool call was cancelled before any change was proposed.')
    const receipt = dependencies.receiveChangeSet(proposal)
    if (!receipt.ok) return failure(receipt.code, receipt.message)
    return {
      ok: true,
      tool: 'build_tangible_mission',
      changeSetId,
      operationIds,
      sections: BUILD_MISSION_SECTION_ORDER,
      missionVersion: { title: parsed.data.title, challengeLevel: parsed.data.challengeLevel },
      feasibilityWarnings: [...draft.groupingPlan.warnings],
      stateChanged: true,
    }
  }
}
