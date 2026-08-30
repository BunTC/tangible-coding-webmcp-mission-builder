import { useEffect, useState } from 'react'
import { ProvenanceMarker } from './ProvenanceMarker'

export interface LessonSummaryProps {
  title: string
  stage: string
  classSize: number
  durationMinutes: number
  readiness: 'not-checked' | 'blocked' | 'warning' | 'ready'
  completedAreas: number
  totalAreas: number
  titleProvenance: 'teacher-authored' | 'teacher-accepted'
}

const readinessLabels: Record<LessonSummaryProps['readiness'], string> = {
  'not-checked': 'Not checked',
  blocked: 'Validation blocked',
  warning: 'Warnings need acknowledgement',
  ready: 'Ready for teacher review',
}

function useNarrowSummary() {
  const query = '(max-width: 760px)'
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches)
  useEffect(() => {
    const media = window.matchMedia?.(query)
    if (!media) return
    const update = () => setNarrow(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])
  return narrow
}

export function LessonSummary({ title, stage, classSize, durationMinutes, readiness, completedAreas, totalAreas, titleProvenance }: LessonSummaryProps) {
  const narrow = useNarrowSummary()
  const facts = <>
    <ProvenanceMarker type={titleProvenance} />
    <dl className="summary-facts">
      <div><dt>Class</dt><dd>{classSize} fictional {stage} pupils</dd></div>
      <div><dt>Duration</dt><dd>{durationMinutes} minutes</dd></div>
      <div><dt>Readiness</dt><dd>{readinessLabels[readiness]}</dd></div>
      <div><dt>Progress</dt><dd>{completedAreas} of {totalAreas} lesson areas complete</dd></div>
    </dl>
    <p className="summary-boundary">Validation and accepting proposals never approve a lesson.</p>
  </>
  if (narrow) return <aside className="lesson-summary-panel lesson-summary-narrow" aria-label="Lesson summary">
    <details>
      <summary><span className="narrow-summary-copy"><strong>{title}</strong><span>{readinessLabels[readiness]}</span></span><span className="narrow-summary-action">Summary details</span></summary>
      <div className="narrow-summary-details">{facts}</div>
    </details>
    <ProvenanceMarker type="teacher-approval-required" />
  </aside>
  return <aside className="lesson-summary-panel" aria-labelledby="lesson-summary-title">
    <div className="summary-heading"><p className="eyebrow">Accepted lesson</p><h2 id="lesson-summary-title">Lesson summary</h2></div>
    <strong className="summary-title">{title}</strong>
    {facts}
    <ProvenanceMarker type="teacher-approval-required" />
  </aside>
}
