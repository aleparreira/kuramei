import { FileCode, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileTreeItem {
  path: string;
  name: string;
  isFolder?: boolean;
  children?: FileTreeItem[];
}

interface FileTreeProps {
  files: FileTreeItem[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

export function FileTree({ files, selectedPath, onSelect }: FileTreeProps) {
  return (
    <div className="flex flex-col gap-1 py-2">
      {files.map((file) => (
        <FileTreeNode
          key={file.path}
          file={file}
          selectedPath={selectedPath}
          onSelect={onSelect}
          depth={0}
        />
      ))}
    </div>
  );
}

interface FileTreeNodeProps {
  file: FileTreeItem;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  depth: number;
}

function FileTreeNode({ file, selectedPath, onSelect, depth }: FileTreeNodeProps) {
  const isSelected = file.path === selectedPath;
  const isFolder = file.isFolder ?? false;
  const hasChildren = file.children && file.children.length > 0;

  return (
    <div>
      <button
        onClick={() => !isFolder && onSelect(file.path)}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left rounded-md transition-colors',
          isSelected
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-foreground hover:bg-muted',
          isFolder && 'cursor-default'
        )}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        disabled={isFolder}
      >
        {isFolder ? (
          hasChildren ? (
            <FolderOpen className="h-4 w-4 text-secondary shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-secondary shrink-0" />
          )
        ) : (
          <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="truncate">{file.name}</span>
      </button>
      {hasChildren && (
        <div>
          {file.children!.map((child) => (
            <FileTreeNode
              key={child.path}
              file={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Transform flat file list to tree structure.
 * Groups files by directory.
 */
export function buildFileTree(files: { path: string }[]): FileTreeItem[] {
  const items: FileTreeItem[] = [];

  for (const file of files) {
    const parts = file.path.split('/');
    const fileName = parts.pop()!;

    // For now, we keep files flat (no nested directories)
    // since Terraform exports are typically at root level
    items.push({
      path: file.path,
      name: fileName,
      isFolder: false,
    });
  }

  // Sort by name (main.tf first, then alphabetically)
  return items.sort((a, b) => {
    if (a.name === 'main.tf') return -1;
    if (b.name === 'main.tf') return 1;
    if (a.name === 'outputs.tf') return 1;
    if (b.name === 'outputs.tf') return -1;
    return a.name.localeCompare(b.name);
  });
}
