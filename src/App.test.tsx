import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Mission Builder foundation', () => {
  it('renders the Mission Builder title', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Mission Builder' })).toBeInTheDocument()
  })

  it('makes teacher-only approval explicit', () => {
    render(<App />)

    expect(screen.getAllByText('Teacher approval required')).not.toHaveLength(0)
    expect(screen.getByText('Only the teacher can approve a lesson. Agent approval is not available.')).toBeInTheDocument()
  })
})
