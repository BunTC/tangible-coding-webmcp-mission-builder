import { useId } from 'react'

export type ProvenanceType = 'ai-suggestion' | 'teacher-authored' | 'teacher-accepted' | 'awaiting-teacher' | 'teacher-approval-required'

const markerDetails: Record<ProvenanceType, { label: string; description: string; icon: 'sparkle' | 'pencil' | 'check' | 'amber' | 'shield' }> = {
  'ai-suggestion': { label: 'AI suggestion', description: 'AI-originated content or action that remains subject to teacher review.', icon: 'sparkle' },
  'teacher-authored': { label: 'Teacher authored', description: 'This accepted content is currently attributed to the teacher.', icon: 'pencil' },
  'teacher-accepted': { label: 'Teacher accepted', description: 'The teacher accepted this AI contribution and it remains the current value.', icon: 'check' },
  'awaiting-teacher': { label: 'Awaiting teacher', description: 'This proposal is pending and has not changed accepted lesson content.', icon: 'amber' },
  'teacher-approval-required': { label: 'Teacher approval required', description: 'Only a teacher may approve the lesson; approval is not implemented here.', icon: 'shield' },
}

function MarkerIcon({ icon }: { icon: (typeof markerDetails)[ProvenanceType]['icon'] }) {
  if (icon === 'sparkle') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2Zm6 12 .9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9L18 14Z" /></svg>
  if (icon === 'pencil') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16-.8 4 4-.8L18.4 8 16 5.6 4 16Zm13.4-11.4 1.2-1.2a1.4 1.4 0 0 1 2 0 1.4 1.4 0 0 1 0 2L19.4 6.6l-2-2Z" /></svg>
  if (icon === 'check') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 17.2 4.8 12.5l2-2 2.7 2.7 7.7-7.7 2 2-9.7 9.7Z" /></svg>
  if (icon === 'amber') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 20 5v6c0 5.1-3.4 9.4-8 11-4.6-1.6-8-5.9-8-11V5l8-3Zm0 4.1L8 7.6V11c0 2.9 1.6 5.5 4 6.8 2.4-1.3 4-3.9 4-6.8V7.6l-4-1.5Z" /></svg>
}

export function ProvenanceMarker({ type, label }: { type: ProvenanceType; label?: string }) {
  const tooltipId = useId()
  const detail = markerDetails[type]
  return <span className={`provenance-marker provenance-${type}`} tabIndex={0} aria-describedby={tooltipId}>
    <MarkerIcon icon={detail.icon} />
    <span>{label ?? detail.label}</span>
    <span className="provenance-tooltip" id={tooltipId} role="tooltip">{detail.description}</span>
  </span>
}
