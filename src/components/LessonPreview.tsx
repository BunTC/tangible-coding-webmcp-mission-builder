import { useState } from 'react'
import type { AdaptationPlan, ClassContext, GroupingPlan, LessonSection, MissionContent, ResourceInventory } from '../domain/lesson-schemas'
import { ProvenanceMarker } from './ProvenanceMarker'

const outputIds = ['teacher-guide', 'pupil-mission-card', 'observation-checklist'] as const
type OutputId = (typeof outputIds)[number]
type AcceptedProvenance = Partial<Record<LessonSection, 'teacher-authored' | 'teacher-accepted'>>

export interface AcceptedLessonPreview {
  classContext: ClassContext
  resources: ResourceInventory
  groupingPlan: GroupingPlan
  mission: MissionContent
  adaptations: AdaptationPlan
  validation: {
    readiness: 'not-checked' | 'blocked' | 'warning' | 'ready'
    preparedOutputs: readonly []
  }
}

interface LessonPreviewProps {
  accepted: AcceptedLessonPreview
  provenance: AcceptedProvenance
  pendingCount: number
}

const outputLabels: Record<OutputId, string> = {
  'teacher-guide': 'Teacher Guide',
  'pupil-mission-card': 'Pupil Mission Card',
  'observation-checklist': 'Observation Checklist',
}

const readinessLabels: Record<AcceptedLessonPreview['validation']['readiness'], string> = {
  'not-checked': 'Not checked',
  blocked: 'Blocked',
  warning: 'Warning',
  ready: 'Ready for teacher review',
}

const supportLabels: Record<AdaptationPlan['supports'][number], string> = {
  'reduced-reading': 'Reduced reading load',
  'visual-instructions': 'Visual instructions',
  'fewer-steps': 'Fewer algorithm steps',
  'additional-time': 'Additional processing time',
  'paired-explanation': 'Paired explanation',
  'predictable-roles': 'Predictable role sequence',
}

const extensionLabels: Record<AdaptationPlan['extensions'][number], string> = {
  'longer-route': 'Longer route',
  'extra-debugging-fault': 'Additional debugging fault',
  'loop-challenge': 'Loop challenge',
  'compare-solutions': 'Compare solutions',
  'design-new-mission': 'Design a new mission',
}

const textOrMissing = (value: string) => value.trim() || 'Not yet added'
const listOrMissing = (values: string[]) => values.filter((value) => value.trim().length > 0)

function Provenance({ section, provenance }: { section: LessonSection; provenance: AcceptedProvenance }) {
  return <ProvenanceMarker type={provenance[section] ?? 'teacher-authored'} />
}

function SectionHeading({ children, section, provenance }: { children: string; section: LessonSection; provenance: AcceptedProvenance }) {
  return <div className="preview-section-heading"><h4>{children}</h4><Provenance section={section} provenance={provenance} /></div>
}

function AcceptedList({ values }: { values: string[] }) {
  const present = listOrMissing(values)
  return present.length > 0 ? <ul>{present.map((value, index) => <li key={`${index}-${value}`}>{value}</li>)}</ul> : <p className="missing-content">Not yet added</p>
}

function CycleStage({ title, content, duration, section, provenance }: { title: string; content: string; duration: number | null; section: LessonSection; provenance: AcceptedProvenance }) {
  return <section className="preview-stage">
    <SectionHeading section={section} provenance={provenance}>{title}</SectionHeading>
    <p className="preview-duration">{duration === null ? 'Duration not yet added' : `${duration} minutes`}</p>
    <p>{textOrMissing(content)}</p>
  </section>
}

function TeacherGuide({ accepted, provenance }: Pick<LessonPreviewProps, 'accepted' | 'provenance'>) {
  const { classContext, resources, groupingPlan, mission, adaptations } = accepted
  const supports = adaptations.supports.map((support) => supportLabels[support])
  const extensions = adaptations.extensions.map((extension) => extensionLabels[extension])
  return <article className="preview-output" aria-labelledby="teacher-guide-title">
    <header className="preview-document-header"><p className="eyebrow">Accepted browser view</p><h3 id="teacher-guide-title">Teacher Guide</h3><h4>{textOrMissing(mission.title)}</h4></header>
    <section className="preview-card"><SectionHeading section="lesson-identity" provenance={provenance}>Lesson overview</SectionHeading><p><strong>Theme:</strong> {textOrMissing(mission.theme)}</p><p><strong>Challenge:</strong> {mission.challengeLevel ?? 'Not yet added'}</p></section>
    <section className="preview-card"><SectionHeading section="class-context" provenance={provenance}>Class context</SectionHeading><dl className="preview-facts"><div><dt>Stage</dt><dd>{classContext.stage}</dd></div><div><dt>Class</dt><dd>{classContext.classSize} fictional pupils</dd></div><div><dt>Duration</dt><dd>{classContext.durationMinutes} minutes</dd></div><div><dt>Focus</dt><dd>{classContext.learningFocus.join(', ')}</dd></div><div><dt>Subject</dt><dd>{classContext.subjectContext}</dd></div><div><dt>Teacher confidence</dt><dd>{classContext.teacherConfidence}</dd></div></dl><p><strong>Goal:</strong> {textOrMissing(classContext.goal ?? '')}</p></section>
    <section className="preview-card"><SectionHeading section="tangible-resources" provenance={provenance}>Preparation and equipment</SectionHeading><dl className="preview-facts"><div><dt>Robots</dt><dd>{resources.robots}</dd></div><div><dt>Tile sets</dt><dd>{resources.tileSets}</dd></div><div><dt>Activity mats</dt><dd>{resources.activityMats}</dd></div><div><dt>Instruction-card packs</dt><dd>{resources.instructionCardPacks}</dd></div><div><dt>Role cards</dt><dd>{resources.roleCards}</dd></div><div><dt>Groups</dt><dd>{groupingPlan.recommendedGroups || 'Not yet available'}</dd></div></dl><p>{groupingPlan.participationRoute || 'A participation route has not yet been established.'}</p>{groupingPlan.warnings.map((warning) => <p className="preview-warning" key={warning}>{warning}</p>)}</section>
    <section className="preview-card"><SectionHeading section="learning-intention" provenance={provenance}>Learning intention</SectionHeading><p>{textOrMissing(mission.learningIntention)}</p></section>
    <section className="preview-card"><SectionHeading section="success-criteria" provenance={provenance}>Success criteria</SectionHeading><AcceptedList values={mission.successCriteria} /></section>
    <section className="preview-card"><SectionHeading section="mission-story" provenance={provenance}>Mission story</SectionHeading><p>{textOrMissing(mission.missionStory)}</p></section>
    <div className="preview-cycle">
      <CycleStage title="Plan" content={mission.plan} duration={mission.planDurationMinutes} section="plan" provenance={provenance} />
      <CycleStage title="Build & Explain" content={mission.buildAndExplain} duration={mission.buildAndExplainDurationMinutes} section="build-and-explain" provenance={provenance} />
      <CycleStage title="Test & Debug" content={mission.testAndDebug} duration={mission.testAndDebugDurationMinutes} section="test-and-debug" provenance={provenance} />
      <CycleStage title="Reflect & Improve" content={mission.reflectAndImprove} duration={mission.reflectAndImproveDurationMinutes} section="reflect-and-improve" provenance={provenance} />
    </div>
    <section className="preview-card"><SectionHeading section="learner-support" provenance={provenance}>Learner support</SectionHeading>{adaptations.noAdditionalAdaptation ? <p>No additional adaptation selected for this lesson.</p> : <><AcceptedList values={supports} /><p><strong>Teacher guidance:</strong> {textOrMissing(adaptations.supportInstructions)}</p></>}</section>
    <section className="preview-card"><SectionHeading section="extension-challenge" provenance={provenance}>Extension challenge</SectionHeading>{adaptations.noAdditionalAdaptation ? <p>No additional adaptation selected for this lesson.</p> : <><AcceptedList values={extensions} /><p><strong>Teacher guidance:</strong> {textOrMissing(adaptations.extensionInstructions)}</p></>}</section>
    <section className="preview-card"><SectionHeading section="assessment-evidence" provenance={provenance}>Assessment evidence</SectionHeading><AcceptedList values={mission.assessmentEvidence} /></section>
  </article>
}

function PupilMissionCard({ accepted, provenance }: Pick<LessonPreviewProps, 'accepted' | 'provenance'>) {
  const { classContext, resources, groupingPlan, mission } = accepted
  return <article className="preview-output pupil-card" aria-labelledby="pupil-card-title">
    <header className="preview-document-header"><p className="eyebrow">Accepted browser view</p><h3 id="pupil-card-title">Pupil Mission Card</h3><h4>{textOrMissing(mission.title)}</h4><p>{classContext.stage} · {classContext.durationMinutes} minutes</p></header>
    <section className="preview-card"><SectionHeading section="mission-story" provenance={provenance}>Your mission</SectionHeading><p>{textOrMissing(mission.missionStory)}</p></section>
    <section className="preview-card"><SectionHeading section="learning-intention" provenance={provenance}>We are learning to</SectionHeading><p>{textOrMissing(mission.learningIntention)}</p></section>
    <div className="preview-cycle">
      <CycleStage title="1. Plan" content={mission.plan} duration={mission.planDurationMinutes} section="plan" provenance={provenance} />
      <CycleStage title="2. Build & Explain" content={mission.buildAndExplain} duration={mission.buildAndExplainDurationMinutes} section="build-and-explain" provenance={provenance} />
      <CycleStage title="3. Test & Debug" content={mission.testAndDebug} duration={mission.testAndDebugDurationMinutes} section="test-and-debug" provenance={provenance} />
      <CycleStage title="4. Reflect & Improve" content={mission.reflectAndImprove} duration={mission.reflectAndImproveDurationMinutes} section="reflect-and-improve" provenance={provenance} />
    </div>
    <section className="preview-card"><SectionHeading section="success-criteria" provenance={provenance}>Success reminders</SectionHeading><AcceptedList values={mission.successCriteria} /></section>
    <section className="preview-card"><SectionHeading section="tangible-resources" provenance={provenance}>Your group and equipment</SectionHeading><p>{groupingPlan.participationRoute || 'A group route has not yet been added.'}</p><p>{resources.robots} robots · {resources.tileSets} tile sets · {resources.activityMats} activity mats · {resources.instructionCardPacks} instruction-card packs</p><p className="missing-content">Group roles have not been specified in the accepted lesson.</p></section>
  </article>
}

function ObservationChecklist({ accepted, provenance }: Pick<LessonPreviewProps, 'accepted' | 'provenance'>) {
  const { classContext, mission } = accepted
  const criteria = listOrMissing(mission.successCriteria)
  return <article className="preview-output observation-checklist" aria-labelledby="observation-title">
    <header className="preview-document-header"><p className="eyebrow">Accepted browser view</p><h3 id="observation-title">Observation Checklist</h3><h4>{textOrMissing(mission.title)}</h4><p>{classContext.stage} · {classContext.classSize} fictional pupils</p></header>
    <section className="preview-card"><SectionHeading section="success-criteria" provenance={provenance}>Observable success criteria</SectionHeading>{criteria.length === 0 ? <p className="missing-content">Not yet added</p> : <div className="checklist-table" role="table" aria-label="Observable success criteria"><div className="checklist-row checklist-header" role="row"><span role="columnheader">Success reminder</span><span role="columnheader">Evidence notes</span></div>{criteria.map((criterion, index) => <div className="checklist-row" role="row" key={`${index}-${criterion}`}><span role="cell">□ {criterion}</span><span role="cell" aria-label={`Blank evidence notes for criterion ${index + 1}`} className="notes-space" /></div>)}</div>}</section>
    <section className="preview-card"><SectionHeading section="assessment-evidence" provenance={provenance}>Assessment evidence to notice</SectionHeading><AcceptedList values={mission.assessmentEvidence} /></section>
    <section className="preview-card"><SectionHeading section="test-and-debug" provenance={provenance}>Debugging observation</SectionHeading><p>{textOrMissing(mission.testAndDebug)}</p></section>
    <section className="preview-card"><SectionHeading section="reflect-and-improve" provenance={provenance}>Reflection prompt</SectionHeading><p>{textOrMissing(mission.reflectAndImprove)}</p></section>
  </article>
}

function lessonCompleteness(accepted: AcceptedLessonPreview) {
  const { mission, adaptations } = accepted
  const stagesComplete = [mission.plan, mission.buildAndExplain, mission.testAndDebug, mission.reflectAndImprove].every((value) => value.trim().length > 0)
  const durationsComplete = [mission.planDurationMinutes, mission.buildAndExplainDurationMinutes, mission.testAndDebugDurationMinutes, mission.reflectAndImproveDurationMinutes].every((value) => value !== null)
  const adaptationComplete = adaptations.noAdditionalAdaptation || adaptations.supportInstructions.trim().length > 0 || adaptations.extensionInstructions.trim().length > 0
  if (!mission.title.trim() && !mission.learningIntention.trim() && !mission.missionStory.trim()) return 'empty'
  return mission.title.trim() && mission.learningIntention.trim() && mission.missionStory.trim() && mission.successCriteria.filter(Boolean).length >= 2 && mission.assessmentEvidence.some(Boolean) && stagesComplete && durationsComplete && adaptationComplete ? 'complete' : 'incomplete'
}

export function LessonPreview({ accepted, provenance, pendingCount }: LessonPreviewProps) {
  const [activeOutput, setActiveOutput] = useState<OutputId>('teacher-guide')
  const completeness = lessonCompleteness(accepted)
  return <div className="lesson-preview">
    <div className="preview-status-row" aria-label="Preview status">
      <strong>{completeness === 'empty' ? 'Accepted lesson is empty' : completeness === 'incomplete' ? 'Incomplete accepted lesson preview' : 'Accepted lesson preview'}</strong>
      <span>Readiness: {readinessLabels[accepted.validation.readiness]}</span>
    </div>
    {pendingCount > 0 && <p className="notice notice-warning">{pendingCount} pending suggestion{pendingCount === 1 ? ' is' : 's are'} excluded from this accepted-content preview.</p>}
    <p className="notice notice-info">This browser-derived preview does not approve the lesson or create prepared files. Teacher approval remains required.</p>
    <p className="preview-implementation-boundary">Live preview of accepted lesson content. No prepared teaching-material files have been generated.</p>
    <div className="preview-toolbar">
      <nav className="preview-output-navigation" aria-label="Lesson preview outputs">{outputIds.map((output) => <button type="button" key={output} aria-current={activeOutput === output ? 'page' : undefined} onClick={() => setActiveOutput(output)}>{outputLabels[output]}</button>)}</nav>
      <button type="button" className="secondary-button print-preview-control" onClick={() => window.print()}>Print current preview</button>
    </div>
    <div className="preview-print-area" data-active-output={activeOutput}>
      {activeOutput === 'teacher-guide' && <TeacherGuide accepted={accepted} provenance={provenance} />}
      {activeOutput === 'pupil-mission-card' && <PupilMissionCard accepted={accepted} provenance={provenance} />}
      {activeOutput === 'observation-checklist' && <ObservationChecklist accepted={accepted} provenance={provenance} />}
    </div>
  </div>
}
