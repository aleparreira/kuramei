import { cn } from '@/lib/utils';

export interface PromptSuggestionsProps {
  /** Callback when a prompt suggestion is selected */
  onSelectPrompt: (prompt: string) => void;
  /** Additional class names */
  className?: string;
}

const SUGGESTED_PROMPTS = [
  'Adicione um serviço de autenticação',
  'Conecte o Redis Cache ao API Gateway',
  'Qual é o ponto único de falha?',
  'Adicione um load balancer',
] as const;

/**
 * PromptSuggestions component - displays clickable prompt chips
 * when the chat is empty to help users get started.
 */
export function PromptSuggestions({
  onSelectPrompt,
  className,
}: PromptSuggestionsProps) {
  return (
    <div className={cn('flex flex-wrap justify-center gap-2', className)}>
      {SUGGESTED_PROMPTS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onSelectPrompt(prompt)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium',
            'bg-muted text-muted-foreground',
            'transition-colors hover:bg-primary/10 hover:text-primary',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
          )}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
