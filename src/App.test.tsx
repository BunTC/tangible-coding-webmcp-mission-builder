import { configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { LessonStoreProvider } from './state/lesson-store'
import { createGoldenPathDraft, lostStoryPathMission } from './domain/lesson-factories'
import { createPendingChangeSet, getSectionValue } from './domain/lesson-change-control'
import { LESSON_STORAGE_KEY, lessonReducer } from './state/lesson-state'
import { createProposalPackage } from './domain/lesson-proposal-package'
import { ProvenanceMarker, type ProvenanceType } from './components/ProvenanceMarker'

const renderApp = () => render(<LessonStoreProvider><App /></LessonStoreProvider>)

// Legacy behaviour tests intentionally exercise mounted workspace state while the
// shell-specific tests below verify that inactive workspaces are hidden from users.
configure({ defaultHidden: true })

function seedStep7Proposal() {
  const draft = { ...createGoldenPathDraft('2026-08-28T10:00:00.000Z'), title: lostStoryPathMission.title, mission: { ...lostStoryPathMission } }
  const set = createPendingChangeSet(draft, 'build_tangible_mission', [{ section: 'learning-intention', before: getSectionValue(draft, 'learning-intention') as never, proposed: 'Proposed visible intention.' }], { changeSetId: 'ui-change-set', operationIds: ['ui-operation'], createdAt: '2026-08-28T12:00:00.000Z' })
  window.localStorage.setItem(LESSON_STORAGE_KEY, JSON.stringify({ ...draft, status: 'needs-review', pendingChanges: [set] }))
}

function seedAcceptedThenTeacherEditedProposal() {
  const draft = { ...createGoldenPathDraft('2026-08-28T10:00:00.000Z'), title: lostStoryPathMission.title, mission: { ...lostStoryPathMission } }
  const set = createPendingChangeSet(draft, 'build_tangible_mission', [{ section: 'learning-intention', before: draft.mission.learningIntention, proposed: 'Historical proposed intention.' }], { changeSetId: 'attribution-set', operationIds: ['attribution-operation'], createdAt: '2026-08-28T12:00:00.000Z' })
  const received = lessonReducer(draft, { type: 'receive-change-set', payload: set })
  const accepted = lessonReducer(received, { type: 'resolve-change-operation', payload: { changeSetId: 'attribution-set', operationId: 'attribution-operation', decision: 'accept' } })
  const teacherEdited = lessonReducer(accepted, { type: 'update-mission', payload: { ...accepted.mission, learningIntention: 'Current teacher-edited intention.' } })
  window.localStorage.setItem(LESSON_STORAGE_KEY, JSON.stringify(teacherEdited))
}

describe('Mission Builder foundation', () => {
  beforeEach(() => {
    window.localStorage.clear()
    Reflect.deleteProperty(document, 'modelContext')
  })

  it('renders the Mission Builder title', () => {
    renderApp()
    expect(screen.getByRole('heading', { level: 1, name: 'Mission Builder' })).toBeInTheDocument()
  })

  it('makes teacher-only approval explicit', () => {
    renderApp()
    expect(screen.getAllByText('Teacher approval required')).not.toHaveLength(0)
    expect(screen.getByText('Only the teacher can approve a lesson. Agent approval is not available.')).toBeInTheDocument()
  })

  it('loads and displays the canonical fictional P4 demo', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Load P4 Demo' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Untitled mission' })).toBeInTheDocument()
    expect(screen.queryByText('The Lost Story Path')).not.toBeInTheDocument()
    expect(screen.getAllByText('24 fictional P4 pupils')).not.toHaveLength(0)
    expect(screen.getByText('3 groups of up to 8 pupils.')).toBeInTheDocument()
    expect(screen.getByLabelText('Robots')).toHaveValue('3')
    expect(screen.getByLabelText('Tile sets')).toHaveValue('9')
    expect(screen.getByLabelText('Activity mats')).toHaveValue('3')
    expect(screen.getByLabelText('Instruction-card packs')).toHaveValue('3')
    expect(screen.getByLabelText('Pupil role cards')).toHaveValue('24')
    expect(screen.getByRole('checkbox', { name: 'Allow tile-only groups without a robot' })).toBeChecked()
    expect(screen.getByRole('status', { name: 'Grouping calculation status' })).toHaveTextContent('Simultaneous capacity3')
  })

  it('keeps every Step 4 field and array empty when loading only the P4 demo context', async () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Load P4 Demo' }))

    expect(screen.getByLabelText('Mission theme')).toHaveValue('')
    expect(screen.getByLabelText('Challenge level')).toHaveValue('')
    expect(screen.getByLabelText('Mission title')).toHaveValue('')
    expect(screen.getByLabelText('What pupils are learning')).toHaveValue('')
    expect(screen.getByLabelText('Success criterion 1')).toHaveValue('')
    expect(screen.getByLabelText('Success criterion 2')).toHaveValue('')
    expect(screen.getByLabelText('The challenge')).toHaveValue('')
    expect(screen.getByLabelText('Plan')).toHaveValue('')
    expect(screen.getByLabelText('Build & Explain')).toHaveValue('')
    expect(screen.getByLabelText('Test & Debug')).toHaveValue('')
    expect(screen.getByLabelText('Reflect & Improve')).toHaveValue('')
    expect(screen.getByLabelText('Assessment evidence 1')).toHaveValue('')
    await waitFor(() => {
      const persisted = JSON.parse(window.localStorage.getItem('tangible-coding-studio:mission-builder:draft:v1') ?? '{}')
      expect(persisted.mission.successCriteria).toEqual([])
      expect(persisted.mission.assessmentEvidence).toEqual([])
    })
  })

  it('resets to a clean fictional draft', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Load P4 Demo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start New Mission' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Untitled mission' })).toBeInTheDocument()
    expect(screen.getByLabelText('Robots')).toHaveValue('0')
    expect(screen.getByRole('alert')).toHaveTextContent('Blocking: No usable group station is available.')
  })

  it('builds all ten sample cards only after the explicit action and preserves class, resources and grouping', () => {
    renderApp()
    fireEvent.change(screen.getByLabelText('Class size'), { target: { value: '16' } })
    fireEvent.click(screen.getByRole('button', { name: 'Increase Robots' }))
    for (let count = 0; count < 3; count += 1) fireEvent.click(screen.getByRole('button', { name: 'Increase Tile sets' }))
    fireEvent.click(screen.getByRole('button', { name: 'Increase Activity mats' }))
    fireEvent.click(screen.getByRole('button', { name: 'Increase Instruction-card packs' }))
    for (let count = 0; count < 2; count += 1) fireEvent.click(screen.getByRole('button', { name: 'Increase Pupil role cards' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow tile-only groups without a robot' }))

    expect(screen.queryByText('The Lost Story Path')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))

    expect(screen.getAllByText('16 fictional P4 pupils')).not.toHaveLength(0)
    expect(screen.getByLabelText('Robots')).toHaveValue('1')
    expect(screen.getByLabelText('Tile sets')).toHaveValue('3')
    expect(screen.getByLabelText('Activity mats')).toHaveValue('1')
    expect(screen.getByLabelText('Instruction-card packs')).toHaveValue('1')
    expect(screen.getByLabelText('Pupil role cards')).toHaveValue('2')
    expect(screen.getByRole('checkbox', { name: 'Allow tile-only groups without a robot' })).not.toBeChecked()
    expect(screen.getByRole('status', { name: 'Grouping calculation status' })).toHaveTextContent('Required groups2Simultaneous capacity1Pupils per group8RotationRequired')
    expect(screen.getByLabelText('Mission title')).toHaveValue('The Lost Story Path')
    const missionCanvas = screen.getByRole('region', { name: 'Mission content' })
    expect(missionCanvas.querySelectorAll('.canvas-card')).toHaveLength(10)
    expect(within(missionCanvas).getByText('Lesson identity · Manual draft')).toBeInTheDocument()
    expect(within(missionCanvas).getByText('Learning intention · Manual draft')).toBeInTheDocument()
    expect(within(missionCanvas).getByRole('heading', { name: 'Success criteria' })).toBeInTheDocument()
    expect(within(missionCanvas).getByText('Mission story or problem · Manual draft')).toBeInTheDocument()
    expect(within(missionCanvas).getByLabelText('Plan')).not.toHaveValue('')
    expect(within(missionCanvas).getByLabelText('Build & Explain')).not.toHaveValue('')
    expect((screen.getByLabelText('Test & Debug') as HTMLTextAreaElement).value).toContain('faulty instruction')
    expect(screen.getByLabelText('Reflect & Improve')).not.toHaveValue('')
    expect(within(missionCanvas).getByRole('heading', { name: 'Resource-aware participation' })).toBeInTheDocument()
    expect(within(missionCanvas).getByRole('heading', { name: 'Assessment evidence' })).toBeInTheDocument()
    expect(screen.getByLabelText('Success criterion 3')).not.toHaveValue('')
  })

  it('starts directly from a completely blank mission without sample prose', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))
    fireEvent.change(screen.getByLabelText('Starting method'), { target: { value: 'blank' } })
    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))

    expect(screen.queryByText('The Lost Story Path')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Mission theme')).toHaveValue('')
    expect(screen.getByLabelText('Challenge level')).toHaveValue('')
    expect(screen.getByLabelText('Mission title')).toHaveValue('')
    expect(screen.getByLabelText('What pupils are learning')).toHaveValue('')
    expect(screen.getByLabelText('The challenge')).toHaveValue('')
    expect(screen.getByLabelText('Test & Debug')).toHaveValue('')
    expect(screen.getByLabelText('Assessment evidence 1')).toHaveValue('')
    expect(screen.queryByDisplayValue(/faulty instruction/i)).not.toBeInTheDocument()
  })

  it('clears every edited Step 4 field and array when starting a new mission', async () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))
    fireEvent.change(screen.getByLabelText('Mission theme'), { target: { value: 'Edited theme' } })
    fireEvent.change(screen.getByLabelText('Challenge level'), { target: { value: 'stretch' } })
    fireEvent.change(screen.getByLabelText('Mission title'), { target: { value: 'Edited title' } })
    fireEvent.change(screen.getByLabelText('What pupils are learning'), { target: { value: 'Edited intention' } })
    fireEvent.change(screen.getByLabelText('Success criterion 1'), { target: { value: 'Edited criterion' } })
    fireEvent.change(screen.getByLabelText('The challenge'), { target: { value: 'Edited story' } })
    fireEvent.change(screen.getByLabelText('Plan'), { target: { value: 'Edited plan' } })
    fireEvent.change(screen.getByLabelText('Build & Explain'), { target: { value: 'Edited build stage' } })
    fireEvent.change(screen.getByLabelText('Test & Debug'), { target: { value: 'Edited test stage' } })
    fireEvent.change(screen.getByLabelText('Reflect & Improve'), { target: { value: 'Edited reflect stage' } })
    fireEvent.change(screen.getByLabelText('Assessment evidence 1'), { target: { value: 'Edited evidence' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start New Mission' }))

    expect(screen.getByRole('heading', { level: 2, name: 'Untitled mission' })).toBeInTheDocument()
    expect(screen.getAllByText('24 fictional P4 pupils')).not.toHaveLength(0)
    expect(screen.getByLabelText('Robots')).toHaveValue('0')
    expect(screen.getByLabelText('Mission theme')).toHaveValue('')
    expect(screen.getByLabelText('Challenge level')).toHaveValue('')
    expect(screen.getByLabelText('Mission title')).toHaveValue('')
    expect(screen.getByLabelText('What pupils are learning')).toHaveValue('')
    expect(screen.getByLabelText('Success criterion 1')).toHaveValue('')
    expect(screen.getByLabelText('Success criterion 2')).toHaveValue('')
    expect(screen.getByLabelText('The challenge')).toHaveValue('')
    expect(screen.getByLabelText('Plan')).toHaveValue('')
    expect(screen.getByLabelText('Build & Explain')).toHaveValue('')
    expect(screen.getByLabelText('Test & Debug')).toHaveValue('')
    expect(screen.getByLabelText('Reflect & Improve')).toHaveValue('')
    expect(screen.getByLabelText('Assessment evidence 1')).toHaveValue('')
    await waitFor(() => {
      const persisted = JSON.parse(window.localStorage.getItem('tangible-coding-studio:mission-builder:draft:v1') ?? '{}')
      expect(persisted.mission).toMatchObject({
        title: '', theme: '', challengeLevel: null, learningIntention: '', successCriteria: [],
        missionStory: '', plan: '', buildAndExplain: '', testAndDebug: '', reflectAndImprove: '', assessmentEvidence: [],
      })
    })
  })

  it('persists an inline teacher mission edit after reload', async () => {
    const firstRender = renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))
    fireEvent.change(screen.getByLabelText('What pupils are learning'), { target: { value: 'We are learning to repair a sequence.' } })
    await waitFor(() => expect(window.localStorage.getItem('tangible-coding-studio:mission-builder:draft:v1')).toContain('repair a sequence'))
    firstRender.unmount()

    renderApp()
    expect(screen.getByLabelText('What pupils are learning')).toHaveValue('We are learning to repair a sequence.')
  })

  it('keeps Step 5 unavailable until a mission exists', () => {
    renderApp()

    expect(screen.getByLabelText('Reduced reading load')).toBeDisabled()
    expect(screen.getByLabelText('Support instructions')).toBeDisabled()
    expect(screen.getByLabelText('Extension instructions')).toBeDisabled()
    expect(screen.getByLabelText('No additional adaptation for this demo')).toBeDisabled()
    expect(screen.getByRole('status', { name: 'Step 5 completion status' })).toHaveTextContent('Step 5 unavailable')
    expect(screen.getByText('Build or name a mission before recording learner adaptations.')).toBeInTheDocument()
  })

  it('records support instructions only and keeps incomplete selections visibly incomplete', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))
    fireEvent.click(screen.getByLabelText('Reduced reading load'))
    expect(screen.getByRole('status', { name: 'Step 5 completion status' })).toHaveTextContent('Step 5 incomplete')
    fireEvent.change(screen.getByLabelText('Support instructions'), { target: { value: 'Use short phrases and a visual sequence.' } })

    expect(screen.getByRole('status', { name: 'Step 5 completion status' })).toHaveTextContent('Step 5 complete')
    expect(screen.getByRole('heading', { name: 'Access and support' }).closest('.adaptation-card')).toHaveTextContent('Reduced reading load')
    expect(screen.getByRole('heading', { name: 'Access and support' }).closest('.adaptation-card')).toHaveTextContent('Use short phrases and a visual sequence.')
    expect(screen.getByLabelText('Extension instructions')).toHaveValue('')
  })

  it('records extension instructions only', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))
    fireEvent.click(screen.getByLabelText('Loop challenge'))
    fireEvent.change(screen.getByLabelText('Extension instructions'), { target: { value: 'Replace repeated steps with a loop.' } })

    expect(screen.getByRole('status', { name: 'Step 5 completion status' })).toHaveTextContent('Step 5 complete')
    expect(screen.getByRole('heading', { name: 'Extension challenge' }).closest('.adaptation-card')).toHaveTextContent('Loop challenge')
    expect(screen.getByLabelText('Support instructions')).toHaveValue('')
  })

  it('records both support and extension instructions', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))
    fireEvent.change(screen.getByLabelText('Support instructions'), { target: { value: 'Show each instruction visually.' } })
    fireEvent.change(screen.getByLabelText('Extension instructions'), { target: { value: 'Ask pupils to compare two solutions.' } })

    expect(screen.getByLabelText('Support instructions')).toHaveValue('Show each instruction visually.')
    expect(screen.getByLabelText('Extension instructions')).toHaveValue('Ask pupils to compare two solutions.')
    expect(screen.getByRole('status', { name: 'Step 5 completion status' })).toHaveTextContent('Step 5 complete')
  })

  it('accepts 500 characters and rejects an over-limit instruction without mutating state', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))
    const instructions = screen.getByLabelText('Support instructions')
    fireEvent.change(instructions, { target: { value: 's'.repeat(500) } })
    expect(instructions).toHaveValue('s'.repeat(500))
    expect(screen.getByText('500/500 characters')).toBeInTheDocument()

    fireEvent.change(instructions, { target: { value: 'x'.repeat(501) } })
    expect(instructions).toHaveValue('s'.repeat(500))
    expect(instructions).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Enter no more than 500 characters.')).toHaveAttribute('role', 'alert')
    expect(screen.getByRole('status', { name: 'Step 5 completion status' })).toHaveTextContent('Step 5 incomplete')
  })

  it('resolves conflicts between instructions and an explicit no-adaptation decision', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))
    fireEvent.click(screen.getByLabelText('Visual instructions'))
    fireEvent.change(screen.getByLabelText('Support instructions'), { target: { value: 'Use picture prompts.' } })
    fireEvent.click(screen.getByLabelText('No additional adaptation for this demo'))

    expect(screen.getByLabelText('No additional adaptation for this demo')).toBeChecked()
    expect(screen.getByLabelText('Visual instructions')).not.toBeChecked()
    expect(screen.getByLabelText('Support instructions')).toHaveValue('')
    expect(screen.getByRole('heading', { name: 'Access and support' }).closest('.adaptation-card')).toHaveTextContent('No additional adaptation selected for this demo.')

    fireEvent.change(screen.getByLabelText('Extension instructions'), { target: { value: 'Add one loop challenge.' } })
    expect(screen.getByLabelText('No additional adaptation for this demo')).not.toBeChecked()
    expect(screen.getByLabelText('Extension instructions')).toHaveValue('Add one loop challenge.')

    fireEvent.click(screen.getByLabelText('No additional adaptation for this demo'))
    fireEvent.click(screen.getByLabelText('Loop challenge'))
    expect(screen.getByLabelText('No additional adaptation for this demo')).not.toBeChecked()
    expect(screen.getByLabelText('Loop challenge')).toBeChecked()
    expect(screen.getByRole('status', { name: 'Step 5 completion status' })).toHaveTextContent('Step 5 incomplete')
  })

  it('persists manual adaptation decisions across reload', async () => {
    const firstRender = renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))
    fireEvent.click(screen.getByLabelText('Paired explanation'))
    fireEvent.change(screen.getByLabelText('Support instructions'), { target: { value: 'Explain the route with a partner.' } })
    await waitFor(() => expect(window.localStorage.getItem('tangible-coding-studio:mission-builder:draft:v1')).toContain('Explain the route with a partner.'))
    firstRender.unmount()

    renderApp()
    expect(screen.getByLabelText('Paired explanation')).toBeChecked()
    expect(screen.getByLabelText('Support instructions')).toHaveValue('Explain the route with a partner.')
    expect(screen.getByRole('status', { name: 'Step 5 completion status' })).toHaveTextContent('Step 5 complete')
  })

  it('persists the explicit no-additional-adaptation decision across reload', async () => {
    const firstRender = renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))
    fireEvent.click(screen.getByLabelText('No additional adaptation for this demo'))
    await waitFor(() => expect(window.localStorage.getItem('tangible-coding-studio:mission-builder:draft:v1')).toContain('"noAdditionalAdaptation":true'))
    firstRender.unmount()

    renderApp()
    expect(screen.getByLabelText('No additional adaptation for this demo')).toBeChecked()
    expect(screen.getByRole('status', { name: 'Step 5 completion status' })).toHaveTextContent('Step 5 complete')
  })

  it('clears adaptations for sample, blank and new mission actions', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))
    fireEvent.change(screen.getByLabelText('Support instructions'), { target: { value: 'First adaptation.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))
    expect(screen.getByLabelText('Support instructions')).toHaveValue('')
    expect(screen.getByRole('status', { name: 'Step 5 completion status' })).toHaveTextContent('Step 5 incomplete')

    fireEvent.change(screen.getByLabelText('Support instructions'), { target: { value: 'Second adaptation.' } })
    fireEvent.change(screen.getByLabelText('Starting method'), { target: { value: 'blank' } })
    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))
    expect(screen.getByLabelText('Support instructions')).toHaveValue('')
    expect(screen.getByLabelText('Support instructions')).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Mission title'), { target: { value: 'Teacher mission' } })
    fireEvent.change(screen.getByLabelText('Extension instructions'), { target: { value: 'Third adaptation.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start New Mission' }))
    expect(screen.getByLabelText('Extension instructions')).toHaveValue('')
    expect(screen.getByLabelText('Extension instructions')).toBeDisabled()
  })

  it('keeps Step 4 prose, resources and grouping unchanged and sectionsToUpdate empty', async () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Load P4 Demo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))
    await waitFor(() => expect(window.localStorage.getItem('tangible-coding-studio:mission-builder:draft:v1')).toContain('The Lost Story Path'))
    const before = JSON.parse(window.localStorage.getItem('tangible-coding-studio:mission-builder:draft:v1') ?? '{}')
    fireEvent.click(screen.getByLabelText('Reduced reading load'))
    fireEvent.click(screen.getByLabelText('Visual instructions'))
    fireEvent.change(screen.getByLabelText('Support instructions'), { target: { value: 'Use less text and show each step.' } })
    await waitFor(() => expect(window.localStorage.getItem('tangible-coding-studio:mission-builder:draft:v1')).toContain('Use less text and show each step.'))
    const after = JSON.parse(window.localStorage.getItem('tangible-coding-studio:mission-builder:draft:v1') ?? '{}')

    expect(JSON.stringify(after.mission)).toBe(JSON.stringify(before.mission))
    expect(after.resources).toEqual(before.resources)
    expect(after.groupingPlan).toEqual(before.groupingPlan)
    expect(after.adaptations.sectionsToUpdate).toEqual([])
  })

  it('keeps privacy, teacher-only approval and honest manual fallback guidance visible', () => {
    renderApp()
    expect(screen.getByText('Only the teacher can approve a lesson. Agent approval is not available.')).toBeInTheDocument()
    expect(screen.getByText('Do not enter pupil names, school details, diagnoses, attainment records or personal data.')).toBeInTheDocument()
    expect(screen.getAllByText('WebMCP is unavailable in this browser; Manual Steps 1–7 remain available.')).toHaveLength(4)
    expect(screen.getByText('Manual Step 5 records direct teacher decisions. WebMCP adaptation calls create reviewable proposals and never apply changes automatically.')).toBeInTheDocument()
  })

  it.each([
    ['a temporary empty value', ''],
    ['non-numeric input', 'not-a-number'],
    ['a below-minimum value', '0'],
    ['an above-maximum value', '41'],
  ])('keeps the last valid class size for %s', (_label, value) => {
    renderApp()
    const input = screen.getByLabelText('Class size')
    fireEvent.change(input, { target: { value } })

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Enter a whole number from 1 to 40.')).toHaveAttribute('role', 'alert')
    expect(screen.getAllByText('24 fictional P4 pupils')).not.toHaveLength(0)
  })

  it('recovers from invalid text and recalculates grouping for a valid class size', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Load P4 Demo' }))
    const input = screen.getByLabelText('Class size')

    fireEvent.change(input, { target: { value: '' } })
    expect(screen.getByText('Enter a whole number from 1 to 40.')).toHaveAttribute('role', 'alert')
    expect(screen.getByText('3 groups of up to 8 pupils.')).toBeInTheDocument()

    fireEvent.change(input, { target: { value: '16' } })
    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByText('Enter a whole number from 1 to 40.')).not.toBeInTheDocument()
    expect(screen.getAllByText('16 fictional P4 pupils')).not.toHaveLength(0)
    expect(screen.getByText('2 groups of up to 8 pupils.')).toBeInTheDocument()
  })

  it('does not persist invalid temporary class-size text', async () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Load P4 Demo' }))
    fireEvent.change(screen.getByLabelText('Class size'), { target: { value: '41' } })

    await waitFor(() => {
      const persisted = JSON.parse(window.localStorage.getItem('tangible-coding-studio:mission-builder:draft:v1') ?? '{}')
      expect(persisted.classContext.classSize).toBe(24)
    })
  })

  it('keeps pupil role cards within the 0 to 40 range', () => {
    renderApp()
    const increase = screen.getByRole('button', { name: 'Increase Pupil role cards' })
    for (let count = 0; count < 40; count += 1) fireEvent.click(increase)
    expect(screen.getByLabelText('Pupil role cards')).toHaveValue('40')
    expect(increase).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Start New Mission' }))
    expect(screen.getByRole('button', { name: 'Decrease Pupil role cards' })).toBeDisabled()
  })

  it('does not require rotation when tile-only capacity covers groups despite fewer robots', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Load P4 Demo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Robots' }))
    expect(screen.getByText('Not required')).toBeInTheDocument()
    expect(screen.queryByText('groups rotate through the available stations.', { exact: false })).not.toBeInTheDocument()
  })

  it('requires rotation when robot-active capacity is below required groups', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Load P4 Demo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Robots' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow tile-only groups without a robot' }))
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByText('groups rotate through the available stations.', { exact: false })).toBeInTheDocument()
  })

  it('shows a blocking warning when there are no robots and tile-only groups are disabled', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Increase Activity mats' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow tile-only groups without a robot' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Blocking: Add at least one robot or enable tile-only groups without a robot.')
  })

  it('persists tile-only grouping after reload', async () => {
    const firstRender = renderApp()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow tile-only groups without a robot' }))
    await waitFor(() => expect(window.localStorage.getItem('tangible-coding-studio:mission-builder:draft:v1')).toContain('"allowTileOnlyGroups":false'))
    firstRender.unmount()

    renderApp()
    expect(screen.getByRole('checkbox', { name: 'Allow tile-only groups without a robot' })).not.toBeChecked()
  })

  it('exposes ordinary recalculation through a live status without duplicating alerts', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Load P4 Demo' }))
    const status = screen.getByRole('status', { name: 'Grouping calculation status' })
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveAttribute('aria-atomic', 'true')
    expect(status).toHaveTextContent('Simultaneous capacity3')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow tile-only groups without a robot' }))
    expect(status).toHaveTextContent('RotationNot required')

    fireEvent.click(screen.getByRole('button', { name: 'Start New Mission' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Blocking: No usable group station is available.')
    expect(within(status).queryByRole('alert')).not.toBeInTheDocument()
    expect(status).not.toHaveTextContent('Blocking:')
  })

  it('gates Step 6 until mission and adaptation decisions exist', () => {
    renderApp()
    expect(screen.getByRole('button', { name: 'Run validation' })).toBeDisabled()
    expect(screen.getByText('Complete Mission and Adapt before validation.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))
    fireEvent.click(screen.getByLabelText('No additional adaptation for this demo'))
    expect(screen.getByRole('button', { name: 'Run validation' })).toBeEnabled()
  })

  it('loads explicit sample timings, validates, acknowledges a warning and becomes ready for teacher review', async () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Load P4 Demo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))
    expect(screen.getByLabelText('Plan duration (minutes)')).toHaveValue(10)
    expect(screen.getByLabelText('Build & Explain duration (minutes)')).toHaveValue(15)
    expect(screen.getByLabelText('Test & Debug duration (minutes)')).toHaveValue(15)
    expect(screen.getByLabelText('Reflect & Improve duration (minutes)')).toHaveValue(5)
    fireEvent.click(screen.getByLabelText('No additional adaptation for this demo'))
    fireEvent.click(screen.getByRole('button', { name: 'Run validation' }))

    expect(screen.getAllByText('Warnings need acknowledgement')).not.toHaveLength(0)
    expect(screen.getByText('VAL-11')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Acknowledge VAL-11'))
    expect(screen.getAllByText('Ready for teacher review')).toHaveLength(3)
    expect(screen.getByText('Ready means ready for teacher review; validation never approves a lesson.')).toBeInTheDocument()
    await waitFor(() => expect(window.localStorage.getItem('tangible-coding-studio:mission-builder:draft:v1')).toContain('"acknowledgedWarningIds":["VAL-11"]'))
  })

  it('restores warning acknowledgement and invalidates validation after a Step 4 edit', async () => {
    const firstRender = renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Load P4 Demo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))
    fireEvent.click(screen.getByLabelText('No additional adaptation for this demo'))
    fireEvent.click(screen.getByRole('button', { name: 'Run validation' }))
    fireEvent.click(screen.getByLabelText('Acknowledge VAL-11'))
    await waitFor(() => expect(window.localStorage.getItem('tangible-coding-studio:mission-builder:draft:v1')).toContain('"status":"ready"'))
    firstRender.unmount()

    renderApp()
    expect(screen.getByLabelText('Acknowledge VAL-11')).toBeChecked()
    fireEvent.change(screen.getByLabelText('Plan'), { target: { value: 'Teacher changed the plan.' } })
    expect(screen.getAllByText('Not checked')).not.toHaveLength(0)
    expect(screen.getByText('draft')).toBeInTheDocument()
    await waitFor(() => {
      const persisted = JSON.parse(window.localStorage.getItem('tangible-coding-studio:mission-builder:draft:v1') ?? '{}')
      expect(persisted.validation.checks).toEqual([])
      expect(persisted.validation.acknowledgedWarningIds).toEqual([])
      expect(persisted.validation.preparedOutputs).toEqual([])
      expect(persisted.approvedAt).toBeUndefined()
    })
  })

  it('shows grouped validation results, the limited-pattern boundary and honest WebMCP fallback guidance', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))
    fireEvent.click(screen.getByLabelText('No additional adaptation for this demo'))
    fireEvent.change(screen.getByLabelText('Plan duration (minutes)'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Run validation' }))

    expect(screen.getByRole('heading', { name: 'Errors' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Warnings' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Passed checks' })).toBeInTheDocument()
    expect(screen.getByText('This checks only obvious email, labelled phone, international phone and labelled pupil or student name patterns. It is not comprehensive safeguarding detection.')).toBeInTheDocument()
    expect(screen.getAllByText('WebMCP is unavailable in this browser; Manual Steps 1–7 remain available.')).toHaveLength(4)
    expect(screen.queryByRole('button', { name: /Ask agent/i })).not.toBeInTheDocument()
  })

  it('shows accurate connected workflow guidance without obsolete unavailable claims', async () => {
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: () => undefined } })
    renderApp()

    await waitFor(() => expect(screen.getByText('WebMCP connected with all five approved tools.')).toBeInTheDocument())
    expect(screen.getByText('Manual Step 6 remains available. WebMCP validation is also available through validate_and_prepare_lesson.')).toBeInTheDocument()
    expect(screen.getByText(/Output preparation is not implemented, preparedOutputs remains empty, and only a human teacher may approve/)).toBeInTheDocument()
    expect(screen.getByText(/WebMCP content tools create proposals here only after they are invoked/)).toBeInTheDocument()
    expect(screen.getByText(/WebMCP learner-adaptation proposals are available/)).toBeInTheDocument()
    expect(screen.queryByText(/WebMCP validation is unavailable|WebMCP is not connected|No WebMCP validation.*connected/i)).not.toBeInTheDocument()
  })

  it('keeps the manual workflow available after a registration error', async () => {
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: () => { throw new Error('registration failed') } } })
    renderApp()

    await waitFor(() => expect(screen.getByText('WebMCP available, but tool registration failed. Manual Steps 1–7 remain available.')).toBeInTheDocument())
    expect(screen.getAllByText('WebMCP registration failed; Manual Steps 1–7 remain available.')).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'Start New Mission' })).toBeEnabled()
    expect(screen.getByText('Only the teacher can approve a lesson. Agent approval is not available.')).toBeInTheDocument()
  })

  it('distinguishes a malformed browser registration surface from registration failure', () => {
    Object.defineProperty(document, 'modelContext', { configurable: true, value: {} })
    renderApp()

    expect(screen.getByText('WebMCP was detected, but its registration surface is inaccessible or malformed. Manual Steps 1–7 remain available.')).toBeInTheDocument()
    expect(screen.getAllByText('The browser WebMCP registration surface is inaccessible or malformed; Manual Steps 1–7 remain available.')).toHaveLength(4)
    expect(screen.queryByText('WebMCP registration failed; Manual Steps 1–7 remain available.')).not.toBeInTheDocument()
  })
})

describe('compact workspace shell', () => {
  beforeEach(() => {
    window.localStorage.clear()
    Reflect.deleteProperty(document, 'modelContext')
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: undefined })
  })

  it('provides exactly six ordered website destinations and shows only the selected workspace', () => {
    renderApp()
    const navigation = screen.getByRole('navigation', { name: 'Mission Builder workspaces' })
    expect(within(navigation).getAllByRole('button', { hidden: false }).map((button) => button.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Setup', 'Mission', 'Adapt', 'Review 0', 'Validate Not checked', 'Preview',
    ])
    expect(screen.getByRole('region', { name: 'Setup', hidden: false })).toBeVisible()
    expect(document.getElementById('mission-workspace-title')?.closest('.workspace-panel')).toHaveAttribute('hidden')
    fireEvent.click(within(navigation).getByRole('button', { name: 'Mission' }))
    expect(screen.getByRole('region', { name: 'Mission', hidden: false })).toBeVisible()
    expect(document.getElementById('setup-workspace-title')?.closest('.workspace-panel')).toHaveAttribute('hidden')
  })

  it('navigates with destination-specific Next and Back controls', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Next to Mission' }))
    expect(screen.getByRole('button', { name: 'Mission' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByRole('button', { name: 'Back to Setup' }))
    expect(screen.getByRole('button', { name: 'Setup' })).toHaveAttribute('aria-current', 'page')
  })

  it('keeps responsive More destinations keyboard accessible and dismisses after every navigation path', () => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
    renderApp()
    const more = screen.getByRole('button', { name: 'More' })
    fireEvent.click(more)
    expect(screen.getByRole('menuitem', { name: /Validate Not checked/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Preview' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mission' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(more)
    fireEvent.click(screen.getByRole('menuitem', { name: /Validate Not checked/ }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Validate', hidden: false })).toBeVisible()

    fireEvent.click(more)
    fireEvent.click(screen.getByRole('button', { name: 'Back to Review' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    fireEvent.click(more)
    fireEvent.click(screen.getByRole('button', { name: 'Next to Validate' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(more)
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(more)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(more).toHaveFocus()
  })

  it('collapses the accepted lesson summary by default on narrow screens and expands through its native keyboard control', () => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
    const draft = { ...createGoldenPathDraft('2026-08-30T12:00:00.000Z'), title: lostStoryPathMission.title, mission: { ...lostStoryPathMission } }
    window.localStorage.setItem(LESSON_STORAGE_KEY, JSON.stringify(draft))
    renderApp()
    const summary = screen.getByRole('complementary', { name: 'Lesson summary' })
    const disclosure = within(summary).getByText('Summary details').closest('summary') as HTMLElement
    const details = disclosure.closest('details') as HTMLDetailsElement
    expect(details).not.toHaveAttribute('open')
    expect(disclosure).toHaveTextContent('The Lost Story Path')
    expect(disclosure).toHaveTextContent('Not checked')
    expect(within(summary).getByText('Teacher approval required')).toBeVisible()
    disclosure.focus()
    expect(disclosure).toHaveFocus()
    fireEvent.keyDown(disclosure, { key: 'Enter' })
    disclosure.click()
    expect(details).toHaveAttribute('open')
    expect(within(summary).getByText('24 fictional P4 pupils')).toBeInTheDocument()
    expect(within(summary).getByText('45 minutes')).toBeInTheDocument()
  })

  it('keeps the complete accepted lesson summary visible on desktop', () => {
    renderApp()
    const summary = screen.getByRole('complementary', { name: 'Lesson summary' })
    expect(summary.querySelector('details')).toBeNull()
    expect(within(summary).getByText('24 fictional P4 pupils')).toBeVisible()
    expect(within(summary).getByText('Validation and accepting proposals never approve a lesson.')).toBeVisible()
  })

  it('preserves temporary fields, accepted values and unfinished review input across navigation', () => {
    renderApp()
    fireEvent.change(screen.getByLabelText('Class size'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Build mission' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mission' }))
    fireEvent.change(screen.getByLabelText('Plan duration (minutes)'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adapt' }))
    fireEvent.change(screen.getByLabelText('Support instructions'), { target: { value: 'x'.repeat(501) } })
    expect(screen.getByText('Enter no more than 500 characters.')).toHaveAttribute('role', 'alert')
    fireEvent.click(screen.getByRole('button', { name: /^Review/ }))
    fireEvent.change(screen.getByLabelText('Proposal package JSON'), { target: { value: 'unfinished package' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mission' }))
    expect(screen.getByLabelText('Mission title')).toHaveValue(lostStoryPathMission.title)
    expect(screen.getByLabelText('Plan duration (minutes)')).toHaveValue(null)
    fireEvent.click(screen.getByRole('button', { name: 'Adapt' }))
    expect(screen.getByText('Enter no more than 500 characters.')).toHaveAttribute('role', 'alert')
    fireEvent.click(screen.getByRole('button', { name: 'Setup' }))
    expect(screen.getByLabelText('Class size')).toHaveValue(null)
    fireEvent.click(screen.getByRole('button', { name: /^Review/ }))
    expect(screen.getByLabelText('Proposal package JSON')).toHaveValue('unfinished package')
  })

  it.each([
    ['blocked', 'blocked'],
    ['warning', 'warning'],
    ['ready', 'ready'],
  ] as const)('shows the %s validation state in workspace navigation', (_label, readiness) => {
    const draft = createGoldenPathDraft('2026-08-30T12:00:00.000Z')
    draft.validation = {
      readiness,
      score: readiness === 'ready' ? 1 : 0,
      checks: [{ id: 'VAL-SHELL', severity: readiness === 'ready' ? 'pass' : readiness === 'blocked' ? 'error' : 'warning', message: 'Shell readiness fixture.', section: 'class-context', suggestedFix: '' }],
      preparedOutputs: [],
      acknowledgedWarningIds: readiness === 'warning' ? [] : [],
    }
    draft.status = readiness === 'ready' ? 'ready' : 'draft'
    window.localStorage.setItem(LESSON_STORAGE_KEY, JSON.stringify(draft))
    renderApp()
    expect(screen.getByRole('button', { name: new RegExp(`Validate ${readiness}`, 'i') })).toBeInTheDocument()
  })

  it('shows pending count while keeping proposed values out of the accepted summary', () => {
    seedStep7Proposal()
    renderApp()
    expect(screen.getByRole('button', { name: /Review 1 pending proposal operation/ })).toBeInTheDocument()
    const summary = screen.getByRole('complementary', { name: 'Lesson summary' })
    expect(summary).toHaveTextContent(lostStoryPathMission.title)
    expect(summary).not.toHaveTextContent('Proposed visible intention.')
  })

  it('exposes all provenance meanings and associates keyboard tooltips', () => {
    const types: ProvenanceType[] = ['ai-suggestion', 'teacher-authored', 'teacher-accepted', 'awaiting-teacher', 'teacher-approval-required']
    const labels = ['AI suggestion', 'Teacher authored', 'Teacher accepted', 'Awaiting teacher', 'Teacher approval required']
    render(<>{types.map((type) => <ProvenanceMarker key={type} type={type} />)}</>)
    labels.forEach((label) => expect(screen.getByText(label)).toBeInTheDocument())
    const aiMarker = screen.getByText('AI suggestion').parentElement as HTMLElement
    aiMarker.focus()
    const tooltipId = aiMarker.getAttribute('aria-describedby')
    expect(tooltipId).toBeTruthy()
    expect(document.getElementById(tooltipId ?? '')).toHaveAttribute('role', 'tooltip')
    expect(aiMarker.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('retains the storage key, restored accepted lesson and visible approval boundary', () => {
    const draft = { ...createGoldenPathDraft('2026-08-30T12:00:00.000Z'), title: lostStoryPathMission.title, mission: { ...lostStoryPathMission } }
    window.localStorage.setItem(LESSON_STORAGE_KEY, JSON.stringify(draft))
    renderApp()
    expect(LESSON_STORAGE_KEY).toBe('tangible-coding-studio:mission-builder:draft:v1')
    expect(screen.getByRole('complementary', { name: 'Lesson summary' })).toHaveTextContent('The Lost Story Path')
    expect(screen.getAllByText('Teacher approval required')).not.toHaveLength(0)
    expect(screen.getByText('Validation and accepting proposals never approve a lesson.')).toBeVisible()
  })
})

describe('Step 7 human change review', () => {
  beforeEach(() => window.localStorage.clear())

  it('provides persistent accessible guidance while empty import is disabled', () => {
    renderApp()
    const field = screen.getByLabelText('Proposal package JSON')
    const guidance = screen.getByText('Paste the proposal package returned by ChatGPT.')
    expect(field).toHaveValue('')
    expect(field).toHaveAttribute('aria-describedby', expect.stringContaining(guidance.id))
    expect(screen.getByRole('button', { name: 'Import proposal' })).toBeDisabled()
    expect(field).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('imports an untrusted portable proposal for review without accepting it', async () => {
    const draft = createGoldenPathDraft('2026-08-29T10:00:00.000Z')
    window.localStorage.setItem(LESSON_STORAGE_KEY, JSON.stringify(draft))
    const set = createPendingChangeSet(draft, 'set_class_context', [{ section: 'class-context', before: draft.classContext, proposed: { ...draft.classContext, classSize: 19 } }], { changeSetId: 'import-ui-set', operationIds: ['import-ui-operation'], createdAt: '2026-08-29T12:00:00.000Z' })
    renderApp()
    expect(screen.getByText(/Untrusted AI proposal/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Proposal package JSON'), { target: { value: JSON.stringify(createProposalPackage(set)) } })
    fireEvent.click(screen.getByRole('button', { name: 'Import proposal' }))
    expect(await screen.findByText(/Imported proposal import-ui-set for teacher review/)).toBeInTheDocument()
    expect(screen.getByText('1 proposal operation requires teacher review.')).toBeInTheDocument()
    expect(screen.getByLabelText('Class size')).toHaveValue(24)
    expect(screen.getByRole('button', { name: 'Accept class-context' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Reject class-context' })).toBeEnabled()
    expect(screen.getByLabelText('Lesson status')).toHaveTextContent('Teacher approval required')
    fireEvent.click(screen.getByRole('button', { name: 'Reject class-context' }))
    expect(screen.getByLabelText('Class size')).toHaveValue(24)
    expect(screen.getByRole('heading', { name: 'Resolved proposal history' }).parentElement).toHaveTextContent('class-context: rejected')
  })

  it('shows a linked safe error for an invalid portable package', async () => {
    renderApp()
    const field = screen.getByLabelText('Proposal package JSON')
    fireEvent.change(field, { target: { value: '{invalid' } })
    fireEvent.click(screen.getByRole('button', { name: 'Import proposal' }))
    expect(await screen.findByText('Paste a complete valid JSON proposal package.')).toBeInTheDocument()
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('No proposal operations require review.')).toBeInTheDocument()
  })

  it('copies accepted context only after the accessible teacher action and reports success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const draft = createGoldenPathDraft('2026-08-30T12:00:00.000Z')
    window.localStorage.setItem(LESSON_STORAGE_KEY, JSON.stringify(draft))
    renderApp()
    const button = screen.getByRole('button', { name: 'Copy accepted context for ChatGPT' })
    expect(button).toHaveAttribute('aria-describedby', 'context-export-warning')
    expect(screen.getByText(/Copies only the currently accepted fictional class context/)).toBeInTheDocument()
    fireEvent.click(button)
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
    const copied = JSON.parse(writeText.mock.calls[0][0])
    expect(copied).toMatchObject({ format: 'tangible-coding-teacher-context', schemaVersion: 1, classContext: draft.classContext })
    expect(JSON.stringify(copied)).not.toMatch(/pendingChanges|changeHistory|validation|approvedAt/)
    expect(screen.getByText(/Accepted lesson context copied\. ChatGPT may use it temporarily/)).toHaveAttribute('role', 'status')
  })

  it.each(['complete serialized context', 'unique sensitive marker'] as const)('reports a fixed clipboard failure without leaking %s or changing state', async (failureMode) => {
    const sensitiveMarker = 'SENSITIVE-CLIPBOARD-REJECTION-MARKER'
    const writeText = vi.fn((serialized: string) => Promise.reject(new Error(failureMode === 'complete serialized context' ? serialized : sensitiveMarker)))
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const draft = createGoldenPathDraft('2026-08-30T12:00:00.000Z')
    window.localStorage.setItem(LESSON_STORAGE_KEY, JSON.stringify(draft))
    renderApp()
    const importField = screen.getByLabelText('Proposal package JSON')
    fireEvent.change(importField, { target: { value: 'existing import text' } })
    const before = JSON.parse(window.localStorage.getItem(LESSON_STORAGE_KEY) ?? '{}')
    fireEvent.click(screen.getByRole('button', { name: 'Copy accepted context for ChatGPT' }))
    expect(await screen.findByText('Could not copy the accepted lesson context. Check clipboard permission and try again.')).toHaveAttribute('role', 'status')
    expect(writeText).toHaveBeenCalledOnce()
    const serialized = writeText.mock.calls[0][0]
    expect(document.body.textContent).not.toContain(serialized)
    expect(document.body.textContent).not.toContain(sensitiveMarker)
    expect(consoleLog).not.toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()
    expect(importField).toHaveValue('existing import text')
    expect(JSON.parse(window.localStorage.getItem(LESSON_STORAGE_KEY) ?? '{}')).toEqual(before)
    consoleLog.mockRestore()
    consoleError.mockRestore()
  })

  it('renders hostile proposal strings as inert review text', async () => {
    const draft = createGoldenPathDraft('2026-08-29T10:00:00.000Z')
    window.localStorage.setItem(LESSON_STORAGE_KEY, JSON.stringify(draft))
    const hostile = '<img src=x onerror="globalThis.__proposalExecuted=true"><script>globalThis.__proposalExecuted=true</script> javascript:alert(1) onclick="alert(1)"'
    const set = createPendingChangeSet(draft, 'build_tangible_mission', [{ section: 'learning-intention', before: draft.mission.learningIntention, proposed: hostile }], { changeSetId: 'hostile-ui-set', operationIds: ['hostile-ui-operation'], createdAt: '2026-08-29T12:00:00.000Z' })
    renderApp()
    fireEvent.change(screen.getByLabelText('Proposal package JSON'), { target: { value: JSON.stringify(createProposalPackage(set)) } })
    fireEvent.click(screen.getByRole('button', { name: 'Import proposal' }))
    await screen.findByText(/Imported proposal hostile-ui-set for teacher review/)
    expect(screen.getAllByText((content) => content.includes('<img src=x onerror=') && content.includes('<script>'))).not.toHaveLength(0)
    expect(document.querySelector('.change-review script')).toBeNull()
    expect(document.querySelector('.change-review img')).toBeNull()
    expect(within(screen.getByRole('region', { name: '7. Review agent changes' })).queryByRole('link')).not.toBeInTheDocument()
    expect((globalThis as typeof globalThis & { __proposalExecuted?: boolean }).__proposalExecuted).toBeUndefined()
    expect(screen.getByLabelText('What pupils are learning')).toHaveValue('')
  })

  it('shows an accessible pending proposal without changing accepted content', () => {
    seedStep7Proposal()
    renderApp()
    const review = screen.getByRole('region', { name: '7. Review agent changes' })
    expect(within(review).getByText('build_tangible_mission')).toBeInTheDocument()
    expect(within(review).getByText('Proposal ui-change-set · operation ui-operation · validation valid')).toBeInTheDocument()
    expect(within(review).getAllByText(/Proposed visible intention/)).toHaveLength(2)
    expect(screen.getByLabelText('What pupils are learning')).toHaveValue(lostStoryPathMission.learningIntention)
    expect(within(review).getByRole('button', { name: 'Accept learning-intention' })).toBeEnabled()
    expect(within(review).getByRole('button', { name: 'Edit and accept learning-intention' })).toBeEnabled()
    expect(within(review).getByRole('button', { name: 'Reject learning-intention' })).toBeEnabled()
    expect(within(review).getByText(/Teacher approval is not implemented/)).toBeInTheDocument()
  })

  it('accepts a section, shows its resolved outcome and remains draft', () => {
    seedStep7Proposal()
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Accept learning-intention' }))
    expect(screen.getByLabelText('What pupils are learning')).toHaveValue('Proposed visible intention.')
    expect(screen.getByRole('heading', { name: 'Resolved proposal history' }).parentElement).toHaveTextContent('learning-intention: accepted')
    expect(screen.getByLabelText('Lesson status')).toHaveTextContent('Teacher approval required')
    expect(screen.getByText('No proposal operations require review.')).toBeInTheDocument()
  })

  it('supports edit-and-accept with linked JSON errors', () => {
    seedStep7Proposal()
    renderApp()
    const editor = screen.getByLabelText('Teacher-edited accepted value (JSON)')
    fireEvent.change(editor, { target: { value: 'not json' } })
    fireEvent.click(screen.getByRole('button', { name: 'Edit and accept learning-intention' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid JSON value')
    expect(editor).toHaveAttribute('aria-invalid', 'true')
    fireEvent.change(editor, { target: { value: '42' } })
    fireEvent.click(screen.getByRole('button', { name: 'Edit and accept learning-intention' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid JSON value')
    fireEvent.change(editor, { target: { value: '"Teacher-edited intention."' } })
    fireEvent.click(screen.getByRole('button', { name: 'Edit and accept learning-intention' }))
    expect(screen.getByLabelText('What pupils are learning')).toHaveValue('Teacher-edited intention.')
    expect(screen.getByRole('heading', { name: 'Resolved proposal history' }).parentElement).toHaveTextContent('teacher modified')
  })

  it('rejects without changing accepted lesson content', () => {
    seedStep7Proposal()
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Reject learning-intention' }))
    expect(screen.getByLabelText('What pupils are learning')).toHaveValue(lostStoryPathMission.learningIntention)
    expect(screen.getByRole('heading', { name: 'Resolved proposal history' }).parentElement).toHaveTextContent('learning-intention: rejected')
  })

  it('distinguishes immutable accepted history from a later teacher-edited current value after reload', async () => {
    seedAcceptedThenTeacherEditedProposal()
    const first = renderApp()
    expect(screen.getByLabelText('What pupils are learning')).toHaveValue('Current teacher-edited intention.')
    const history = screen.getByRole('heading', { name: 'Resolved proposal history' }).parentElement
    expect(history).toHaveTextContent('attribution-set · build_tangible_mission · accepted')
    expect(history).toHaveTextContent('Historical proposed value')
    expect(history).toHaveTextContent('Historical proposed intention.')
    expect(history).toHaveTextContent('Teacher edited after accepting this proposal.')
    expect(history).toHaveTextContent('Current teacher-edited intention.')
    expect(history).not.toHaveTextContent('approved')
    await waitFor(() => expect(window.localStorage.getItem(LESSON_STORAGE_KEY)).toContain('Current teacher-edited intention.'))
    first.unmount()
    renderApp()
    expect(screen.getByLabelText('What pupils are learning')).toHaveValue('Current teacher-edited intention.')
    expect(screen.getByRole('heading', { name: 'Resolved proposal history' }).parentElement).toHaveTextContent('Historical proposed intention.')
    expect(screen.getByRole('heading', { name: 'Resolved proposal history' }).parentElement).toHaveTextContent('Teacher edited after accepting this proposal.')
  })
})
