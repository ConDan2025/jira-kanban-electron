import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'
import '@testing-library/jest-dom'

// Mock window.api for PAT methods
beforeEach(() => {
  vi.stubGlobal('window', {
    api: {
      getPAT: vi.fn().mockResolvedValue(null),
      savePAT: vi.fn().mockResolvedValue(undefined),
      clearPAT: vi.fn().mockResolvedValue(undefined),
    },
  })
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('App', () => {
  it('renders settings button', () => {
    render(<App />)
    expect(screen.getByText(/settings/i)).toBeInTheDocument()
  })

  it('opens settings panel when settings button is clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByText(/settings/i))
    expect(screen.getByText(/settings panel/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/jira url/i)).toBeInTheDocument()
  })

  it('shows default Jira URL', () => {
    render(<App />)
    fireEvent.click(screen.getByText(/settings/i))
    expect(screen.getByDisplayValue('https://devtrack.vanderlande.com')).toBeInTheDocument()
  })

  it('updates project key in settings', () => {
    render(<App />)
    fireEvent.click(screen.getByText(/settings/i))
    const projectInput = screen.getByLabelText(/project key/i)
    fireEvent.change(projectInput, { target: { value: 'TEST' } })
    expect(projectInput).toHaveValue('TEST')
    expect(localStorage.getItem('project')).toBe('TEST')
  })

  it('shows user dropdown with default users', () => {
    render(<App />)
    fireEvent.click(screen.getByText(/settings/i))
    expect(screen.getByText('-- Select user --')).toBeInTheDocument()
    expect(screen.getByText('nlrhoog')).toBeInTheDocument()
    expect(screen.getByText('nlcdan')).toBeInTheDocument()
  })

  it('saves PAT when Save PAT button is clicked', async () => {
    render(<App />)
    fireEvent.click(screen.getByText(/settings/i))
    const patInput = screen.getByPlaceholderText(/enter your pat/i)
    fireEvent.change(patInput, { target: { value: 'my-pat' } })
    fireEvent.click(screen.getByText(/save pat/i))
    // PAT is stored, so success text should appear
    expect(await screen.findByText(/pat stored/i)).toBeInTheDocument()
  })

  it('clears PAT when Clear PAT button is clicked', async () => {
    render(<App />)
    fireEvent.click(screen.getByText(/settings/i))
    fireEvent.click(screen.getByText(/clear pat/i))
    expect(await screen.findByText(/no pat stored/i)).toBeInTheDocument()
  })

  it('renders KanbanBoard', () => {
    render(<App />)
    // KanbanBoard is rendered, but you may want to mock it for more isolated tests
    expect(screen.getByTestId('kanban-board')).toBeInTheDocument()
  })
})