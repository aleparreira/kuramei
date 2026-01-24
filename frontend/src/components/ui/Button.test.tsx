/**
 * Button component tests.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    const button = screen.getByRole('button', { name: /click me/i })
    fireEvent.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="default">Default</Button>)
    let button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-variant', 'default')

    rerender(<Button variant="destructive">Destructive</Button>)
    button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-variant', 'destructive')

    rerender(<Button variant="outline">Outline</Button>)
    button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-variant', 'outline')
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="default">Default</Button>)
    let button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-size', 'default')

    rerender(<Button size="sm">Small</Button>)
    button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-size', 'sm')

    rerender(<Button size="lg">Large</Button>)
    button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-size', 'lg')
  })

  it('renders as disabled', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })
})
