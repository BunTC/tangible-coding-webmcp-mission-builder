import './App.css'
import { goldenPath } from './domain/sample-context'

const journeySteps = [
  'Start',
  'Class context',
  'Resources',
  'Build mission',
  'Adapt learners',
  'Validate',
  'Review changes',
  'Teacher approval',
  'Preview & print',
]

const learningCycle = [
  ['Plan', 'Predict the story route and arrange a first sequence.'],
  ['Build & Explain', 'Build with tangible tiles and explain the planned algorithm.'],
  ['Test & Debug', 'Test the route, find the deliberate error and revise it.'],
  ['Reflect & Improve', 'Compare the result with the plan and identify one improvement.'],
]

function App() {
  return (
    <div className="app-shell">
      <header className="product-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            TC
          </span>
          <div>
            <p className="eyebrow">Tangible Coding Studio</p>
            <h1>Mission Builder</h1>
          </div>
        </div>

        <div className="header-state" aria-label="Lesson status">
          <span className="connection-state">Foundation preview · WebMCP not connected</span>
          <strong>Teacher approval required</strong>
        </div>
      </header>

      <main className="workspace">
        <aside className="panel journey-panel">
          <div className="panel-heading">
            <p className="eyebrow">Journey</p>
            <h2>Lesson workflow</h2>
          </div>

          <nav aria-label="Mission Builder journey">
            <ol className="journey-list">
              {journeySteps.map((step, index) => (
                <li className={index === 0 ? 'current-step' : ''} key={step}>
                  <span>{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <section className="lesson-canvas" aria-labelledby="lesson-title">
          <div className="canvas-intro">
            <div>
              <p className="eyebrow">Fictional P4 demonstration</p>
              <h2 id="lesson-title">The Lost Story Path</h2>
              <p className="lesson-summary">
                A 45-minute storytelling mission in which pupils plan, test and debug a
                tangible route.
              </p>
            </div>
            <span className="draft-badge">Draft</span>
          </div>

          <dl className="context-strip">
            <div>
              <dt>Class</dt>
              <dd>{goldenPath.classSize} fictional {goldenPath.stage} pupils</dd>
            </div>
            <div>
              <dt>Focus</dt>
              <dd>{goldenPath.learningFocus}</dd>
            </div>
            <div>
              <dt>Context</dt>
              <dd>{goldenPath.subject}</dd>
            </div>
          </dl>

          <section className="canvas-card" aria-labelledby="intention-title">
            <div className="card-kicker">Learning intention</div>
            <h3 id="intention-title">Test an algorithm, identify an error and improve the instructions.</h3>
            <p>
              Reduced reading and visual instructions support access. A loop challenge
              provides the extension.
            </p>
          </section>

          <section className="cycle-section" aria-labelledby="cycle-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Tangible Learning Cycle</p>
                <h3 id="cycle-title">Four-stage mission structure</h3>
              </div>
              <span>Placeholder content</span>
            </div>

            <div className="cycle-grid">
              {learningCycle.map(([title, description], index) => (
                <article className="cycle-card" key={title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <h4>{title}</h4>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </section>
        </section>

        <aside className="panel readiness-panel">
          <div className="panel-heading">
            <p className="eyebrow">Review & readiness</p>
            <h2>Teacher approval required</h2>
          </div>

          <div className="notice notice-warning">
            <strong>Human decision boundary</strong>
            <p>Only the teacher can approve a lesson. Agent approval is not available.</p>
          </div>

          <section className="resource-card" aria-labelledby="resource-title">
            <p className="eyebrow">Available equipment</p>
            <h3 id="resource-title">Fictional class inventory</h3>
            <ul>
              <li><span>Robots</span><strong>{goldenPath.resources.robots}</strong></li>
              <li><span>Tile sets</span><strong>{goldenPath.resources.tileSets}</strong></li>
              <li><span>Activity mats</span><strong>{goldenPath.resources.activityMats}</strong></li>
              <li><span>Instruction-card packs</span><strong>{goldenPath.resources.instructionCardPacks}</strong></li>
            </ul>
          </section>

          <div className="notice notice-info">
            <strong>Sample information only</strong>
            <p>No pupil names, school details or personal data are used in this prototype.</p>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
