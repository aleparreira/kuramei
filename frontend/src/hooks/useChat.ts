/**
 * Custom hook for managing chat state with SSE streaming.
 *
 * Handles conversation lifecycle, message streaming, and graph updates.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  createConversation,
  sendMessageSSE,
  type Conversation,
  type GraphResponse,
  type SSEConnection,
} from '@/lib/api';

// --- Types ---

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
}

export interface UseChatOptions {
  /** Model ID to bind the conversation to */
  modelId: string;
  /** Callback when graph is updated via chat operations */
  onGraphUpdate?: (graph: GraphResponse) => void;
  /** Callback when operations are received (for debugging/logging) */
  onOperations?: (operations: unknown[]) => void;
}

export interface UseChatReturn {
  /** Current conversation ID (null if no conversation started) */
  conversationId: string | null;
  /** List of messages in the conversation */
  messages: ChatMessage[];
  /** Content being streamed (partial assistant response) */
  streamingContent: string | undefined;
  /** Whether a response is currently being streamed */
  isLoading: boolean;
  /** Current error message, if any */
  error: string | null;
  /** Send a message and start streaming the response */
  sendMessage: (content: string) => void;
  /** Reset the conversation (clear messages, create new conversation) */
  reset: () => void;
  /** Close any active SSE connection */
  close: () => void;
}

// --- ID generator ---

let messageIdCounter = 0;
const getNextMessageId = () => `msg_${Date.now()}_${++messageIdCounter}`;

// --- Hook implementation ---

export function useChat({
  modelId,
  onGraphUpdate,
  onOperations,
}: UseChatOptions): UseChatReturn {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState<string | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref for SSE connection to allow cleanup
  const connectionRef = useRef<SSEConnection | null>(null);

  // Ref to track if component is mounted (for async operations)
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      connectionRef.current?.close();
    };
  }, []);

  /**
   * Close the current SSE connection.
   */
  const close = useCallback(() => {
    connectionRef.current?.close();
    connectionRef.current = null;
  }, []);

  /**
   * Reset the conversation - clear messages and conversation ID.
   */
  const reset = useCallback(() => {
    close();
    setConversationId(null);
    setMessages([]);
    setStreamingContent(undefined);
    setIsLoading(false);
    setError(null);
  }, [close]);

  /**
   * Send a message and stream the response.
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!modelId) {
        setError('No model ID provided');
        return;
      }

      // Close any existing connection
      close();

      // Clear previous error
      setError(null);

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: getNextMessageId(),
        role: 'user',
        content,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setStreamingContent('');

      try {
        // Create conversation if needed
        let currentConversationId = conversationId;
        if (!currentConversationId) {
          const conversation: Conversation = await createConversation(modelId);
          if (!isMountedRef.current) return;
          currentConversationId = conversation.id;
          setConversationId(currentConversationId);
        }

        // Track accumulated streaming content for final message
        let accumulatedContent = '';

        // Start SSE stream
        const connection = sendMessageSSE(
          currentConversationId,
          content,
          {
            onToken: (token: string) => {
              if (!isMountedRef.current) return;
              accumulatedContent += token;
              setStreamingContent(accumulatedContent);
            },

            onOperations: (operations: unknown[]) => {
              if (!isMountedRef.current) return;
              // Log operations (for debugging)
              console.log('[useChat] Operations received:', operations);
              onOperations?.(operations);
            },

            onGraph: (graph: GraphResponse) => {
              if (!isMountedRef.current) return;
              console.log('[useChat] Graph update received');
              onGraphUpdate?.(graph);
            },

            onError: (errorMsg: string) => {
              if (!isMountedRef.current) return;
              console.error('[useChat] Error:', errorMsg);
              setError(errorMsg);
            },

            onDone: () => {
              if (!isMountedRef.current) return;
              // Finalize the assistant message
              if (accumulatedContent) {
                const assistantMessage: ChatMessage = {
                  id: getNextMessageId(),
                  role: 'assistant',
                  content: accumulatedContent,
                };
                setMessages((prev) => [...prev, assistantMessage]);
              }
              setStreamingContent(undefined);
              setIsLoading(false);
              connectionRef.current = null;
            },
          }
        );

        connectionRef.current = connection;
      } catch (err) {
        if (!isMountedRef.current) return;
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        setStreamingContent(undefined);
        setIsLoading(false);
      }
    },
    [modelId, conversationId, close, onGraphUpdate, onOperations]
  );

  return {
    conversationId,
    messages,
    streamingContent,
    isLoading,
    error,
    sendMessage,
    reset,
    close,
  };
}
