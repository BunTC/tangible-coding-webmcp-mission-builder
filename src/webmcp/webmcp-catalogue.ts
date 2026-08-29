import { toolSectionAllowlists, type ApprovedToolName, type LessonSection } from '../domain/lesson-schemas'
import { selectTangibleResourcesJsonSchema } from './select-tangible-resources'

const text = (description: string, maxLength: number) => ({ type: 'string', description, maxLength })
const integer = (description: string, minimum: number, maximum?: number) => ({ type: 'integer', description, minimum, ...(maximum === undefined ? {} : { maximum }) })
const enumString = (description: string, values: readonly string[]) => ({ type: 'string', description, enum: values })

const classContextInputSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    stage: enumString('Primary stage.', ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']),
    classSize: integer('Number of fictional pupils.', 1, 40),
    durationMinutes: { type: 'integer', description: 'Lesson duration in minutes.', enum: [30, 45, 60, 90] },
    learningFocus: { type: 'array', description: 'Computational-thinking focuses.', items: enumString('One learning focus.', ['sequencing', 'algorithms', 'loops', 'debugging', 'conditionals', 'collaboration']), minItems: 1 },
    subjectContext: enumString('Curriculum subject context.', ['computing', 'literacy', 'maths', 'STEM', 'IDL']),
    teacherConfidence: enumString('Teacher confidence level.', ['beginner', 'developing', 'confident']),
    goal: text('Optional fictional lesson goal.', 280),
  },
  required: ['stage', 'classSize', 'durationMinutes', 'learningFocus', 'subjectContext', 'teacherConfidence'],
} as const

const missionInputSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    title: text('Mission title.', 100), theme: text('Mission theme.', 160), challengeLevel: enumString('Challenge level.', ['introductory', 'core', 'stretch']),
    learningIntention: text('Learning intention.', 240),
    successCriteria: { type: 'array', description: 'Observable success criteria.', items: text('One success criterion.', 180), minItems: 2, maxItems: 4 },
    missionStory: text('Mission story or problem.', 700), plan: text('Plan stage content.', 500), planDurationMinutes: integer('Plan stage minutes.', 1),
    buildAndExplain: text('Build and Explain content.', 500), buildAndExplainDurationMinutes: integer('Build and Explain minutes.', 1),
    testAndDebug: text('Test and Debug content.', 500), testAndDebugDurationMinutes: integer('Test and Debug minutes.', 1),
    // Canonical schema name; 32 characters deliberately exceed Chrome's approximate, non-normative 30-character recommendation.
    reflectAndImprove: text('Reflect and Improve content.', 500), reflectAndImproveDurationMinutes: integer('Reflect and Improve minutes.', 1),
    assessmentEvidence: { type: 'array', description: 'Observable assessment evidence.', items: text('One evidence statement.', 180), minItems: 1, maxItems: 5 },
  },
  required: ['title', 'theme', 'challengeLevel', 'learningIntention', 'successCriteria', 'missionStory', 'plan', 'planDurationMinutes', 'buildAndExplain', 'buildAndExplainDurationMinutes', 'testAndDebug', 'testAndDebugDurationMinutes', 'reflectAndImprove', 'reflectAndImproveDurationMinutes', 'assessmentEvidence'],
} as const

const cycleNames = ['plan', 'build-and-explain', 'test-and-debug', 'reflect-and-improve'] as const
const adaptationInputSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    supports: { type: 'array', description: 'Selected support approaches.', items: enumString('One support approach.', ['reduced-reading', 'visual-instructions', 'fewer-steps', 'additional-time', 'paired-explanation', 'predictable-roles']) },
    extensions: { type: 'array', description: 'Selected extension approaches.', items: enumString('One extension approach.', ['longer-route', 'extra-debugging-fault', 'loop-challenge', 'compare-solutions', 'design-new-mission']) },
    supportInstructions: text('Learner-support instructions.', 500), extensionInstructions: text('Extension-challenge instructions.', 500),
    sectionsToUpdate: { type: 'array', description: 'Named sections to propose.', uniqueItems: true, items: enumString('One authorised section.', [...cycleNames, 'learner-support', 'extension-challenge']) },
    cycleSections: { type: 'array', description: 'Matching cycle-section payloads.', uniqueItems: true, items: { type: 'object', additionalProperties: false, properties: { section: enumString('Cycle section name.', cycleNames), content: text('Cycle section content.', 500), durationMinutes: integer('Cycle section minutes.', 1) }, required: ['section', 'content', 'durationMinutes'] } },
  },
  required: ['supports', 'extensions', 'supportInstructions', 'extensionInstructions', 'sectionsToUpdate', 'cycleSections'],
} as const

const validationInputSchema = { type: 'object', additionalProperties: false, properties: { runMode: enumString('Validation run mode.', ['validate', 'validate-and-prepare']) }, required: ['runMode'] } as const

export interface WebMcpToolDefinition {
  name: ApprovedToolName
  title: string
  description: string
  inputSchema: Record<string, unknown>
  annotations: Required<WebMcpToolAnnotations>
  allowedSections: readonly LessonSection[]
  expectedOutputDescription: string
}

export const WEBMCP_TOOL_CATALOGUE: readonly WebMcpToolDefinition[] = [
  { name: 'set_class_context', title: 'Set class context', description: 'Propose a structured class context for teacher review.', inputSchema: classContextInputSchema, annotations: { readOnlyHint: false, untrustedContentHint: true }, allowedSections: toolSectionAllowlists.set_class_context, expectedOutputDescription: 'Proposal identity, class-context section, normalized context and validation messages.' },
  { name: 'select_tangible_resources', title: 'Select tangible resources', description: 'Propose tangible resource inventory for teacher review.', inputSchema: selectTangibleResourcesJsonSchema, annotations: { readOnlyHint: false, untrustedContentHint: true }, allowedSections: toolSectionAllowlists.select_tangible_resources, expectedOutputDescription: 'Proposal identity, resource section, normalized inventory and resource warnings.' },
  { name: 'build_tangible_mission', title: 'Build tangible mission', description: 'Propose structured mission sections for teacher review.', inputSchema: missionInputSchema, annotations: { readOnlyHint: false, untrustedContentHint: true }, allowedSections: toolSectionAllowlists.build_tangible_mission, expectedOutputDescription: 'Proposal identity, affected mission sections and feasibility warnings.' },
  { name: 'adapt_for_learners', title: 'Adapt for learners', description: 'Propose named learner adaptations for teacher review.', inputSchema: adaptationInputSchema, annotations: { readOnlyHint: false, untrustedContentHint: true }, allowedSections: toolSectionAllowlists.adapt_for_learners, expectedOutputDescription: 'Proposal identity, affected sections and before/proposed values.' },
  { name: 'validate_and_prepare_lesson', title: 'Validate lesson', description: 'Run deterministic validation and report readiness for teacher review.', inputSchema: validationInputSchema, annotations: { readOnlyHint: false, untrustedContentHint: false }, allowedSections: toolSectionAllowlists.validate_and_prepare_lesson, expectedOutputDescription: 'Deterministic checks, readiness and preparationImplemented false; no approval or outputs.' },
] as const

export const WEBMCP_TOOL_NAMES = WEBMCP_TOOL_CATALOGUE.map(({ name }) => name)
