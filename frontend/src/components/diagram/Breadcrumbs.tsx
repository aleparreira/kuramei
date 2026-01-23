/**
 * Breadcrumbs component for drill-down navigation.
 *
 * Displays the current navigation path and allows clicking to navigate
 * back to a specific level.
 */

import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type NavigationItem } from '@/stores/canvasStore';

interface BreadcrumbsProps {
  path: NavigationItem[];
  onNavigate: (index: number) => void;
  onHome: () => void;
}

export function Breadcrumbs({ path, onNavigate, onHome }: BreadcrumbsProps) {
  if (path.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-card/90 backdrop-blur-sm rounded-md border border-border shadow-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={onHome}
        className="h-7 px-2 text-muted-foreground hover:text-foreground"
        title="Back to all nodes"
      >
        <Home className="h-4 w-4" />
        <span className="ml-1 text-xs">All</span>
      </Button>

      {path.map((item, index) => (
        <div key={item.id} className="flex items-center">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={index === path.length - 1 ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onNavigate(index)}
            className="h-7 px-2"
            title={`${item.name} (${item.level})`}
          >
            <span className="text-xs max-w-[120px] truncate">{item.name}</span>
          </Button>
        </div>
      ))}
    </div>
  );
}
