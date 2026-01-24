/**
 * App component smoke test.
 *
 * Verifies that the main App component renders without crashing.
 */

import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from './App'
import { ThemeProvider } from './context'

// Mock ResizeObserver for React Flow
vi.stubGlobal('ResizeObserver', vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})))

// Mock matchMedia
vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})))

// Mock fetch for API calls
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('App', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    // Mock successful API responses for bootstrap
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    })
  })

  it('renders without crashing', () => {
    const { container } = render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    )

    // App should render a container div
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders main layout', () => {
    const { container } = render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    )

    // Check that the main container exists and has expected classes
    const mainDiv = container.firstChild as HTMLElement
    expect(mainDiv).toHaveClass('h-screen')
    expect(mainDiv).toHaveClass('w-screen')
  })
})
