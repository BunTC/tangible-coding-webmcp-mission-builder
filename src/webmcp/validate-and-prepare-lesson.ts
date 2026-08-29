import { z } from 'zod'
import type { LessonDraft, ValidationResult } from '../domain/lesson-schemas'
import type { ValidationRunResult } from '../state/lesson-state'
import type { ExpectedToolErrorCode, ToolFailure } from './set-class-context'

export const validateAndPrepareLessonInputSchema = z.object({
  runMode: z.enum(['validate', 'validate-and-prepare']),
}).strict()

export const validateAndPrepareLessonJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    runMode: { type: 'string', description: 'Validation run mode.', enum: ['validate', 'validate-and-prepare'] },
  },
  required: ['runMode'],
} as const

export type ValidateAndPrepareLessonSuccess = Pick<ValidationResult, 'readiness' | 'score' | 'checks' | 'preparedOutputs'> & {
  preparationImplemented: false
}

export interface ValidateAndPrepareLessonDependencies {
  getDraft(): LessonDraft
  runValidation(expectedDraft: LessonDraft, canPublish?: () => boolean): ValidationRunResult
}

const failure = (code: ExpectedToolErrorCode, message: string): ToolFailure => ({ ok: false, error: { code, message }, stateChanged: false })

export function createValidateAndPrepareLessonHandler(dependencies: ValidateAndPrepareLessonDependencies) {
  return (input: unknown, context: WebMcpExecutionContext): ValidateAndPrepareLessonSuccess | ToolFailure => {
    if (context.signal.aborted) return failure('aborted', 'The tool call was cancelled before validation began.')
    const parsed = validateAndPrepareLessonInputSchema.safeParse(input)
    if (!parsed.success) return failure('invalid-input', 'Choose either validate or validate-and-prepare.')

    const snapshot = dependencies.getDraft()
    const result = dependencies.runValidation(snapshot, () => !context.signal.aborted)
    if (!result.ok) return failure(result.code, result.message)

    const { readiness, score, checks, preparedOutputs } = result.draft.validation
    return { readiness, score, checks, preparedOutputs, preparationImplemented: false }
  }
}
