import { z } from 'zod'
import type { LessonDraft, ValidationResult } from '../domain/lesson-schemas'
import type { ValidationRunResult } from '../state/lesson-state'
import type { ExpectedToolErrorCode, ToolFailure } from './set-class-context'
import { isWebMcpInvocationAborted } from './webmcp-execution'
import { parseTeacherContextPackage } from '../domain/lesson-context-package'
import { validateLesson } from '../domain/lesson-validation'

export const validateAndPrepareLessonInputSchema = z.object({
  runMode: z.enum(['validate', 'validate-and-prepare']),
  teacherContext: z.string().optional(),
}).strict()

export const validateAndPrepareLessonJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    runMode: { type: 'string', description: 'Validation run mode.', enum: ['validate', 'validate-and-prepare'] },
    teacherContext: { type: 'string', description: 'Optional serialized teacher-accepted context package for transient use.', maxLength: 20000 },
  },
  required: ['runMode'],
} as const

export type ValidateAndPrepareLessonSuccess = Pick<ValidationResult, 'readiness' | 'score' | 'checks' | 'preparedOutputs'> & {
  preparationImplemented: false
  stateChanged?: false
  delivery?: 'transient-result-only'
  usedContextFingerprint?: string
}

export interface ValidateAndPrepareLessonDependencies {
  getDraft(): LessonDraft
  runValidation(expectedDraft: LessonDraft, canPublish?: () => boolean): ValidationRunResult
}

const failure = (code: ExpectedToolErrorCode, message: string): ToolFailure => ({ ok: false, error: { code, message }, stateChanged: false })

export function createValidateAndPrepareLessonHandler(dependencies: ValidateAndPrepareLessonDependencies) {
  return (input: unknown, context?: WebMcpExecutionContext): ValidateAndPrepareLessonSuccess | ToolFailure => {
    if (isWebMcpInvocationAborted(context)) return failure('aborted', 'The tool call was cancelled before validation began.')
    const parsed = validateAndPrepareLessonInputSchema.safeParse(input)
    if (!parsed.success) return failure('invalid-input', 'Choose either validate or validate-and-prepare.')

    if (parsed.data.teacherContext) return parseTeacherContextPackage(parsed.data.teacherContext).then((teacherContext) => {
      if (!teacherContext.ok) return failure('invalid-input', teacherContext.message)
      if (isWebMcpInvocationAborted(context)) return failure('aborted', 'The tool call was cancelled before validation began.')
      const validation = validateLesson(teacherContext.draft)
      return { readiness: validation.readiness, score: validation.score, checks: validation.checks, preparedOutputs: [], preparationImplemented: false, stateChanged: false, delivery: 'transient-result-only', usedContextFingerprint: teacherContext.package.contextFingerprint }
    }) as unknown as ValidateAndPrepareLessonSuccess | ToolFailure

    const snapshot = dependencies.getDraft()
    const result = dependencies.runValidation(snapshot, () => !isWebMcpInvocationAborted(context))
    if (!result.ok) return failure(result.code, result.message)

    const { readiness, score, checks, preparedOutputs } = result.draft.validation
    return { readiness, score, checks, preparedOutputs, preparationImplemented: false }
  }
}
