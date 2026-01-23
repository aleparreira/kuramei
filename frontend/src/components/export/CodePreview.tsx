import { useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface CodePreviewProps {
  filename: string;
  content: string;
}

export function CodePreview({ filename, content }: CodePreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightedContent = useMemo(
    () => highlightTerraform(content),
    [content]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <span className="text-sm font-medium text-foreground">{filename}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 px-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1 text-green-500" />
              <span className="text-xs">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" />
              <span className="text-xs">Copy</span>
            </>
          )}
        </Button>
      </div>

      {/* Code content */}
      <div className="flex-1 overflow-auto">
        <pre className="p-4 text-sm font-mono leading-relaxed">
          <code
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
            className="text-foreground"
          />
        </pre>
      </div>
    </div>
  );
}

/**
 * Simple syntax highlighting for Terraform/HCL.
 * Highlights: keywords, strings, comments, numbers, resource types.
 */
function highlightTerraform(code: string): string {
  // Escape HTML first
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Comments (# ...)
  html = html.replace(
    /(#.*)$/gm,
    '<span class="text-muted-foreground italic">$1</span>'
  );

  // Strings (double quotes)
  html = html.replace(
    /("(?:[^"\\]|\\.)*")/g,
    '<span class="text-green-600 dark:text-green-400">$1</span>'
  );

  // Numbers
  html = html.replace(
    /\b(\d+)\b/g,
    '<span class="text-orange-600 dark:text-orange-400">$1</span>'
  );

  // Terraform keywords
  const keywords = [
    'resource',
    'data',
    'variable',
    'output',
    'locals',
    'module',
    'provider',
    'terraform',
    'required_providers',
    'required_version',
    'for_each',
    'count',
    'depends_on',
    'lifecycle',
    'dynamic',
  ];
  const keywordPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
  html = html.replace(
    keywordPattern,
    '<span class="text-purple-600 dark:text-purple-400 font-semibold">$1</span>'
  );

  // Boolean values
  html = html.replace(
    /\b(true|false|null)\b/g,
    '<span class="text-blue-600 dark:text-blue-400">$1</span>'
  );

  // Resource types (aws_*, azurerm_*, etc.)
  html = html.replace(
    /\b(aws_[a-z_]+|azurerm_[a-z_]+|google_[a-z_]+)\b/g,
    '<span class="text-cyan-600 dark:text-cyan-400">$1</span>'
  );

  // Attribute names (before =)
  html = html.replace(
    /^(\s*)([a-z_]+)(\s*=)/gm,
    '$1<span class="text-secondary">$2</span>$3'
  );

  return html;
}
