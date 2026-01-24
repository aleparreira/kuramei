/**
 * CostNode component tests.
 *
 * Tests the React Flow custom node that displays architecture components with cost badges.
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CostNode, formatCurrency, type CostNodeData } from './CostNode'
import { ReactFlowProvider } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

// Mock ResizeObserver for React Flow
vi.stubGlobal('ResizeObserver', vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})))

// Wrapper to provide React Flow context
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ReactFlowProvider>{children}</ReactFlowProvider>
}

// Helper to create mock node props
function createMockNodeProps(data: CostNodeData): NodeProps {
  return {
    id: 'test-node',
    type: 'costNode',
    data,
    dragging: false,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    selected: false,
    zIndex: 1,
    deletable: false,
    selectable: true,
    parentId: undefined,
    sourcePosition: undefined,
    targetPosition: undefined,
  }
}

describe('CostNode', () => {
  it('renders with label', () => {
    const props = createMockNodeProps({
      label: 'API Gateway',
    })

    render(
      <TestWrapper>
        <CostNode {...props} />
      </TestWrapper>
    )

    expect(screen.getByText('API Gateway')).toBeInTheDocument()
  })

  it('renders default label when no label provided', () => {
    const props = createMockNodeProps({
      label: '',
    })

    render(
      <TestWrapper>
        <CostNode {...props} />
      </TestWrapper>
    )

    expect(screen.getByText('Node')).toBeInTheDocument()
  })

  it('renders with cost badge', () => {
    const props = createMockNodeProps({
      label: 'RDS Database',
      cost: {
        monthly: 150,
        currency: 'USD',
      },
    })

    render(
      <TestWrapper>
        <CostNode {...props} />
      </TestWrapper>
    )

    expect(screen.getByText('$150/mo')).toBeInTheDocument()
  })

  it('renders cost in thousands format', () => {
    const props = createMockNodeProps({
      label: 'Large Service',
      cost: {
        monthly: 2500,
        currency: 'USD',
      },
    })

    render(
      <TestWrapper>
        <CostNode {...props} />
      </TestWrapper>
    )

    expect(screen.getByText('$2.5k/mo')).toBeInTheDocument()
  })

  it('does not render cost badge when cost is zero', () => {
    const props = createMockNodeProps({
      label: 'Free Tier',
      cost: {
        monthly: 0,
        currency: 'USD',
      },
    })

    render(
      <TestWrapper>
        <CostNode {...props} />
      </TestWrapper>
    )

    expect(screen.queryByText('/mo')).not.toBeInTheDocument()
  })

  it('renders level indicator', () => {
    const props = createMockNodeProps({
      label: 'System',
      level: 'L0',
    })

    render(
      <TestWrapper>
        <CostNode {...props} />
      </TestWrapper>
    )

    expect(screen.getByText('L0')).toBeInTheDocument()
  })

  it('shows expand hint when hasChildren is true', () => {
    const props = createMockNodeProps({
      label: 'Container',
      hasChildren: true,
    })

    render(
      <TestWrapper>
        <CostNode {...props} />
      </TestWrapper>
    )

    expect(screen.getByText('Double-click to expand')).toBeInTheDocument()
  })
})

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(150, 'USD')).toBe('$150.00')
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56')
  })

  it('defaults to USD', () => {
    expect(formatCurrency(100)).toBe('$100.00')
  })
})
