import { cn } from '@/lib/utils';

export type MessageRole = 'user' | 'assistant';

export interface ChatMessageProps {
  role: MessageRole;
  content: string;
  isStreaming?: boolean;
}

/**
 * ChatMessage component - displays a single message bubble.
 * User messages align right with primary color.
 * Assistant messages align left with muted color.
 */
export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div
      className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        <p className="whitespace-pre-wrap break-words">
          {content}
          {isStreaming && (
            <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-current" />
          )}
        </p>
      </div>
    </div>
  );
}
