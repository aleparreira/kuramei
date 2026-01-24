/**
 * ThemeContext tests.
 *
 * Tests theme provider and toggle functionality.
 */

import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ThemeProvider, useTheme } from './ThemeContext'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock matchMedia
const mockMatchMedia = (matches: boolean) => {
  const listeners: ((e: MediaQueryListEvent) => void)[] = []
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: (event: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.push(cb)
    },
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    // Helper to trigger change
    _triggerChange: (newMatches: boolean) => {
      listeners.forEach(cb => cb({ matches: newMatches } as MediaQueryListEvent))
    },
  }))
}

// Test component that uses the theme
function ThemeTestComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('system')}>System</button>
    </div>
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorageMock.clear()
    document.documentElement.classList.remove('dark')
    window.matchMedia = mockMatchMedia(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('provides default theme', () => {
    render(
      <ThemeProvider>
        <ThemeTestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme')).toHaveTextContent('system')
  })

  it('uses stored theme from localStorage', () => {
    localStorageMock.setItem('theme', 'dark')

    render(
      <ThemeProvider storageKey="theme">
        <ThemeTestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })

  it('toggles to light theme', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeTestComponent />
      </ThemeProvider>
    )

    const lightButton = screen.getByRole('button', { name: /light/i })
    fireEvent.click(lightButton)

    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    expect(localStorageMock.getItem('theme')).toBe('light')
  })

  it('toggles to dark theme', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeTestComponent />
      </ThemeProvider>
    )

    const darkButton = screen.getByRole('button', { name: /dark/i })
    fireEvent.click(darkButton)

    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('applies dark class when system prefers dark', () => {
    window.matchMedia = mockMatchMedia(true) // System prefers dark

    render(
      <ThemeProvider defaultTheme="system">
        <ThemeTestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('applies light class when system prefers light', () => {
    window.matchMedia = mockMatchMedia(false) // System prefers light

    render(
      <ThemeProvider defaultTheme="system">
        <ThemeTestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('resolved')).toHaveTextContent('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('throws error when useTheme is used outside provider', () => {
    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<ThemeTestComponent />)
    }).toThrow('useTheme must be used within a ThemeProvider')

    consoleError.mockRestore()
  })

  it('uses custom storage key', () => {
    render(
      <ThemeProvider storageKey="custom-theme-key">
        <ThemeTestComponent />
      </ThemeProvider>
    )

    const darkButton = screen.getByRole('button', { name: /dark/i })
    fireEvent.click(darkButton)

    expect(localStorageMock.getItem('custom-theme-key')).toBe('dark')
  })
})
