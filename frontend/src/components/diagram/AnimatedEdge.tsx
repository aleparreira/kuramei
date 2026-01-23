/**
 * AnimatedEdge - Custom React Flow edge with Bezier curves and animations.
 *
 * Different edge types have different visual styles:
 * - calls: solid stroke with flowing animation
 * - publishes: dashed stroke with flowing animation
 * - subscribes: dashed stroke with flowing animation
 * - reads: solid, thinner, no animation
 * - writes: solid, thinner, no animation
 * - depends_on: dotted, no animation
 * - contains: light gray, no animation
 * - connects: default style
 */

import { memo } from 'react';
import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';

/**
 * Edge style configuration based on edge type.
 */
interface EdgeStyleConfig {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  animated: boolean;
  animationDuration: string;
}

/**
 * Get edge style configuration based on edge type.
 * Follows DESIGN-SYSTEM.md specifications.
 */
function getEdgeStyle(edgeType: string | undefined): EdgeStyleConfig {
  switch (edgeType) {
    case 'calls':
      return {
        stroke: '#454360', // Ink color
        strokeWidth: 2,
        animated: true,
        animationDuration: '2s',
      };
    case 'publishes':
      return {
        stroke: '#f59e0b', // Warning/amber color
        strokeWidth: 2,
        strokeDasharray: '5,5',
        animated: true,
        animationDuration: '1.5s',
      };
    case 'subscribes':
      return {
        stroke: '#22c55e', // Success/green color
        strokeWidth: 2,
        strokeDasharray: '5,5',
        animated: true,
        animationDuration: '1.5s',
      };
    case 'reads':
      return {
        stroke: '#3b82f6', // Info/blue color
        strokeWidth: 1.5,
        animated: false,
        animationDuration: '0s',
      };
    case 'writes':
      return {
        stroke: '#ef4444', // Destructive/red color
        strokeWidth: 1.5,
        animated: false,
        animationDuration: '0s',
      };
    case 'depends_on':
      return {
        stroke: '#6b7280', // Gray
        strokeWidth: 1.5,
        strokeDasharray: '2,4',
        animated: false,
        animationDuration: '0s',
      };
    case 'contains':
      return {
        stroke: '#d1d5db', // Light gray
        strokeWidth: 1,
        animated: false,
        animationDuration: '0s',
      };
    case 'connects':
    default:
      return {
        stroke: '#454360', // Ink color
        strokeWidth: 1.5,
        animated: false,
        animationDuration: '0s',
      };
  }
}

/**
 * Generate a unique gradient ID for animated edges.
 */
function getGradientId(edgeId: string): string {
  return `edge-gradient-${edgeId}`;
}

/**
 * Animated edge component with Bezier curves.
 */
function AnimatedEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  labelStyle,
  labelShowBg,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  data,
}: EdgeProps<Edge<Record<string, unknown>>>) {
  // Get edge type from data or default to undefined
  const edgeType = data?.backendType as string | undefined;
  const styleConfig = getEdgeStyle(edgeType);

  // Calculate Bezier path
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Merge style config with any inline styles
  const mergedStyle = {
    ...style,
    stroke: styleConfig.stroke,
    strokeWidth: styleConfig.strokeWidth,
    strokeDasharray: styleConfig.strokeDasharray,
  };

  return (
    <>
      {/* Base edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={mergedStyle}
        markerEnd={markerEnd}
      />

      {/* Animated circle for flowing effect */}
      {styleConfig.animated && (
        <>
          {/* Define gradient for smoother animation appearance */}
          <defs>
            <linearGradient
              id={getGradientId(id)}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor={styleConfig.stroke} stopOpacity="0" />
              <stop offset="50%" stopColor={styleConfig.stroke} stopOpacity="1" />
              <stop offset="100%" stopColor={styleConfig.stroke} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Animated dot following the path */}
          <circle r="3" fill={styleConfig.stroke}>
            <animateMotion
              dur={styleConfig.animationDuration}
              repeatCount="indefinite"
              path={edgePath}
            />
          </circle>

          {/* Second dot with offset for continuous flow effect */}
          <circle r="3" fill={styleConfig.stroke} opacity="0.6">
            <animateMotion
              dur={styleConfig.animationDuration}
              repeatCount="indefinite"
              path={edgePath}
              begin={`-${parseFloat(styleConfig.animationDuration) / 2}s`}
            />
          </circle>
        </>
      )}

      {/* Edge label */}
      {label && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          {labelShowBg && (
            <rect
              x={-((labelBgPadding?.[0] || 2) + 20)}
              y={-((labelBgPadding?.[1] || 2) + 6)}
              width={40 + (labelBgPadding?.[0] || 2) * 2}
              height={12 + (labelBgPadding?.[1] || 2) * 2}
              rx={labelBgBorderRadius || 2}
              ry={labelBgBorderRadius || 2}
              style={labelBgStyle}
              className="fill-card stroke-border"
            />
          )}
          <text
            style={{
              fontSize: 10,
              fill: '#454360',
              ...labelStyle,
            }}
            textAnchor="middle"
            dominantBaseline="middle"
            className="pointer-events-none select-none"
          >
            {label}
          </text>
        </g>
      )}
    </>
  );
}

export const AnimatedEdge = memo(AnimatedEdgeComponent);

/**
 * Edge types registry for React Flow.
 * All edges use the AnimatedEdge component.
 */
export const edgeTypes = {
  animated: AnimatedEdge,
  calls: AnimatedEdge,
  publishes: AnimatedEdge,
  subscribes: AnimatedEdge,
  reads: AnimatedEdge,
  writes: AnimatedEdge,
  depends_on: AnimatedEdge,
  contains: AnimatedEdge,
  connects: AnimatedEdge,
  default: AnimatedEdge,
};
