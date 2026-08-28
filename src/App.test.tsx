import { fireEvent, render, screen } from '@testing-library/react'
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
  })

  it('resets to a clean fictional draft', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Load P4 Demo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start New Mission' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Untitled mission' })).toBeInTheDocument()
    expect(screen.getByLabelText('Robots')).toHaveValue('0')
    expect(screen.getByText('Select at least one robot or activity mat to calculate groups.')).toBeInTheDocument()
  })
})
