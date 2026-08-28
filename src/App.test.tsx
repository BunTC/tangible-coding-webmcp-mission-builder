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
    expect(screen.getByRole('heading', { level: 2, name: 'The Lost Story Path' })).toBeInTheDocument()
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

  it('resets to a clean fictional draft', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Load P4 Demo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start New Mission' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Untitled mission' })).toBeInTheDocument()
    expect(screen.getByLabelText('Robots')).toHaveValue('0')
    expect(screen.getByRole('alert')).toHaveTextContent('Blocking: No usable group station is available.')
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
