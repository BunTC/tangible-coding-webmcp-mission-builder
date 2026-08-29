import { z } from 'zod'
import { changeOperationSchema, changeSetSchema, toolSectionAllowlists, type ChangeSet, type LessonDraft } from './lesson-schemas'

export const PROPOSAL_PACKAGE_FORMAT = 'tangible-coding-agent-proposal' as const
export const PROPOSAL_PACKAGE_VERSION = 1 as const
export const MAX_PROPOSAL_PACKAGE_CHARACTERS = 50_000
export const MAX_PROPOSAL_PACKAGE_OPERATIONS = 9

const proposalToolSchema = z.enum(['set_class_context', 'select_tangible_resources', 'build_tangible_mission', 'adapt_for_learners'])
const proposalTools = new Set<string>(proposalToolSchema.options)
const portableOperationSchema = z.object({
  operationId: z.string().min(1).max(200),
  section: z.string().min(1),
  before: z.unknown(),
  proposed: z.unknown(),
}).strict()

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function jsonValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => jsonValuesEqual(value, right[index]))
  }
  if (!isPlainJsonObject(left) || !isPlainJsonObject(right)) return false
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => Object.hasOwn(right, key) && jsonValuesEqual(left[key], right[key]))
}

export const proposalPackageSchema = z.object({
  format: z.literal(PROPOSAL_PACKAGE_FORMAT),
  schemaVersion: z.literal(PROPOSAL_PACKAGE_VERSION),
  sourceTool: proposalToolSchema,
  changeSetId: z.string().min(1).max(200),
  createdAt: z.iso.datetime(),
  operations: z.array(portableOperationSchema).min(1).max(MAX_PROPOSAL_PACKAGE_OPERATIONS),
}).strict().superRefine((value, context) => {
  const ids = [value.changeSetId, ...value.operations.map(({ operationId }) => operationId)]
  if (new Set(ids).size !== ids.length) context.addIssue({ code: 'custom', path: ['operations'], message: 'Change-set and operation IDs must be unique.' })
  const sections = value.operations.map(({ section }) => section)
  if (new Set(sections).size !== sections.length) context.addIssue({ code: 'custom', path: ['operations'], message: 'A package may contain only one operation per section.' })
  const allowed = toolSectionAllowlists[value.sourceTool] as readonly string[]
  value.operations.forEach((operation, index) => {
    if (!allowed.includes(operation.section)) context.addIssue({ code: 'custom', path: ['operations', index, 'section'], message: `${value.sourceTool} cannot propose ${operation.section}.` })
    const domainOperation = changeOperationSchema.safeParse({
      ...operation,
      status: 'pending',
      validation: { valid: true, messages: [] },
    })
    if (!domainOperation.success) context.addIssue({ code: 'custom', path: ['operations', index], message: 'The operation values do not match the named lesson section.' })
    else if (!jsonValuesEqual(domainOperation.data.before, operation.before) || !jsonValuesEqual(domainOperation.data.proposed, operation.proposed)) context.addIssue({ code: 'custom', path: ['operations', index], message: 'The operation contains an unknown section-value field.' })
  })
})

export type ProposalPackage = z.infer<typeof proposalPackageSchema>

export function createProposalPackage(changeSet: ChangeSet): ProposalPackage {
  if (changeSet.operations.some(({ status }) => status !== 'pending') || changeSet.resolvedAt) throw new Error('Only unresolved pending proposals can be packaged.')
  return proposalPackageSchema.parse({
    format: PROPOSAL_PACKAGE_FORMAT,
    schemaVersion: PROPOSAL_PACKAGE_VERSION,
    sourceTool: changeSet.toolName,
    changeSetId: changeSet.changeSetId,
    createdAt: changeSet.createdAt,
    operations: changeSet.operations.map(({ operationId, section, before, proposed }) => ({ operationId, section, before, proposed })),
  })
}

export type ProposalImportErrorCode = 'excessive-size' | 'malformed-json' | 'wrong-version' | 'forbidden-content' | 'unknown-field' | 'invalid-package' | 'unauthorized-section' | 'duplicate-id' | 'stale-state'
export type ProposalImportResult =
  | { ok: true; changeSetId: string; operationCount: number; message: string }
  | { ok: false; code: ProposalImportErrorCode; message: string }
type ProposalReceipt = { ok: true } | { ok: false; code: 'stale-state' | 'invalid-proposal'; message: string }

const forbiddenKeys = new Set(['approvedAt', 'approval', 'acceptedValue', 'resolution', 'resolvedAt', 'status', 'validation', 'preparedOutputs', 'lessonDraft'])
const allowedRootKeys = new Set(['format', 'schemaVersion', 'sourceTool', 'changeSetId', 'createdAt', 'operations'])
const allowedOperationKeys = new Set(['operationId', 'section', 'before', 'proposed'])

function hasForbiddenKey(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some(hasForbiddenKey)
  return Object.entries(value).some(([key, nested]) => forbiddenKeys.has(key) || hasForbiddenKey(nested))
}

function hasUnknownEnvelopeField(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  if (Object.keys(record).some((key) => !allowedRootKeys.has(key))) return true
  return Array.isArray(record.operations) && record.operations.some((operation) => operation && typeof operation === 'object' && !Array.isArray(operation)
    && Object.keys(operation as Record<string, unknown>).some((key) => !allowedOperationKeys.has(key)))
}

export function importProposalPackage(
  serialized: string,
  draft: LessonDraft,
  receiveChangeSet: (changeSet: ChangeSet) => ProposalReceipt,
): ProposalImportResult {
  if (serialized.length > MAX_PROPOSAL_PACKAGE_CHARACTERS) return { ok: false, code: 'excessive-size', message: `Proposal packages must be ${MAX_PROPOSAL_PACKAGE_CHARACTERS.toLocaleString()} characters or fewer.` }
  let raw: unknown
  try { raw = JSON.parse(serialized) } catch { return { ok: false, code: 'malformed-json', message: 'Paste a complete valid JSON proposal package.' } }
  if (hasForbiddenKey(raw)) return { ok: false, code: 'forbidden-content', message: 'Proposal packages cannot contain approval, resolution, validation, prepared-output or complete lesson data.' }
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && (raw as Record<string, unknown>).schemaVersion !== PROPOSAL_PACKAGE_VERSION) return { ok: false, code: 'wrong-version', message: `This application accepts proposal package version ${PROPOSAL_PACKAGE_VERSION} only.` }
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && !proposalTools.has(String((raw as Record<string, unknown>).sourceTool))) return { ok: false, code: 'unauthorized-section', message: 'The package source tool is not authorized to create portable proposals.' }
  if (hasUnknownEnvelopeField(raw)) return { ok: false, code: 'unknown-field', message: 'The proposal package contains an unknown field.' }
  const parsed = proposalPackageSchema.safeParse(raw)
  if (!parsed.success) {
    const unauthorized = parsed.error.issues.some(({ message }) => message.includes('cannot propose'))
    const duplicate = parsed.error.issues.some(({ message }) => message.includes('IDs must be unique') || message.includes('one operation per section'))
    if (duplicate) return { ok: false, code: 'duplicate-id', message: 'The package contains duplicate proposal identities or target sections.' }
    if (parsed.error.issues.some(({ message }) => message.includes('unknown section-value field'))) return { ok: false, code: 'unknown-field', message: 'The proposal package contains an unknown field.' }
    return unauthorized
      ? { ok: false, code: 'unauthorized-section', message: 'The source tool is not authorized to propose one or more packaged sections.' }
      : { ok: false, code: 'invalid-package', message: 'The proposal package does not match the strict pending-proposal format.' }
  }
  const existingIds = new Set([...draft.pendingChanges, ...draft.changeHistory].flatMap((set) => [set.changeSetId, ...set.operations.map(({ operationId }) => operationId)]))
  const incomingIds = [parsed.data.changeSetId, ...parsed.data.operations.map(({ operationId }) => operationId)]
  if (incomingIds.some((id) => existingIds.has(id))) return { ok: false, code: 'duplicate-id', message: 'This proposal package has already been imported or collides with existing proposal history.' }
  const changeSet = changeSetSchema.parse({
    changeSetId: parsed.data.changeSetId,
    source: 'webmcp-agent',
    toolName: parsed.data.sourceTool,
    createdAt: parsed.data.createdAt,
    operations: parsed.data.operations.map((operation) => ({ ...operation, status: 'pending', validation: { valid: true, messages: [] } })),
  })
  const receipt = receiveChangeSet(changeSet)
  if (!receipt.ok) return { ok: false, code: receipt.code === 'stale-state' ? 'stale-state' : 'invalid-package', message: receipt.message }
  return { ok: true, changeSetId: changeSet.changeSetId, operationCount: changeSet.operations.length, message: `Imported proposal ${changeSet.changeSetId} for teacher review. No lesson content was accepted.` }
}
