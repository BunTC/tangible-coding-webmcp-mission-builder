import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { LessonStoreProvider } from './state/lesson-store'

const renderApp = () => render(<LessonStoreProvider><App /></LessonStoreProvider>)

describe('Mission Builder foundation', () => {
  beforeEach(() => window.localStorage.clear())

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
    expect(screen.getByText('24 fictional P4 pupils')).toBeInTheDocument()
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

    expect(screen.getByText('16 fictional P4 pupils')).toBeInTheDocument()
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
    expect(screen.getByText('24 fictional P4 pupils')).toBeInTheDocument()
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

  it('keeps privacy, teacher-only approval and unavailable agent adaptation visible', () => {
    renderApp()
    expect(screen.getByText('Only the teacher can approve a lesson. Agent approval is not available.')).toBeInTheDocument()
    expect(screen.getByText('Do not enter pupil names, school details, diagnoses, attainment records or personal data.')).toBeInTheDocument()
    expect(screen.getByText('Step 5 currently records manual teacher decisions only. No agent proposal is created.')).toBeInTheDocument()
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
    expect(screen.getByText('24 fictional P4 pupils')).toBeInTheDocument()
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
    expect(screen.getByText('16 fictional P4 pupils')).toBeInTheDocument()
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
})
