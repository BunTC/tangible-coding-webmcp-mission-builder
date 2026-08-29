export function isWebMcpInvocationAborted(context?: WebMcpExecutionContext): boolean {
  return context?.signal?.aborted === true
}
