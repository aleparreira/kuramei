import { useState, useRef, useEffect, useCallback } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatMessage, type MessageRole } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { cn } from '@/lib/utils';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
}

export interface ChatPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback when close button is clicked */
  onClose: () => void;
  /** Messages to display */
  messages: Message[];
  /** Callback when a message is sent */
  onSendMessage: (content: string) => void;
  /** Whether the assistant is currently responding */
  isLoading?: boolean;
  /** Content being streamed (partial assistant response) */
  streamingContent?: string;
  /** Panel title */
  title?: string;
}

/**
 * ChatPanel component - main container for the chat interface.
 * Displays alongside the canvas with header, messages area, and input.
 */
export function ChatPanel({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  isLoading = false,
  streamingContent,
  title = 'Architecture Assistant',
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Scroll on new messages or streaming content
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    onSendMessage(trimmed);
    setInputValue('');
  }, [inputValue, isLoading, onSendMessage]);

  if (!isOpen) {
    return null;
  }

  const isEmpty = messages.length === 0 && !streamingContent;

  return (
    <div
      className={cn(
        'flex h-full w-80 flex-col border-l border-border bg-card',
        'shrink-0'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="h-7 w-7"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close chat</span>
        </Button>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4"
      >
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">
              Start a conversation
            </p>
            <p className="mt-1 max-w-[200px] text-xs text-muted-foreground/70">
              Describe what you want to create and I'll help you build your
              architecture.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
              />
            ))}
            {streamingContent && (
              <ChatMessage
                role="assistant"
                content={streamingContent}
                isStreaming
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSend}
        disabled={isLoading}
        placeholder="Describe what you want to create..."
      />
    </div>
  );
}
