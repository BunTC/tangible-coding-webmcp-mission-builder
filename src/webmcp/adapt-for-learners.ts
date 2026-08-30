import { z } from 'zod'
import { createPendingChangeSet, getSectionValue, type ProposedOperation } from '../domain/lesson-change-control'
import { adaptationPlanSchema, missionContentSchema, type ChangeSet, type LessonDraft, type LessonSection } from '../domain/lesson-schemas'
import type { ProposalReceiptResult } from '../state/lesson-state'
import type { ExpectedToolErrorCode, ToolFailure } from './set-class-context'
import { isWebMcpInvocationAborted } from './webmcp-execution'
import { createProposalPackage, type ProposalPackage } from '../domain/lesson-proposal-package'
import { parseTeacherContextPackage } from '../domain/lesson-context-package'

const cycleSections = ['plan', 'build-and-explain', 'test-and-debug', 'reflect-and-improve'] as const
export const ADAPTATION_SECTION_ORDER = [...cycleSections, 'learner-support', 'extension-challenge'] as const satisfies readonly LessonSection[]
const adaptationSectionSchema = z.enum(ADAPTATION_SECTION_ORDER)
const cycleSectionNameSchema = z.enum(cycleSections)
const cyclePayloadSchema = z.object({ section: cycleSectionNameSchema, content: z.string().max(500), durationMinutes: z.number().int().positive() }).strict()

export const adaptForLearnersInputSchema = z.object({
  supports: adaptationPlanSchema.shape.supports,
  extensions: adaptationPlanSchema.shape.extensions,
  supportInstructions: adaptationPlanSchema.shape.supportInstructions,
  extensionInstructions: adaptationPlanSchema.shape.extensionInstructions,
  sectionsToUpdate: z.array(adaptationSectionSchema).refine((sections) => new Set(sections).size === sections.length, 'Sections to update must be unique.'),
  cycleSections: z.array(cyclePayloadSchema),
  teacherContext: z.string().optional(),
}).strict().superRefine((input, context) => {
  const payloadNames = input.cycleSections.map(({ section }) => section)
  if (new Set(payloadNames).size !== payloadNames.length) context.addIssue({ code: 'custom', path: ['cycleSections'], message: 'Cycle-section payloads must be unique.' })
  const requestedCycles = input.sectionsToUpdate.filter((section): section is (typeof cycleSections)[number] => cycleSections.includes(section as (typeof cycleSections)[number]))
  if (requestedCycles.length !== payloadNames.length || requestedCycles.some((section) => !payloadNames.includes(section)) || payloadNames.some((section) => !requestedCycles.includes(section))) {
    context.addIssue({ code: 'custom', path: ['cycleSections'], message: 'Cycle payloads must exactly match the requested cycle sections.' })
  }
})

const text = (description: string, maxLength: number) => ({ type: 'string', description, maxLength })
const enumString = (description: string, values: readonly string[]) => ({ type: 'string', description, enum: values })
const cycleNames = ['plan', 'build-and-explain', 'test-and-debug', 'reflect-and-improve'] as const

export const adaptForLearnersJsonSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    supports: { type: 'array', description: 'Selected support approaches.', items: enumString('One support approach.', ['reduced-reading', 'visual-instructions', 'fewer-steps', 'additional-time', 'paired-explanation', 'predictable-roles']) },
    extensions: { type: 'array', description: 'Selected extension approaches.', items: enumString('One extension approach.', ['longer-route', 'extra-debugging-fault', 'loop-challenge', 'compare-solutions', 'design-new-mission']) },
    supportInstructions: text('Learner-support instructions.', 500), extensionInstructions: text('Extension-challenge instructions.', 500),
    sectionsToUpdate: { type: 'array', description: 'Named sections to propose.', uniqueItems: true, items: enumString('One authorised section.', ADAPTATION_SECTION_ORDER) },
    cycleSections: { type: 'array', description: 'Matching cycle-section payloads.', uniqueItems: true, items: { type: 'object', additionalProperties: false, properties: { section: enumString('Cycle section name.', cycleNames), content: text('Cycle section content.', 500), durationMinutes: { type: 'integer', description: 'Cycle section minutes.', minimum: 1 } }, required: ['section', 'content', 'durationMinutes'] } },
    teacherContext: text('Optional serialized teacher-accepted context package for transient use.', 20000),
  },
  required: ['supports', 'extensions', 'supportInstructions', 'extensionInstructions', 'sectionsToUpdate', 'cycleSections'],
} as const

type AdaptationInput = z.infer<typeof adaptForLearnersInputSchema>
export type AdaptForLearnersSuccess = {
  ok: true
  tool: 'adapt_for_learners'
  changeSetId: string
  operationIds: string[]
  sections: LessonSection[]
  proposalPackage: ProposalPackage
  stateChanged: boolean
  delivery?: 'portable-package-only'
  usedContextFingerprint?: string
}

export interface AdaptForLearnersDependencies {
  getDraft(): LessonDraft
  receiveChangeSet(changeSet: ChangeSet): ProposalReceiptResult
  createId(): string
  now(): string
}

const failure = (code: ExpectedToolErrorCode, message: string): ToolFailure => ({ ok: false, error: { code, message }, stateChanged: false })

function proposedOperations(draft: LessonDraft, input: AdaptationInput): ProposedOperation[] {
  const cycleBySection = new Map(input.cycleSections.map(({ section, content, durationMinutes }) => [section, { content, durationMinutes }]))
  const ordered = ADAPTATION_SECTION_ORDER.filter((section) => input.sectionsToUpdate.includes(section))
  return ordered.map((section) => {
    let proposed: unknown
    if (cycleSections.includes(section as (typeof cycleSections)[number])) proposed = cycleBySection.get(section as (typeof cycleSections)[number])
    else if (section === 'learner-support') proposed = { supports: input.supports, supportInstructions: input.supportInstructions }
    else proposed = { extensions: input.extensions, extensionInstructions: input.extensionInstructions }
    return { section, before: getSectionValue(draft, section), proposed }
  })
}

export function createAdaptForLearnersHandler(dependencies: AdaptForLearnersDependencies) {
  const execute = (adaptation: AdaptationInput, draft: LessonDraft, context: WebMcpExecutionContext | undefined, contextFingerprint?: string): AdaptForLearnersSuccess | ToolFailure => {
    if (isWebMcpInvocationAborted(context)) return failure('aborted', 'The tool call was cancelled before any change was proposed.')
    if (adaptation.sectionsToUpdate.length === 0) return failure('invalid-input', 'Select at least one authorised section to propose for adaptation.')
    if (!missionContentSchema.safeParse(draft.mission).success || !draft.mission.title.trim()) return failure('prerequisite-failed', 'An accepted mission is required before proposing learner adaptations.')
    const operations = proposedOperations(draft, adaptation)
    const changeSetId = dependencies.createId()
    const operationIds = operations.map(() => dependencies.createId())
    let proposal: ChangeSet
    try {
      proposal = createPendingChangeSet(draft, 'adapt_for_learners', operations, { changeSetId, operationIds, createdAt: dependencies.now() })
    } catch (error) {
      if (error instanceof Error && /before value|Duplicate/.test(error.message)) return failure('stale-state', 'The accepted lesson changed before this proposal could be recorded. Try again with the current lesson.')
      throw error
    }
    if (isWebMcpInvocationAborted(context)) return failure('aborted', 'The tool call was cancelled before any change was proposed.')
    if (!contextFingerprint) {
      const receipt = dependencies.receiveChangeSet(proposal)
      if (!receipt.ok) return failure(receipt.code, receipt.message)
    }
    return { ok: true, tool: 'adapt_for_learners', changeSetId, operationIds, sections: operations.map(({ section }) => section), proposalPackage: createProposalPackage(proposal, contextFingerprint), stateChanged: !contextFingerprint, ...(contextFingerprint ? { delivery: 'portable-package-only' as const, usedContextFingerprint: contextFingerprint } : {}) }
  }
  return (input: unknown, context?: WebMcpExecutionContext): AdaptForLearnersSuccess | ToolFailure => {
    if (isWebMcpInvocationAborted(context)) return failure('aborted', 'The tool call was cancelled before any change was proposed.')
    const parsed = adaptForLearnersInputSchema.safeParse(input)
    if (!parsed.success) return failure('invalid-input', 'Learner adaptations are invalid. Check the named sections, matching cycle payloads and instruction limits.')
    const { teacherContext, ...adaptation } = parsed.data
    if (!teacherContext) return execute(adaptation as AdaptationInput, dependencies.getDraft(), context)
    return parseTeacherContextPackage(teacherContext).then((result) => result.ok
      ? execute(adaptation as AdaptationInput, result.draft, context, result.package.contextFingerprint)
      : failure('invalid-input', result.message)) as unknown as AdaptForLearnersSuccess | ToolFailure
  }
}
