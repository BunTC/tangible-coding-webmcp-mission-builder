import { z } from 'zod'
import { calculateGrouping } from '../domain/lesson-factories'
import { createPendingChangeSet, getSectionValue } from '../domain/lesson-change-control'
import { classContextSchema, resourceInventorySchema, type ChangeSet, type LessonDraft, type ResourceInventory } from '../domain/lesson-schemas'
import type { ProposalReceiptResult } from '../state/lesson-state'
import type { ExpectedToolErrorCode, ToolFailure } from './set-class-context'
import { isWebMcpInvocationAborted } from './webmcp-execution'
import { createProposalPackage, type ProposalPackage } from '../domain/lesson-proposal-package'
import { parseTeacherContextPackage } from '../domain/lesson-context-package'

export const selectTangibleResourcesInputSchema = resourceInventorySchema
  .omit({ roleCards: true })
  .extend({ roleCards: resourceInventorySchema.shape.roleCards.optional(), teacherContext: z.string().optional() })
  .strict()

export const selectTangibleResourcesJsonSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    robots: { type: 'integer', description: 'Available robots.', minimum: 0, maximum: 12 },
    tileSets: { type: 'integer', description: 'Available tile sets.', minimum: 0, maximum: 30 },
    activityMats: { type: 'integer', description: 'Available activity mats.', minimum: 0, maximum: 12 },
    instructionCardPacks: { type: 'integer', description: 'Available instruction-card packs.', minimum: 0, maximum: 12 },
    roleCards: { type: 'integer', description: 'Optional available pupil role cards.', minimum: 0, maximum: 40 },
    allowTileOnlyGroups: { type: 'boolean', description: 'Whether tile-only stations are allowed.' },
    teacherContext: { type: 'string', description: 'Optional serialized teacher-accepted context package for transient use.', maxLength: 20000 },
  },
  required: ['robots', 'tileSets', 'activityMats', 'instructionCardPacks', 'allowTileOnlyGroups'],
} as const

export type SelectTangibleResourcesSuccess = {
  ok: true
  tool: 'select_tangible_resources'
  changeSetId: string
  operationId: string
  section: 'tangible-resources'
  proposedInventory: ResourceInventory
  roleCards: 'provided' | 'preserved'
  suggestedGrouping: LessonDraft['groupingPlan']
  resourceWarnings: string[]
  proposalPackage: ProposalPackage
  stateChanged: boolean
  delivery?: 'portable-package-only'
  usedContextFingerprint?: string
}

export interface SelectTangibleResourcesDependencies {
  getDraft(): LessonDraft
  receiveChangeSet(changeSet: ChangeSet): ProposalReceiptResult
  createId(): string
  now(): string
}

const failure = (code: ExpectedToolErrorCode, message: string): ToolFailure => ({ ok: false, error: { code, message }, stateChanged: false })

export function createSelectTangibleResourcesHandler(dependencies: SelectTangibleResourcesDependencies) {
  const execute = (parsedInput: z.infer<typeof selectTangibleResourcesInputSchema>, draft: LessonDraft, context: WebMcpExecutionContext | undefined, contextFingerprint?: string): SelectTangibleResourcesSuccess | ToolFailure => {
    const resourceInput = {
      robots: parsedInput.robots,
      tileSets: parsedInput.tileSets,
      activityMats: parsedInput.activityMats,
      instructionCardPacks: parsedInput.instructionCardPacks,
      roleCards: parsedInput.roleCards,
      allowTileOnlyGroups: parsedInput.allowTileOnlyGroups,
    }
    if (isWebMcpInvocationAborted(context)) return failure('aborted', 'The tool call was cancelled before any change was proposed.')
    if (!classContextSchema.safeParse(draft.classContext).success) return failure('prerequisite-failed', 'A valid accepted class context is required before proposing resources.')
    if (!resourceInventorySchema.safeParse(draft.resources).success) return failure('prerequisite-failed', 'The current accepted resource inventory is unavailable. Restore a valid lesson draft before proposing changes.')
    const roleCards = resourceInput.roleCards === undefined ? draft.resources.roleCards : resourceInput.roleCards
    const proposedInventory = resourceInventorySchema.parse({ ...resourceInput, roleCards })
    const suggestedGrouping = calculateGrouping(draft.classContext, proposedInventory)
    const changeSetId = dependencies.createId()
    const operationId = dependencies.createId()
    let proposal: ChangeSet
    try {
      proposal = createPendingChangeSet(draft, 'select_tangible_resources', [{ section: 'tangible-resources', before: getSectionValue(draft, 'tangible-resources'), proposed: proposedInventory }], {
        changeSetId, operationIds: [operationId], createdAt: dependencies.now(),
      })
    } catch (error) {
      if (error instanceof Error && /before value|Duplicate/.test(error.message)) return failure('stale-state', 'The accepted lesson changed before this proposal could be recorded. Try again with the current lesson.')
      throw error
    }
    if (isWebMcpInvocationAborted(context)) return failure('aborted', 'The tool call was cancelled before any change was proposed.')
    if (!contextFingerprint) {
      const receipt = dependencies.receiveChangeSet(proposal)
      if (!receipt.ok) return failure(receipt.code, receipt.message)
    }
    return {
      ok: true,
      tool: 'select_tangible_resources',
      changeSetId,
      operationId,
      section: 'tangible-resources',
      proposedInventory,
      roleCards: resourceInput.roleCards === undefined ? 'preserved' : 'provided',
      suggestedGrouping,
      resourceWarnings: suggestedGrouping.warnings,
      proposalPackage: createProposalPackage(proposal, contextFingerprint),
      stateChanged: !contextFingerprint,
      ...(contextFingerprint ? { delivery: 'portable-package-only' as const, usedContextFingerprint: contextFingerprint } : {}),
    }
  }
  return (input: unknown, context?: WebMcpExecutionContext): SelectTangibleResourcesSuccess | ToolFailure => {
    if (isWebMcpInvocationAborted(context)) return failure('aborted', 'The tool call was cancelled before any change was proposed.')
    const parsed = selectTangibleResourcesInputSchema.safeParse(input)
    if (!parsed.success) return failure('invalid-input', 'Resource inventory is invalid. Check equipment quantities and permitted fields.')
    if (!parsed.data.teacherContext) return execute(parsed.data, dependencies.getDraft(), context)
    return parseTeacherContextPackage(parsed.data.teacherContext).then((teacherContext) => teacherContext.ok
      ? execute(parsed.data, teacherContext.draft, context, teacherContext.package.contextFingerprint)
      : failure('invalid-input', teacherContext.message)) as unknown as SelectTangibleResourcesSuccess | ToolFailure
  }
}
