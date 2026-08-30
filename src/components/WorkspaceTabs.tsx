import { useEffect, useRef, useState } from 'react'

const WORKSPACE_DESTINATIONS = ['setup', 'mission', 'adapt', 'review', 'validate', 'preview'] as const
export type WorkspaceId = (typeof WORKSPACE_DESTINATIONS)[number]

const labels: Record<WorkspaceId, string> = { setup: 'Setup', mission: 'Mission', adapt: 'Adapt', review: 'Review', validate: 'Validate', preview: 'Preview' }

interface WorkspaceTabsProps {
  active: WorkspaceId
  onNavigate: (workspace: WorkspaceId) => void
  pendingCount: number
  validationStatus: 'not-checked' | 'blocked' | 'warning' | 'ready'
}

function useCompactNavigation() {
  const query = '(max-width: 760px)'
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches)
  useEffect(() => {
    const media = window.matchMedia?.(query)
    if (!media) return
    const update = () => setCompact(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])
  return compact
}

export function WorkspaceTabs({ active, onNavigate, pendingCount, validationStatus }: WorkspaceTabsProps) {
  const compact = useCompactNavigation()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreButton = useRef<HTMLButtonElement>(null)
  const moreMenuWrap = useRef<HTMLDivElement>(null)
  const activeIndex = WORKSPACE_DESTINATIONS.indexOf(active)
  const directDestinations = compact ? WORKSPACE_DESTINATIONS.slice(0, 4) : WORKSPACE_DESTINATIONS
  const overflowDestinations = compact ? WORKSPACE_DESTINATIONS.slice(4) : []
  const navigate = (workspace: WorkspaceId) => { setMoreOpen(false); onNavigate(workspace) }
  const closeMore = () => { setMoreOpen(false); moreButton.current?.focus() }

  useEffect(() => {
    if (!moreOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); closeMore() } }
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!moreMenuWrap.current?.contains(event.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
    }
  }, [moreOpen])

  const destinationLabel = (workspace: WorkspaceId) => {
    if (workspace === 'review') return <>{labels[workspace]} <span className="workspace-badge" aria-label={`${pendingCount} pending proposal operations`}>{pendingCount}</span></>
    if (workspace === 'validate') return <>{labels[workspace]} <span className={`readiness-dot readiness-${validationStatus}`}>{validationStatus === 'not-checked' ? 'Not checked' : validationStatus}</span></>
    return labels[workspace]
  }

  return <div className="workspace-navigation">
    <nav aria-label="Mission Builder workspaces">
      <div className="workspace-links">
        {directDestinations.map((workspace) => <button type="button" className="workspace-link" aria-current={active === workspace ? 'page' : undefined} key={workspace} onClick={() => navigate(workspace)}>{destinationLabel(workspace)}</button>)}
        {compact && <div className="more-menu-wrap" ref={moreMenuWrap}>
          <button ref={moreButton} type="button" className="workspace-link more-button" aria-expanded={moreOpen} aria-haspopup="menu" onClick={() => setMoreOpen((open) => !open)}>More</button>
          {moreOpen && <div className="more-menu" role="menu">{overflowDestinations.map((workspace) => <button type="button" role="menuitem" aria-current={active === workspace ? 'page' : undefined} key={workspace} onClick={() => { navigate(workspace); requestAnimationFrame(() => moreButton.current?.focus()) }}>{destinationLabel(workspace)}</button>)}</div>}
        </div>}
      </div>
    </nav>
    <div className="workspace-sequence" aria-label="Workspace sequence controls">
      <button type="button" className="secondary-button" disabled={activeIndex === 0} aria-label={activeIndex > 0 ? `Back to ${labels[WORKSPACE_DESTINATIONS[activeIndex - 1]]}` : 'Back'} onClick={() => navigate(WORKSPACE_DESTINATIONS[activeIndex - 1])}>Back</button>
      <span>{activeIndex + 1} of {WORKSPACE_DESTINATIONS.length}</span>
      <button type="button" className="primary-button" disabled={activeIndex === WORKSPACE_DESTINATIONS.length - 1} aria-label={activeIndex < WORKSPACE_DESTINATIONS.length - 1 ? `Next to ${labels[WORKSPACE_DESTINATIONS[activeIndex + 1]]}` : 'Next'} onClick={() => navigate(WORKSPACE_DESTINATIONS[activeIndex + 1])}>Next</button>
    </div>
  </div>
}
