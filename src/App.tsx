import { useMemo, useState, type ChangeEvent } from 'react'
import './App.css'
import { lostStoryPathMission } from './domain/lesson-factories'
import { changeOperationSchema, classContextSchema, durationMinutesSchema, primaryStageSchema, type AdaptationPlan, type ChangeOperation, type ClassContext, type LessonDraft, type MissionContent, type ResourceInventory } from './domain/lesson-schemas'
import { deriveChangeSetStatus, getSectionAttribution, getSectionValue, structurallyEqual } from './domain/lesson-change-control'
import { useLessonStore } from './state/lesson-store'
import { useWebMcp, type WebMcpStatus } from './webmcp/use-webmcp'
import { WebMcpStatusIndicator } from './webmcp/webmcp-status'

const journeySteps = ['Start', 'Class context', 'Resources', 'Build mission', 'Adapt learners', 'Validate', 'Review changes', 'Teacher approval', 'Preview & print']
const durations = [30, 45, 60, 90] as const
const focuses: ClassContext['learningFocus'][number][] = ['sequencing', 'algorithms', 'loops', 'debugging', 'conditionals', 'collaboration']
const resourceFields: Array<{ key: keyof Pick<ResourceInventory, 'robots' | 'tileSets' | 'activityMats' | 'instructionCardPacks' | 'roleCards'>; label: string; max: number }> = [
  { key: 'robots', label: 'Robots', max: 12 }, { key: 'tileSets', label: 'Tile sets', max: 30 },
  { key: 'activityMats', label: 'Activity mats', max: 12 }, { key: 'instructionCardPacks', label: 'Instruction-card packs', max: 12 },
  { key: 'roleCards', label: 'Pupil role cards', max: 40 },
]
const supportOptions: Array<{ value: AdaptationPlan['supports'][number]; label: string }> = [
  { value: 'reduced-reading', label: 'Reduced reading load' }, { value: 'visual-instructions', label: 'Visual instructions' },
  { value: 'fewer-steps', label: 'Fewer algorithm steps' }, { value: 'additional-time', label: 'Additional processing time' },
  { value: 'paired-explanation', label: 'Paired explanation' }, { value: 'predictable-roles', label: 'Predictable role sequence' },
]
const extensionOptions: Array<{ value: AdaptationPlan['extensions'][number]; label: string }> = [
  { value: 'longer-route', label: 'Longer route' }, { value: 'extra-debugging-fault', label: 'Additional debugging fault' },
  { value: 'loop-challenge', label: 'Loop challenge' }, { value: 'compare-solutions', label: 'Compare solutions' },
  { value: 'design-new-mission', label: 'Design a new mission' },
]
const durationFields = {
  planDurationMinutes: 'Plan',
  buildAndExplainDurationMinutes: 'Build & Explain',
  testAndDebugDurationMinutes: 'Test & Debug',
  reflectAndImproveDurationMinutes: 'Reflect & Improve',
} as const
type DurationField = keyof typeof durationFields

type WebMcpGuidanceArea = 'adaptation' | 'validation-control' | 'change-review' | 'validation-panel'

function webMcpWorkflowGuidance(status: WebMcpStatus, area: WebMcpGuidanceArea) {
  const manualFallback = status.state === 'unavailable'
    ? 'WebMCP is unavailable in this browser; Manual Steps 1–7 remain available.'
    : status.state === 'error'
      ? status.message.includes('inaccessible or malformed')
        ? 'The browser WebMCP registration surface is inaccessible or malformed; Manual Steps 1–7 remain available.'
        : 'WebMCP registration failed; Manual Steps 1–7 remain available.'
      : status.state === 'incomplete'
        ? 'WebMCP is supported, but tool integration is incomplete; Manual Steps 1–7 remain available.'
        : status.state === 'registering'
          ? 'WebMCP is registering all five tools; Manual Steps 1–7 remain available while registration completes.'
          : null

  if (manualFallback) return manualFallback
  if (area === 'adaptation') return 'WebMCP learner-adaptation proposals are available. Teacher selections in Manual Step 5 remain directly authored by the teacher.'
  if (area === 'validation-control') return 'Manual Step 6 remains available. WebMCP validation is also available through validate_and_prepare_lesson.'
  if (area === 'change-review') return 'No pending agent changes. WebMCP content tools create proposals here only after they are invoked; accepted lesson content changes only after teacher review.'
  return 'WebMCP validation is available through validate_and_prepare_lesson. Output preparation is not implemented, preparedOutputs remains empty, and only a human teacher may approve.'
}

function App() {
  const { draft, dispatch, getDraft, receiveChangeSet, runValidation } = useLessonStore()
  const webMcpCommands = useMemo(() => ({ getDraft, receiveChangeSet, runValidation }), [getDraft, receiveChangeSet, runValidation])
  const webMcpStatus = useWebMcp(webMcpCommands)
  const { classContext, resources, groupingPlan } = draft
  const { mission, adaptations } = draft
  const [missionStart, setMissionStart] = useState<'sample' | 'blank'>('sample')
  const [classSizeInput, setClassSizeInput] = useState(String(classContext.classSize))
  const [adaptationErrors, setAdaptationErrors] = useState({ support: false, extension: false })
  const [durationInputs, setDurationInputs] = useState<Record<DurationField, string>>(() => Object.fromEntries(
    Object.keys(durationFields).map((key) => [key, mission[key as DurationField] == null ? '' : String(mission[key as DurationField])]),
  ) as Record<DurationField, string>)
  const missionExists = mission.title.trim().length > 0
  const adaptationComplete = !adaptationErrors.support && !adaptationErrors.extension && (
    adaptations.noAdditionalAdaptation
    || adaptations.supportInstructions.trim().length > 0
    || adaptations.extensionInstructions.trim().length > 0
  )
  const classSizeResult = /^\d+$/.test(classSizeInput)
    ? classContextSchema.shape.classSize.safeParse(Number(classSizeInput))
    : { success: false as const }
  const updateClassContext = (patch: Partial<ClassContext>) => dispatch({ type: 'update-class-context', payload: { ...classContext, ...patch } })
  const updateResource = (key: keyof ResourceInventory, value: number | boolean) => dispatch({ type: 'update-resources', payload: { ...resources, [key]: value } })
  const updateMission = (patch: Partial<MissionContent>) => dispatch({ type: 'update-mission', payload: { ...mission, ...patch } })
  const updateAdaptations = (patch: Partial<AdaptationPlan>) => dispatch({ type: 'update-adaptations', payload: { ...adaptations, ...patch, sectionsToUpdate: [] } })
  const updateMissionList = (key: 'successCriteria' | 'assessmentEvidence', index: number, value: string) => {
    const items = Array.from({ length: Math.max(index + 1, mission[key].length) }, (_, itemIndex) => mission[key][itemIndex] ?? '')
    items[index] = value
    updateMission({ [key]: items })
  }
  const resetDurationInputs = (values?: MissionContent) => setDurationInputs(Object.fromEntries(
    Object.keys(durationFields).map((key) => [key, values?.[key as DurationField] == null ? '' : String(values[key as DurationField])]),
  ) as Record<DurationField, string>)
  const updateStageDuration = (key: DurationField, value: string) => {
    setDurationInputs((current) => ({ ...current, [key]: value }))
    const parsed = /^\d+$/.test(value) ? Number(value) : null
    updateMission({ [key]: parsed !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : null })
  }
  const buildMission = () => {
    setAdaptationErrors({ support: false, extension: false })
    resetDurationInputs(missionStart === 'sample' ? lostStoryPathMission : undefined)
    dispatch({ type: missionStart === 'sample' ? 'load-sample-mission' : 'clear-mission' })
  }
  const handleAdaptationOption = (kind: 'supports' | 'extensions', value: string, checked: boolean) => {
    const current = adaptations[kind] as string[]
    updateAdaptations({ [kind]: checked ? [...current, value] : current.filter((option) => option !== value), noAdditionalAdaptation: false })
  }
  const handleAdaptationInstructions = (kind: 'support' | 'extension', value: string) => {
    if (value.length > 500) {
      setAdaptationErrors((current) => ({ ...current, [kind]: true }))
      return
    }
    setAdaptationErrors((current) => ({ ...current, [kind]: false }))
    updateAdaptations({ [`${kind}Instructions`]: value, noAdditionalAdaptation: false })
  }
  const handleNoAdditionalAdaptation = (checked: boolean) => {
    if (checked) setAdaptationErrors({ support: false, extension: false })
    updateAdaptations({ noAdditionalAdaptation: checked })
  }
  const updateClassSizeInput = (value: string) => {
    setClassSizeInput(value)
    const result = /^\d+$/.test(value)
      ? classContextSchema.shape.classSize.safeParse(Number(value))
      : { success: false as const }
    if (result.success) updateClassContext({ classSize: result.data })
  }
  const resetDraft = () => {
    setClassSizeInput('24')
    setAdaptationErrors({ support: false, extension: false })
    resetDurationInputs()
    dispatch({ type: 'reset-demo' })
  }
  const loadDemo = () => {
    setClassSizeInput('24')
    setAdaptationErrors({ support: false, extension: false })
    resetDurationInputs()
    dispatch({ type: 'load-demo' })
  }
  const handleFocus = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as ClassContext['learningFocus'][number]
    const next = event.target.checked ? [...classContext.learningFocus, value] : classContext.learningFocus.filter((focus) => focus !== value)
    if (next.length > 0) updateClassContext({ learningFocus: next })
  }

  return <div className="app-shell">
    <header className="product-header">
      <div className="brand-lockup"><span className="brand-mark" aria-hidden="true">TC</span><div><p className="eyebrow">Tangible Coding Studio</p><h1>Mission Builder</h1></div></div>
      <div className="header-state" aria-label="Lesson status"><WebMcpStatusIndicator status={webMcpStatus} /><strong>Teacher approval required</strong></div>
    </header>
    <main className="workspace">
      <aside className="panel journey-panel">
        <div className="panel-heading"><p className="eyebrow">Journey</p><h2>Manual setup</h2></div>
        <nav aria-label="Mission Builder journey"><ol className="journey-list">{journeySteps.map((step, index) => <li className={index < 7 ? 'current-step' : ''} key={step}><span>{index + 1}</span>{step}</li>)}</ol></nav>
        <section className="setup-controls" aria-labelledby="start-title"><h3 id="start-title">1. Start</h3><p>Create a clean fictional draft or load the approved P4 context.</p><button type="button" className="primary-button" onClick={resetDraft}>Start New Mission</button><button type="button" className="secondary-button" onClick={loadDemo}>Load P4 Demo</button></section>
        <form className="setup-controls" aria-labelledby="class-title">
          <h3 id="class-title">2. Class context</h3>
          <label>Primary stage<select value={classContext.stage} onChange={(event) => updateClassContext({ stage: primaryStageSchema.parse(event.target.value) })}>{primaryStageSchema.options.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
          <label>Class size<input type="number" min="1" max="40" value={classSizeInput} aria-invalid={!classSizeResult.success} aria-describedby={!classSizeResult.success ? 'class-size-error' : undefined} onChange={(event) => updateClassSizeInput(event.target.value)} /></label>
          {!classSizeResult.success && <p id="class-size-error" role="alert">Enter a whole number from 1 to 40.</p>}
          <label>Duration<select value={classContext.durationMinutes} onChange={(event) => updateClassContext({ durationMinutes: durationMinutesSchema.parse(Number(event.target.value)) })}>{durations.map((duration) => <option key={duration} value={duration}>{duration} minutes</option>)}</select></label>
          <fieldset><legend>Learning focus</legend>{focuses.map((focus) => <label className="check-label" key={focus}><input type="checkbox" value={focus} checked={classContext.learningFocus.includes(focus)} onChange={handleFocus} />{focus}</label>)}</fieldset>
          <label>Subject context<select value={classContext.subjectContext} onChange={(event) => updateClassContext({ subjectContext: event.target.value as ClassContext['subjectContext'] })}><option value="computing">Computing</option><option value="literacy">Literacy</option><option value="maths">Maths</option><option value="STEM">STEM</option><option value="IDL">IDL</option></select></label>
          <label>Teacher confidence<select value={classContext.teacherConfidence} onChange={(event) => updateClassContext({ teacherConfidence: event.target.value as ClassContext['teacherConfidence'] })}><option value="beginner">Beginner</option><option value="developing">Developing</option><option value="confident">Confident</option></select></label>
          <label>Lesson goal<textarea maxLength={280} value={classContext.goal ?? ''} onChange={(event) => updateClassContext({ goal: event.target.value })} /></label>
        </form>
        <section className="setup-controls" aria-labelledby="resources-title"><h3 id="resources-title">3. Tangible resources</h3>{resourceFields.map(({ key, label, max }) => <div className="stepper" key={key}><span id={`${key}-label`}>{label}</span><button type="button" aria-label={`Decrease ${label}`} disabled={resources[key] === 0} onClick={() => updateResource(key, resources[key] - 1)}>−</button><output aria-labelledby={`${key}-label`}>{resources[key]}</output><button type="button" aria-label={`Increase ${label}`} disabled={resources[key] === max} onClick={() => updateResource(key, resources[key] + 1)}>+</button></div>)}<label className="check-label tile-only-control"><input type="checkbox" checked={resources.allowTileOnlyGroups} onChange={(event) => updateResource('allowTileOnlyGroups', event.target.checked)} />Allow tile-only groups without a robot</label></section>
        <section className="setup-controls" aria-labelledby="mission-controls-title"><h3 id="mission-controls-title">4. Build mission</h3><label>Starting method<select value={missionStart} onChange={(event) => setMissionStart(event.target.value as 'sample' | 'blank')}><option value="sample">Load sample mission</option><option value="blank">Teacher starts from a blank structure</option></select></label><label>Mission theme<input value={mission.theme} maxLength={160} placeholder="e.g. A lost story path" onChange={(event) => updateMission({ theme: event.target.value })} /></label><label>Challenge level<select value={mission.challengeLevel ?? ''} onChange={(event) => updateMission({ challengeLevel: event.target.value ? event.target.value as MissionContent['challengeLevel'] : null })}><option value="">Choose a level</option><option value="introductory">Introductory</option><option value="core">Core</option><option value="stretch">Stretch</option></select></label><button type="button" className="primary-button" onClick={buildMission}>Build mission</button><p>The sample is limited fictional prototype content, not a finished commercial curriculum pack.</p></section>
        <section className="setup-controls adaptation-controls" aria-labelledby="adapt-controls-title" aria-describedby={!missionExists ? 'adapt-unavailable' : undefined}>
          <h3 id="adapt-controls-title">5. Adapt learners</h3>
          {!missionExists && <p id="adapt-unavailable" className="blocking-note">Build or name a mission before recording learner adaptations.</p>}
          <p id="support-options-description">Select any class-level access approaches that apply.</p>
          <fieldset disabled={!missionExists} aria-describedby="support-options-description"><legend>Learner supports</legend>{supportOptions.map(({ value, label }) => <label className="check-label" key={value}><input type="checkbox" checked={adaptations.supports.includes(value)} onChange={(event) => handleAdaptationOption('supports', value, event.target.checked)} />{label}</label>)}</fieldset>
          <AdaptationInstructions kind="support" label="Support instructions" description="Describe the class-level support the teacher will provide." value={adaptations.supportInstructions} disabled={!missionExists} invalid={adaptationErrors.support} onChange={(value) => handleAdaptationInstructions('support', value)} />
          <p id="extension-options-description">Select any class-level challenge approaches that apply.</p>
          <fieldset disabled={!missionExists} aria-describedby="extension-options-description"><legend>Extension challenges</legend>{extensionOptions.map(({ value, label }) => <label className="check-label" key={value}><input type="checkbox" checked={adaptations.extensions.includes(value)} onChange={(event) => handleAdaptationOption('extensions', value, event.target.checked)} />{label}</label>)}</fieldset>
          <AdaptationInstructions kind="extension" label="Extension instructions" description="Describe the class-level extension challenge." value={adaptations.extensionInstructions} disabled={!missionExists} invalid={adaptationErrors.extension} onChange={(value) => handleAdaptationInstructions('extension', value)} />
          <label className="check-label decline-control"><input type="checkbox" disabled={!missionExists} checked={adaptations.noAdditionalAdaptation} aria-describedby="decline-description" onChange={(event) => handleNoAdditionalAdaptation(event.target.checked)} />No additional adaptation for this demo</label>
          <p id="decline-description">Select this to clear current adaptation decisions and explicitly complete Step 5 without them.</p>
          <p className={`adaptation-status ${missionExists && adaptationComplete ? 'complete' : ''}`} role="status" aria-label="Step 5 completion status" aria-live="polite" aria-atomic="true">{!missionExists ? 'Step 5 unavailable' : adaptationComplete ? 'Step 5 complete' : 'Step 5 incomplete: add support or extension instructions, or explicitly decline additional adaptation.'}</p>
          <p>{webMcpWorkflowGuidance(webMcpStatus, 'adaptation')}</p>
        </section>
        <section className="setup-controls validation-controls" aria-labelledby="validation-controls-title">
          <h3 id="validation-controls-title">6. Validate lesson</h3>
          <p>Run deterministic checks against the current teacher-edited draft.</p>
          <button type="button" className="primary-button" disabled={!missionExists || !adaptationComplete} onClick={() => dispatch({ type: 'run-validation' })}>Run validation</button>
          {(!missionExists || !adaptationComplete) && <p className="blocking-note">Complete Steps 4 and 5 before validation.</p>}
          <p>{webMcpWorkflowGuidance(webMcpStatus, 'validation-control')}</p>
        </section>
      </aside>
      <section className="lesson-canvas" aria-labelledby="lesson-title">
        <div className="canvas-intro"><div><p className="eyebrow">Fictional lesson draft</p><h2 id="lesson-title">{draft.title}</h2><p className="lesson-summary">Manual Steps 1–6 update this shared lesson canvas. Teacher edits and validation are saved locally in this browser.</p></div><span className="draft-badge">{draft.status === 'ready' ? 'Ready for teacher review' : draft.status}</span></div>
        <dl className="context-strip"><div><dt>Class</dt><dd>{classContext.classSize} fictional {classContext.stage} pupils</dd></div><div><dt>Duration</dt><dd>{classContext.durationMinutes} minutes</dd></div><div><dt>Focus</dt><dd>{classContext.learningFocus.join(', ')}</dd></div></dl>
        <section className="canvas-card" aria-labelledby="brief-title"><div className="card-kicker">Class brief</div><h3 id="brief-title">{classContext.subjectContext} · {classContext.teacherConfidence} confidence</h3><p>{classContext.goal || 'Add an optional fictional lesson goal.'}</p></section>
        <section className="canvas-card resource-plan" aria-labelledby="plan-title"><div className="card-kicker">Resource plan</div><h3 id="plan-title">Current tangible inventory</h3><dl className="inventory-grid">{resourceFields.map(({ key, label }) => <div key={key}><dt>{label}</dt><dd>{resources[key]}</dd></div>)}</dl><div className="grouping-status" role="status" aria-label="Grouping calculation status" aria-live="polite" aria-atomic="true"><dl className="grouping-summary"><div><dt>Required groups</dt><dd>{groupingPlan.recommendedGroups || 'None'}</dd></div><div><dt>Simultaneous capacity</dt><dd>{groupingPlan.simultaneousCapacity}</dd></div><div><dt>Pupils per group</dt><dd>{groupingPlan.pupilsPerGroup || 'None'}</dd></div><div><dt>Rotation</dt><dd>{groupingPlan.rotationRequired ? 'Required' : 'Not required'}</dd></div><div><dt>Tile-only groups</dt><dd>{resources.allowTileOnlyGroups ? 'Enabled' : 'Disabled'}</dd></div></dl>{groupingPlan.participationRoute && <p>{groupingPlan.participationRoute}</p>}</div>{groupingPlan.warnings.map((warning) => <p className="blocking-warning" role="alert" key={warning}>{warning}</p>)}</section>
        <section className="mission-section" aria-labelledby="mission-section-title"><div className="section-heading"><div><p className="eyebrow">Structured lesson canvas</p><h3 id="mission-section-title">Mission content</h3></div><span>Manual draft</span></div>
          <MissionTextCard label="Lesson identity" title="Mission title" value={mission.title} maxLength={100} onChange={(value) => updateMission({ title: value })} />
          <MissionTextCard label="Learning intention" title="What pupils are learning" value={mission.learningIntention} maxLength={240} onChange={(value) => updateMission({ learningIntention: value })} />
          <MissionListCard label="Success criteria" items={mission.successCriteria} minimumRows={2} maximumRows={4} maxLength={180} onChange={(index, value) => updateMissionList('successCriteria', index, value)} onAdd={() => updateMission({ successCriteria: [...mission.successCriteria, ''] })} />
          <MissionTextCard label="Mission story or problem" title="The challenge" value={mission.missionStory} maxLength={700} onChange={(value) => updateMission({ missionStory: value })} />
          <MissionTextCard label="Plan" title="Plan" value={mission.plan} maxLength={500} durationValue={durationInputs.planDurationMinutes} onDurationChange={(value) => updateStageDuration('planDurationMinutes', value)} onChange={(value) => updateMission({ plan: value })} />
          <MissionTextCard label="Build & Explain" title="Build & Explain" value={mission.buildAndExplain} maxLength={500} durationValue={durationInputs.buildAndExplainDurationMinutes} onDurationChange={(value) => updateStageDuration('buildAndExplainDurationMinutes', value)} onChange={(value) => updateMission({ buildAndExplain: value })} />
          <MissionTextCard label="Test & Debug" title="Test & Debug" value={mission.testAndDebug} maxLength={500} durationValue={durationInputs.testAndDebugDurationMinutes} onDurationChange={(value) => updateStageDuration('testAndDebugDurationMinutes', value)} onChange={(value) => updateMission({ testAndDebug: value })} />
          <MissionTextCard label="Reflect & Improve" title="Reflect & Improve" value={mission.reflectAndImprove} maxLength={500} durationValue={durationInputs.reflectAndImproveDurationMinutes} onDurationChange={(value) => updateStageDuration('reflectAndImproveDurationMinutes', value)} onChange={(value) => updateMission({ reflectAndImprove: value })} />
          <section className="canvas-card editable-card"><div className="card-kicker">Group and equipment plan</div><h3>Resource-aware participation</h3><p>{groupingPlan.participationRoute ? `${groupingPlan.recommendedGroups} required groups; ${groupingPlan.simultaneousCapacity} can use a station at once.${groupingPlan.rotationRequired ? ' A station rotation is included.' : ''}` : 'Resolve the resource warning before planning participation.'}</p></section>
          <MissionListCard label="Assessment evidence" items={mission.assessmentEvidence} minimumRows={1} maximumRows={5} maxLength={180} onChange={(index, value) => updateMissionList('assessmentEvidence', index, value)} onAdd={() => updateMission({ assessmentEvidence: [...mission.assessmentEvidence, ''] })} />
        </section>
        <section className="adaptation-section" aria-labelledby="adaptation-section-title"><div className="section-heading"><div><p className="eyebrow">Manual learner decisions</p><h3 id="adaptation-section-title">Learner adaptation</h3></div><span>{adaptationComplete ? 'Complete' : 'Incomplete'}</span></div>
          <AdaptationCard title="Access and support" selected={supportOptions.filter(({ value }) => adaptations.supports.includes(value)).map(({ label }) => label)} instructions={adaptations.supportInstructions} declined={adaptations.noAdditionalAdaptation} />
          <AdaptationCard title="Extension challenge" selected={extensionOptions.filter(({ value }) => adaptations.extensions.includes(value)).map(({ label }) => label)} instructions={adaptations.extensionInstructions} declined={adaptations.noAdditionalAdaptation} />
        </section>
        <ChangeReview draft={draft} webMcpStatus={webMcpStatus} onResolve={(changeSetId, operationId, decision, acceptedValue) => dispatch({ type: 'resolve-change-operation', payload: { changeSetId, operationId, decision, acceptedValue } })} />
      </section>
      <ValidationPanel draft={draft} webMcpStatus={webMcpStatus} onAcknowledge={(id) => dispatch({ type: 'acknowledge-warning', payload: id })} />
    </main>
  </div>
}

function formatReviewValue(value: unknown) {
  return JSON.stringify(value, null, 2)
}

function ChangeReview({ draft, webMcpStatus, onResolve }: { draft: LessonDraft; webMcpStatus: WebMcpStatus; onResolve: (changeSetId: string, operationId: string, decision: 'accept' | 'edit-and-accept' | 'reject', acceptedValue?: unknown) => void }) {
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const activeSetOperations = draft.pendingChanges.flatMap((set) => set.operations.map((operation) => ({ set, operation })))
  const pendingOperations = activeSetOperations.filter(({ operation }) => operation.status === 'pending')
  const resolvedActiveOperations = activeSetOperations.filter(({ operation }) => operation.status !== 'pending')
  const editAndAccept = (changeSetId: string, operation: ChangeOperation) => {
    try {
      const value = JSON.parse(edits[operation.operationId] ?? formatReviewValue(operation.proposed))
      const candidate = changeOperationSchema.safeParse({ ...operation, acceptedValue: value, status: 'accepted', resolution: { outcome: 'accepted', decidedAt: '2000-01-01T00:00:00.000Z', teacherModified: true } })
      if (!candidate.success) throw new Error('Invalid section value')
      setErrors((current) => ({ ...current, [operation.operationId]: '' }))
      onResolve(changeSetId, operation.operationId, 'edit-and-accept', value)
    } catch {
      setErrors((current) => ({ ...current, [operation.operationId]: 'Enter a valid JSON value for this section.' }))
    }
  }
  return <section className="change-review" aria-labelledby="change-review-title">
    <div className="section-heading"><div><p className="eyebrow">Human change control</p><h3 id="change-review-title">7. Review agent changes</h3></div><span>{pendingOperations.length} pending</span></div>
    {pendingOperations.length === 0 ? <div className="canvas-card"><p>{webMcpWorkflowGuidance(webMcpStatus, 'change-review')}</p></div> : pendingOperations.map(({ set, operation }) => {
      const current = getSectionValue(draft, operation.section)
      const stale = !structurallyEqual(current, operation.before)
      const descriptionId = `${operation.operationId}-description`
      const errorId = `${operation.operationId}-error`
      return <article className={`change-card ${stale ? 'change-stale' : ''}`} key={operation.operationId} aria-labelledby={`${operation.operationId}-title`}>
        <header><div><p className="card-kicker">{set.toolName}</p><h4 id={`${operation.operationId}-title`}>{operation.section}</h4></div><strong>{stale ? 'Conflict · will supersede' : operation.status}</strong></header>
        <p id={descriptionId}>Proposal {set.changeSetId} · operation {operation.operationId} · validation {operation.validation.valid ? 'valid' : 'invalid'}</p>
        {operation.validation.messages.length > 0 && <ul>{operation.validation.messages.map((message) => <li key={message}>{message}</li>)}</ul>}
        <div className="change-values"><section><h5>Current accepted value</h5><pre>{formatReviewValue(current)}</pre></section><section><h5>Proposed value</h5><pre>{formatReviewValue(operation.proposed)}</pre></section></div>
        <label htmlFor={`${operation.operationId}-edit`}>Teacher-edited accepted value (JSON)</label>
        <textarea id={`${operation.operationId}-edit`} value={edits[operation.operationId] ?? formatReviewValue(operation.proposed)} aria-describedby={`${descriptionId}${errors[operation.operationId] ? ` ${errorId}` : ''}`} aria-invalid={Boolean(errors[operation.operationId])} onChange={(event) => setEdits((currentEdits) => ({ ...currentEdits, [operation.operationId]: event.target.value }))} />
        {errors[operation.operationId] && <p id={errorId} role="alert">{errors[operation.operationId]}</p>}
        <div className="change-actions"><button type="button" className="primary-button" onClick={() => onResolve(set.changeSetId, operation.operationId, 'accept')}>Accept {operation.section}</button><button type="button" className="secondary-button" onClick={() => editAndAccept(set.changeSetId, operation)}>Edit and accept {operation.section}</button><button type="button" className="secondary-button" onClick={() => onResolve(set.changeSetId, operation.operationId, 'reject')}>Reject {operation.section}</button></div>
      </article>
    })}
    {resolvedActiveOperations.length > 0 && <section className="change-history" aria-labelledby="active-resolution-title"><h4 id="active-resolution-title">Resolved sections in active proposals</h4><ul>{resolvedActiveOperations.map(({ set, operation }) => <li key={operation.operationId}><strong>{set.changeSetId}</strong> · {operation.section}: {operation.status}{operation.resolution?.teacherModified ? ' · teacher modified' : ''}</li>)}</ul></section>}
    {draft.changeHistory.length > 0 && <section className="change-history" aria-labelledby="change-history-title"><h4 id="change-history-title">Resolved proposal history</h4><ul>{[...draft.changeHistory].reverse().map((set) => <li key={set.changeSetId}><strong>{set.changeSetId}</strong> · {set.toolName} · {deriveChangeSetStatus(set)}<ul>{set.operations.map((operation) => {
      const attribution = operation.status === 'accepted' ? getSectionAttribution(draft, operation.section) : undefined
      const isCurrentAttribution = attribution?.operationId === operation.operationId
      return <li key={operation.operationId}><span>{operation.section}: {operation.status}{operation.resolution?.teacherModified ? ' · teacher modified on acceptance' : ''} · decided {operation.resolution?.decidedAt}</span><div className="history-values"><strong>Historical proposed value</strong><pre>{formatReviewValue(operation.proposed)}</pre>{isCurrentAttribution && <><strong>Current section attribution</strong><p>{attribution.currentSource === 'teacher-edited' ? 'Teacher edited after accepting this proposal.' : `Accepted contribution from ${attribution.toolName}.`}</p><strong>Current accepted value</strong><pre>{formatReviewValue(attribution.currentValue)}</pre></>}</div></li>
    })}</ul></li>)}</ul></section>}
    <p className="change-status" role="status" aria-live="polite" aria-atomic="true">{pendingOperations.length > 0 ? `${pendingOperations.length} proposal operation${pendingOperations.length === 1 ? ' requires' : 's require'} teacher review.` : 'No proposal operations require review.'}</p>
    <div className="notice notice-warning"><strong>Human-only approval remains separate</strong><p>Accepting a proposed section does not approve this lesson or make it ready. Teacher approval is not implemented.</p></div>
  </section>
}

function AdaptationInstructions({ kind, label, description, value, disabled, invalid, onChange }: { kind: 'support' | 'extension'; label: string; description: string; value: string; disabled: boolean; invalid: boolean; onChange: (value: string) => void }) {
  const descriptionId = `${kind}-instructions-description`
  const countId = `${kind}-instructions-count`
  const errorId = `${kind}-instructions-error`
  return <div className="instruction-field"><label htmlFor={`${kind}-instructions`}>{label}</label><p id={descriptionId}>{description}</p><textarea id={`${kind}-instructions`} maxLength={500} disabled={disabled} value={value} aria-invalid={invalid} aria-describedby={`${descriptionId} ${countId}${invalid ? ` ${errorId}` : ''}`} onChange={(event) => onChange(event.target.value)} /> <small id={countId}>{value.length}/500 characters</small>{invalid && <p id={errorId} role="alert">Enter no more than 500 characters.</p>}</div>
}

function AdaptationCard({ title, selected, instructions, declined }: { title: string; selected: string[]; instructions: string; declined: boolean }) {
  return <section className="canvas-card adaptation-card"><div className="card-kicker">{title} · Manual draft</div><h4>{title}</h4>{declined ? <p>No additional adaptation selected for this demo.</p> : <><p>{selected.length > 0 ? selected.join(' · ') : `No ${title.toLowerCase()} options selected.`}</p><p>{instructions || 'Add class-level instructions to complete this adaptation decision.'}</p></>}</section>
}

function MissionTextCard({ label, title, value, maxLength, durationValue, onDurationChange, onChange }: { label: string; title: string; value: string; maxLength: number; durationValue?: string; onDurationChange?: (value: string) => void; onChange: (value: string) => void }) {
  const id = `mission-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`
  const durationId = `duration-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`
  return <section className="canvas-card editable-card"><div className="card-kicker">{label} · Manual draft</div><label htmlFor={id}>{title}</label><textarea id={id} value={value} maxLength={maxLength} placeholder={`Add ${label.toLowerCase()}`} onChange={(event) => onChange(event.target.value)} /><small>{value.length}/{maxLength} characters</small>{onDurationChange && <label className="duration-field" htmlFor={durationId}>{label} duration (minutes)<input id={durationId} type="number" min="1" step="1" inputMode="numeric" value={durationValue} aria-describedby="cycle-duration-description" onChange={(event) => onDurationChange(event.target.value)} /></label>}</section>
}

function MissionListCard({ label, items, minimumRows, maximumRows, maxLength, onChange, onAdd }: { label: string; items: string[]; minimumRows: number; maximumRows: number; maxLength: number; onChange: (index: number, value: string) => void; onAdd: () => void }) {
  const rows = Array.from({ length: Math.max(minimumRows, items.length) }, (_, index) => items[index] ?? '')
  const itemLabel = label === 'Success criteria' ? 'Success criterion' : 'Assessment evidence'
  return <section className="canvas-card editable-card"><div className="card-kicker">{label} · Manual draft</div><h3>{label}</h3>{rows.map((item, index) => <label key={index}>{itemLabel} {index + 1}<input id={`${itemLabel.toLowerCase().replaceAll(' ', '-')}-${index + 1}`} value={item} maxLength={maxLength} onChange={(event) => onChange(index, event.target.value)} /></label>)}{rows.length < maximumRows && <button type="button" className="secondary-button add-row-button" onClick={onAdd}>Add {itemLabel.toLowerCase()}</button>}</section>
}

function ValidationPanel({ draft, webMcpStatus, onAcknowledge }: { draft: LessonDraft; webMcpStatus: WebMcpStatus; onAcknowledge: (id: string) => void }) {
  const { validation } = draft
  const groups = [
    { severity: 'error' as const, title: 'Errors' },
    { severity: 'warning' as const, title: 'Warnings' },
    { severity: 'pass' as const, title: 'Passed checks' },
  ]
  const errors = validation.checks.filter(({ severity }) => severity === 'error').length
  const warnings = validation.checks.filter(({ severity }) => severity === 'warning').length
  const focusSection = (section?: string) => {
    const selectors: Record<string, string> = {
      'class-context': 'input[type="number"][max="40"]', 'resource-plan': '.resource-plan', 'mission-content': '#mission-lesson-identity',
      'success-criteria': '#success-criterion-1', 'assessment-evidence': '#assessment-evidence-1',
      'cycle-durations': '#duration-plan', 'support-instructions': '#support-instructions',
      'extension-instructions': '#extension-instructions', 'review-changes': '.validation-controls',
    }
    const target = section ? document.querySelector<HTMLElement>(selectors[section]) : null
    if (target) {
      if (!target.matches('input, textarea, button, select, [tabindex]')) target.tabIndex = -1
      target.focus()
      target.scrollIntoView?.({ block: 'center' })
    }
  }

  return <aside className="panel readiness-panel"><div className="panel-heading"><p className="eyebrow">Review & readiness</p><h2>Manual lesson validation</h2></div>
    <div className="validation-summary" role="status" aria-live="polite" aria-atomic="true"><strong>{validation.checks.length === 0 ? 'Not checked' : validation.readiness === 'ready' ? 'Ready for teacher review' : validation.readiness === 'warning' ? 'Warnings need acknowledgement' : 'Validation blocked'}</strong>{validation.checks.length > 0 && <p>{validation.score} passed · {errors} errors · {warnings} warnings</p>}</div>
    {validation.checks.length > 0 && <div className="validation-results">{groups.map(({ severity, title }) => {
      const items = validation.checks.filter((item) => item.severity === severity)
      return items.length > 0 && <section key={severity} aria-labelledby={`validation-${severity}`}><h3 id={`validation-${severity}`}>{title}</h3><ul>{items.map((item) => <li className={`validation-${severity}`} key={item.id}><strong>{item.id}</strong><p>{item.message}</p>{item.suggestedFix && <p>{item.suggestedFix}</p>}{severity !== 'pass' && <button type="button" className="secondary-button" onClick={() => focusSection(item.section)}>Edit myself</button>}{severity === 'warning' && <label className="check-label"><input type="checkbox" checked={validation.acknowledgedWarningIds.includes(item.id)} onChange={() => onAcknowledge(item.id)} />Acknowledge {item.id}</label>}</li>)}</ul></section>
    })}</div>}
    <p id="cycle-duration-description" className="notice notice-info">Stage durations must be positive whole minutes and total the lesson duration.</p>
    <div className="notice notice-warning"><strong>Human decision boundary</strong><p>Only the teacher can approve a lesson. Agent approval is not available.</p><p>Ready means ready for teacher review; validation never approves a lesson.</p></div>
    <div className="notice notice-info"><strong>Sample information only</strong><p>Do not enter pupil names, school details, diagnoses, attainment records or personal data.</p></div>
    <div className="notice notice-info"><strong>Limited privacy check</strong><p>This checks only obvious email, labelled phone, international phone and labelled pupil or student name patterns. It is not comprehensive safeguarding detection.</p></div>
    <div className="notice notice-info"><strong>WebMCP validation boundary</strong><p>{webMcpWorkflowGuidance(webMcpStatus, 'validation-panel')}</p></div>
    <div className="notice notice-info"><strong>Teacher-authored adaptation</strong><p>Manual Step 5 records direct teacher decisions. WebMCP adaptation calls create reviewable proposals and never apply changes automatically.</p></div>
  </aside>
}

export default App
