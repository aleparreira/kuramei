/**
 * CostNode - Custom React Flow node that displays cost badges.
 *
 * Shows a cost badge in the bottom-right corner when the node has cost data.
 * Includes a tooltip with cost breakdown on hover.
 */

import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  DollarSign,
  Container,
  Database,
  MessageSquare,
  HardDrive,
  Zap,
  Network,
  Globe,
  Layers,
  ExternalLink,
  Box,
  Briefcase,
  AppWindow,
  Key,
  Lock,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Icon mapping for node types.
 * Maps backend node types to lucide-react icons.
 */
const nodeTypeIcons: Record<string, typeof Box> = {
  system: Server,
  service: Container,
  database: Database,
  queue: MessageSquare,
  bucket: HardDrive,
  function: Zap,
  job: Briefcase,
  ui: AppWindow,
  external_system: ExternalLink,
  gateway: Network,
  vpc: Globe,
  subnet: Layers,
  identity: Key,
  secret: Lock,
};

/**
 * Node icon component that renders the appropriate icon for a node type.
 * Declared at module level to satisfy react-hooks/static-components.
 */
function NodeIcon({ nodeType, className }: { nodeType?: string; className?: string }) {
  const IconComponent = nodeType && nodeTypeIcons[nodeType] ? nodeTypeIcons[nodeType] : Box;
  return <IconComponent className={className} />;
}

export interface CostData {
  /** Monthly cost value (supports both 'monthly' and 'monthlyUSD' from backend) */
  monthly?: number;
  breakdown?: Record<string, number>;
  currency?: string;
  confidence?: 'estimated' | 'actual';
}

export interface CostNodeData extends Record<string, unknown> {
  label: string;
  hasChildren?: boolean;
  cost?: CostData | null;
  level?: string | null;
  backendParentId?: string | null;
  /** Original node type from backend (service, database, queue, etc.) */
  nodeType?: string | null;
}

/**
 * Format a number as currency.
 * @param value - The value to format
 * @param currency - The currency code (default: USD)
 * @returns Formatted currency string
 */
function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format cost for display in badge (shorter format).
 * @param value - The value to format
 * @returns Short formatted string like "$150/mo"
 */
function formatCostBadge(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k/mo`;
  }
  return `$${value.toFixed(0)}/mo`;
}

/**
 * Cost tooltip component with breakdown.
 */
function CostTooltip({
  cost,
  visible,
}: {
  cost: CostData;
  visible: boolean;
}) {
  if (!visible || cost.monthly === undefined) return null;

  const currency = cost.currency || 'USD';

  return (
    <div
      className={cn(
        'absolute bottom-full right-0 mb-1 z-50',
        'bg-card border border-border rounded-md shadow-lg',
        'px-3 py-2 min-w-[150px] max-w-[250px]',
        'text-xs text-foreground',
        'transition-opacity duration-150',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      <div className="font-medium mb-1">
        Monthly Cost: {formatCurrency(cost.monthly, currency)}
      </div>
      {cost.breakdown && Object.keys(cost.breakdown).length > 0 && (
        <div className="border-t border-border pt-1 mt-1 space-y-0.5">
          <div className="text-muted-foreground mb-0.5">Breakdown:</div>
          {Object.entries(cost.breakdown).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-2">
              <span className="text-muted-foreground truncate">{key}:</span>
              <span className="font-mono">{formatCurrency(value, currency)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Cost badge component.
 */
function CostBadge({ cost }: { cost: CostData }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (cost.monthly === undefined || cost.monthly === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <CostTooltip cost={cost} visible={showTooltip} />
      <div
        className={cn(
          'flex items-center gap-0.5',
          'bg-secondary/80 text-secondary-foreground',
          'text-[10px] font-medium',
          'px-1.5 py-0.5 rounded',
          'border border-secondary',
          'cursor-default select-none'
        )}
      >
        <DollarSign className="h-3 w-3" />
        <span>{formatCostBadge(cost.monthly)}</span>
      </div>
    </div>
  );
}

/**
 * Custom node component with cost display.
 */
function CostNodeComponent(props: NodeProps) {
  const { data, selected } = props;
  // Cast data to our expected type
  const nodeData = data as CostNodeData;
  const hasChildren = nodeData?.hasChildren;
  const cost = nodeData?.cost;
  const label = nodeData?.label;
  const level = nodeData?.level;
  const nodeType = nodeData?.nodeType;

  return (
    <div
      className={cn(
        'px-4 py-2 rounded-md border-2',
        'bg-card text-card-foreground shadow-md',
        'min-w-[150px] max-w-[250px]',
        'transition-colors duration-150',
        selected && 'border-primary',
        !selected && hasChildren && 'border-secondary',
        !selected && !hasChildren && 'border-border',
        hasChildren && 'cursor-pointer'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-muted-foreground !w-2 !h-2"
      />

      <div className="flex flex-col gap-1">
        {/* Node header with icon and label */}
        <div className="flex items-center gap-1.5">
          <NodeIcon nodeType={nodeType ?? undefined} className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="font-medium text-sm truncate" title={label}>
            {label || 'Node'}
          </div>
        </div>

        {/* Level indicator */}
        {level && (
          <div className="text-[10px] text-muted-foreground">
            {level}
          </div>
        )}

        {/* Cost badge - positioned at bottom */}
        {cost && cost.monthly && cost.monthly > 0 && (
          <div className="flex justify-end mt-1">
            <CostBadge cost={cost} />
          </div>
        )}

        {/* Children indicator */}
        {hasChildren && (
          <div className="text-[10px] text-muted-foreground text-right">
            Double-click to expand
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-muted-foreground !w-2 !h-2"
      />
    </div>
  );
}

export const CostNode = memo(CostNodeComponent);

// Export formatCurrency for use in total cost calculation
export { formatCurrency };
