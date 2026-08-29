import { classContextSchema, type ChangeSet, type LessonDraft } from '../domain/lesson-schemas'
import { createPendingChangeSet, getSectionValue } from '../domain/lesson-change-control'
import type { ProposalReceiptResult } from '../state/lesson-state'
import { isWebMcpInvocationAborted } from './webmcp-execution'

export type ExpectedToolErrorCode = 'invalid-input' | 'invalid-proposal' | 'aborted' | 'stale-state' | 'prerequisite-failed'
export type ToolFailure = { ok: false; error: { code: ExpectedToolErrorCode; message: string }; stateChanged: false }
export type SetClassContextSuccess = { ok: true; changeSetId: string; operationId: string; section: 'class-context'; proposedContext: LessonDraft['classContext']; validationMessages: string[]; stateChanged: true }

export interface SetClassContextDependencies {
  getDraft(): LessonDraft
  receiveChangeSet(changeSet: ChangeSet): ProposalReceiptResult
  createId(): string
  now(): string
}

const failure = (code: ExpectedToolErrorCode, message: string): ToolFailure => ({ ok: false, error: { code, message }, stateChanged: false })

export function createSetClassContextHandler(dependencies: SetClassContextDependencies) {
  return (input: unknown, context?: WebMcpExecutionContext): SetClassContextSuccess | ToolFailure => {
    if (isWebMcpInvocationAborted(context)) return failure('aborted', 'The tool call was cancelled before any change was proposed.')
    const parsed = classContextSchema.strict().safeParse(input)
    if (!parsed.success) return failure('invalid-input', 'Class context is invalid. Check the stage, class size, duration and required selections.')
    const draft = dependencies.getDraft()
    if (!classContextSchema.safeParse(draft.classContext).success) return failure('prerequisite-failed', 'The current accepted class context is unavailable. Restore a valid lesson draft before proposing changes.')
    const changeSetId = dependencies.createId()
    const operationId = dependencies.createId()
    let proposal: ChangeSet
    try {
      proposal = createPendingChangeSet(draft, 'set_class_context', [{ section: 'class-context', before: getSectionValue(draft, 'class-context'), proposed: parsed.data }], {
        changeSetId, operationIds: [operationId], createdAt: dependencies.now(),
      })
    } catch (error) {
      if (error instanceof Error && /before value|Duplicate/.test(error.message)) return failure('stale-state', 'The accepted lesson changed before this proposal could be recorded. Try again with the current lesson.')
      throw error
    }
    if (isWebMcpInvocationAborted(context)) return failure('aborted', 'The tool call was cancelled before any change was proposed.')
    const receipt = dependencies.receiveChangeSet(proposal)
    if (!receipt.ok) return failure(receipt.code, receipt.message)
    return { ok: true, changeSetId, operationId, section: 'class-context', proposedContext: parsed.data, validationMessages: [], stateChanged: true }
  }
}
