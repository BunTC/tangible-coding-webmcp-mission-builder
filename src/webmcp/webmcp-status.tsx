import type { WebMcpStatus } from './use-webmcp'

export function WebMcpStatusIndicator({ status }: { status: WebMcpStatus }) {
  return <span className={`connection-state webmcp-${status.state}`} role="status" aria-live="polite" aria-atomic="true">{status.message}</span>
}
