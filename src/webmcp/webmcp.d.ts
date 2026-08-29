/**
 * Minimal WebMCP registration declarations consumed by Mission Builder.
 * Pinned to specification commit 41d12f057167ccf5954dbcf49d99502cb6c84491.
 * Discovery, getTools and executeTool are intentionally not declared.
 */
export {}

declare global {
  interface WebMcpToolAnnotations {
    readOnlyHint?: boolean
    untrustedContentHint?: boolean
  }

  interface WebMcpExecutionContext {
    signal: AbortSignal
  }

  interface WebMcpToolDescriptor {
    name: string
    title?: string
    description: string
    inputSchema?: Record<string, unknown>
    annotations?: WebMcpToolAnnotations
    execute(input: unknown, context: WebMcpExecutionContext): unknown | Promise<unknown>
  }

  interface WebMcpRegistrationOptions {
    signal?: AbortSignal
  }

  interface ModelContext {
    registerTool(tool: WebMcpToolDescriptor, options?: WebMcpRegistrationOptions): Promise<undefined>
  }

  interface Document {
    readonly modelContext: ModelContext
  }
}
