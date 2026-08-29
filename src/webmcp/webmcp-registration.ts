import { WEBMCP_TOOL_CATALOGUE, WEBMCP_TOOL_NAMES, type WebMcpToolDefinition } from './webmcp-catalogue'
import type { ApprovedToolName } from '../domain/lesson-schemas'

export type WebMcpAvailability = 'unsupported' | 'supported' | 'malformed'
export type WebMcpConnectionState = 'unavailable' | 'incomplete' | 'registering' | 'connected' | 'error'
export type WebMcpHandler = WebMcpToolDescriptor['execute']
export type WebMcpHandlers = Partial<Record<ApprovedToolName, WebMcpHandler>>

export function detectWebMcp(target: Document | null): { availability: WebMcpAvailability; modelContext?: ModelContext } {
  if (!target || !('modelContext' in target)) return { availability: 'unsupported' }
  try {
    const modelContext = target.modelContext
    return modelContext && typeof modelContext.registerTool === 'function'
      ? { availability: 'supported', modelContext }
      : { availability: 'malformed' }
  } catch {
    return { availability: 'malformed' }
  }
}

export function hasCompleteHandlers(handlers: WebMcpHandlers): handlers is Record<ApprovedToolName, WebMcpHandler> {
  return WEBMCP_TOOL_NAMES.every((name) => typeof handlers[name] === 'function') && Object.keys(handlers).length === WEBMCP_TOOL_NAMES.length
}

export interface RegistrationResult {
  state: 'connected' | 'incomplete' | 'error'
  registeredNames: ApprovedToolName[]
  controller: AbortController
}

const activeControllers = new WeakMap<ModelContext, AbortController>()

export async function registerCompleteWebMcpCatalogue(modelContext: ModelContext, handlers: WebMcpHandlers, catalogue: readonly WebMcpToolDefinition[] = WEBMCP_TOOL_CATALOGUE, controller = new AbortController()): Promise<RegistrationResult> {
  const names = catalogue.map(({ name }) => name)
  const completeCatalogue = names.length === WEBMCP_TOOL_NAMES.length && names.every((name, index) => name === WEBMCP_TOOL_NAMES[index])
  if (!completeCatalogue || !hasCompleteHandlers(handlers)) return { state: 'incomplete', registeredNames: [], controller }
  activeControllers.get(modelContext)?.abort()
  activeControllers.set(modelContext, controller)
  const registeredNames: ApprovedToolName[] = []
  try {
    for (const definition of catalogue) {
      if (controller.signal.aborted) throw new DOMException('Registration aborted.', 'AbortError')
      await modelContext.registerTool({
        name: definition.name, title: definition.title, description: definition.description,
        inputSchema: definition.inputSchema, annotations: definition.annotations, execute: handlers[definition.name],
      }, { signal: controller.signal })
      if (controller.signal.aborted) throw new DOMException('Registration aborted.', 'AbortError')
      registeredNames.push(definition.name)
    }
    return { state: 'connected', registeredNames, controller }
  } catch {
    controller.abort()
    if (activeControllers.get(modelContext) === controller) activeControllers.delete(modelContext)
    return { state: 'error', registeredNames: [], controller }
  }
}
