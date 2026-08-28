import { useState, type ChangeEvent } from 'react'
import './App.css'
import { classContextSchema, durationMinutesSchema, primaryStageSchema, type ClassContext, type ResourceInventory } from './domain/lesson-schemas'
import { useLessonStore } from './state/lesson-store'

const journeySteps = ['Start', 'Class context', 'Resources', 'Build mission', 'Adapt learners', 'Validate', 'Review changes', 'Teacher approval', 'Preview & print']
const durations = [30, 45, 60, 90] as const
const focuses: ClassContext['learningFocus'][number][] = ['sequencing', 'algorithms', 'loops', 'debugging', 'conditionals', 'collaboration']
const resourceFields: Array<{ key: keyof Pick<ResourceInventory, 'robots' | 'tileSets' | 'activityMats' | 'instructionCardPacks' | 'roleCards'>; label: string; max: number }> = [
  { key: 'robots', label: 'Robots', max: 12 }, { key: 'tileSets', label: 'Tile sets', max: 30 },
  { key: 'activityMats', label: 'Activity mats', max: 12 }, { key: 'instructionCardPacks', label: 'Instruction-card packs', max: 12 },
  { key: 'roleCards', label: 'Pupil role cards', max: 40 },
]

function App() {
  const { draft, dispatch } = useLessonStore()
  const { classContext, resources, groupingPlan } = draft
  const [classSizeInput, setClassSizeInput] = useState(String(classContext.classSize))
  const classSizeResult = /^\d+$/.test(classSizeInput)
    ? classContextSchema.shape.classSize.safeParse(Number(classSizeInput))
    : { success: false as const }
  const updateClassContext = (patch: Partial<ClassContext>) => dispatch({ type: 'update-class-context', payload: { ...classContext, ...patch } })
  const updateResource = (key: keyof ResourceInventory, value: number | boolean) => dispatch({ type: 'update-resources', payload: { ...resources, [key]: value } })
  const updateClassSizeInput = (value: string) => {
    setClassSizeInput(value)
    const result = /^\d+$/.test(value)
      ? classContextSchema.shape.classSize.safeParse(Number(value))
      : { success: false as const }
    if (result.success) updateClassContext({ classSize: result.data })
  }
  const resetDraft = () => {
    setClassSizeInput('24')
    dispatch({ type: 'reset-demo' })
  }
  const loadDemo = () => {
    setClassSizeInput('24')
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
      <div className="header-state" aria-label="Lesson status"><span className="connection-state">Manual foundation · WebMCP not connected</span><strong>Teacher approval required</strong></div>
    </header>
    <main className="workspace">
      <aside className="panel journey-panel">
        <div className="panel-heading"><p className="eyebrow">Journey</p><h2>Manual setup</h2></div>
        <nav aria-label="Mission Builder journey"><ol className="journey-list">{journeySteps.map((step, index) => <li className={index < 3 ? 'current-step' : ''} key={step}><span>{index + 1}</span>{step}</li>)}</ol></nav>
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
      </aside>
      <section className="lesson-canvas" aria-labelledby="lesson-title">
        <div className="canvas-intro"><div><p className="eyebrow">Fictional lesson draft</p><h2 id="lesson-title">{draft.title}</h2><p className="lesson-summary">Manual Steps 1–3 update this shared lesson canvas. Mission content is not built in this slice.</p></div><span className="draft-badge">{draft.status}</span></div>
        <dl className="context-strip"><div><dt>Class</dt><dd>{classContext.classSize} fictional {classContext.stage} pupils</dd></div><div><dt>Duration</dt><dd>{classContext.durationMinutes} minutes</dd></div><div><dt>Focus</dt><dd>{classContext.learningFocus.join(', ')}</dd></div></dl>
        <section className="canvas-card" aria-labelledby="brief-title"><div className="card-kicker">Class brief</div><h3 id="brief-title">{classContext.subjectContext} · {classContext.teacherConfidence} confidence</h3><p>{classContext.goal || 'Add an optional fictional lesson goal.'}</p></section>
        <section className="canvas-card resource-plan" aria-labelledby="plan-title"><div className="card-kicker">Resource plan</div><h3 id="plan-title">Current tangible inventory</h3><dl className="inventory-grid">{resourceFields.map(({ key, label }) => <div key={key}><dt>{label}</dt><dd>{resources[key]}</dd></div>)}</dl><div className="grouping-status" role="status" aria-label="Grouping calculation status" aria-live="polite" aria-atomic="true"><dl className="grouping-summary"><div><dt>Required groups</dt><dd>{groupingPlan.recommendedGroups || 'None'}</dd></div><div><dt>Simultaneous capacity</dt><dd>{groupingPlan.simultaneousCapacity}</dd></div><div><dt>Pupils per group</dt><dd>{groupingPlan.pupilsPerGroup || 'None'}</dd></div><div><dt>Rotation</dt><dd>{groupingPlan.rotationRequired ? 'Required' : 'Not required'}</dd></div><div><dt>Tile-only groups</dt><dd>{resources.allowTileOnlyGroups ? 'Enabled' : 'Disabled'}</dd></div></dl>{groupingPlan.participationRoute && <p>{groupingPlan.participationRoute}</p>}</div>{groupingPlan.warnings.map((warning) => <p className="blocking-warning" role="alert" key={warning}>{warning}</p>)}</section>
      </section>
      <aside className="panel readiness-panel"><div className="panel-heading"><p className="eyebrow">Review & readiness</p><h2>Teacher approval required</h2></div><div className="notice notice-warning"><strong>Human decision boundary</strong><p>Only the teacher can approve a lesson. Agent approval is not available.</p></div><div className="notice notice-info"><strong>Sample information only</strong><p>Do not enter pupil names, school details, diagnoses, attainment records or personal data.</p></div><div className="notice notice-info"><strong>Local draft</strong><p>One fictional lesson draft is saved in this browser. No credentials or browser-agent data are stored.</p></div></aside>
    </main>
  </div>
}

export default App
