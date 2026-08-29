import { toolSectionAllowlists, type ApprovedToolName, type LessonSection } from '../domain/lesson-schemas'
import { selectTangibleResourcesJsonSchema } from './select-tangible-resources'
import { buildTangibleMissionJsonSchema } from './build-tangible-mission'
import { adaptForLearnersJsonSchema } from './adapt-for-learners'
import { validateAndPrepareLessonJsonSchema } from './validate-and-prepare-lesson'

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
  { name: 'build_tangible_mission', title: 'Build tangible mission', description: 'Propose structured mission sections for teacher review.', inputSchema: buildTangibleMissionJsonSchema, annotations: { readOnlyHint: false, untrustedContentHint: true }, allowedSections: toolSectionAllowlists.build_tangible_mission, expectedOutputDescription: 'Proposal identity, affected mission sections and feasibility warnings.' },
  { name: 'adapt_for_learners', title: 'Adapt for learners', description: 'Propose named learner adaptations for teacher review.', inputSchema: adaptForLearnersJsonSchema, annotations: { readOnlyHint: false, untrustedContentHint: true }, allowedSections: toolSectionAllowlists.adapt_for_learners, expectedOutputDescription: 'Proposal identity, affected sections and before/proposed values.' },
  { name: 'validate_and_prepare_lesson', title: 'Validate lesson', description: 'Run deterministic validation and report readiness for teacher review.', inputSchema: validateAndPrepareLessonJsonSchema, annotations: { readOnlyHint: false, untrustedContentHint: false }, allowedSections: toolSectionAllowlists.validate_and_prepare_lesson, expectedOutputDescription: 'Deterministic checks, readiness and preparationImplemented false; no approval or outputs.' },
] as const

export const WEBMCP_TOOL_NAMES = WEBMCP_TOOL_CATALOGUE.map(({ name }) => name)
