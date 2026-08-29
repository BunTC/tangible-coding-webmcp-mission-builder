import { calculateGrouping } from '../domain/lesson-factories'
import { createPendingChangeSet, getSectionValue } from '../domain/lesson-change-control'
import { classContextSchema, resourceInventorySchema, type ChangeSet, type LessonDraft, type ResourceInventory } from '../domain/lesson-schemas'
import type { ProposalReceiptResult } from '../state/lesson-state'
import type { ExpectedToolErrorCode, ToolFailure } from './set-class-context'

export const selectTangibleResourcesInputSchema = resourceInventorySchema
  .omit({ roleCards: true })
  .extend({ roleCards: resourceInventorySchema.shape.roleCards.optional() })
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
  stateChanged: true
}

export interface SelectTangibleResourcesDependencies {
  getDraft(): LessonDraft
  receiveChangeSet(changeSet: ChangeSet): ProposalReceiptResult
  createId(): string
  now(): string
}

const failure = (code: ExpectedToolErrorCode, message: string): ToolFailure => ({ ok: false, error: { code, message }, stateChanged: false })

export function createSelectTangibleResourcesHandler(dependencies: SelectTangibleResourcesDependencies) {
  return (input: unknown, context: WebMcpExecutionContext): SelectTangibleResourcesSuccess | ToolFailure => {
    if (context.signal.aborted) return failure('aborted', 'The tool call was cancelled before any change was proposed.')
    const parsed = selectTangibleResourcesInputSchema.safeParse(input)
    if (!parsed.success) return failure('invalid-input', 'Resource inventory is invalid. Check equipment quantities and permitted fields.')
    const draft = dependencies.getDraft()
    if (!classContextSchema.safeParse(draft.classContext).success) return failure('prerequisite-failed', 'A valid accepted class context is required before proposing resources.')
    if (!resourceInventorySchema.safeParse(draft.resources).success) return failure('prerequisite-failed', 'The current accepted resource inventory is unavailable. Restore a valid lesson draft before proposing changes.')
    const roleCards = parsed.data.roleCards === undefined ? draft.resources.roleCards : parsed.data.roleCards
    const proposedInventory = resourceInventorySchema.parse({ ...parsed.data, roleCards })
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
    if (context.signal.aborted) return failure('aborted', 'The tool call was cancelled before any change was proposed.')
    const receipt = dependencies.receiveChangeSet(proposal)
    if (!receipt.ok) return failure(receipt.code, receipt.message)
    return {
      ok: true,
      tool: 'select_tangible_resources',
      changeSetId,
      operationId,
      section: 'tangible-resources',
      proposedInventory,
      roleCards: parsed.data.roleCards === undefined ? 'preserved' : 'provided',
      suggestedGrouping,
      resourceWarnings: suggestedGrouping.warnings,
      stateChanged: true,
    }
  }
}
