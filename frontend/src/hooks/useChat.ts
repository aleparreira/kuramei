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

  // Request ID to guard against stale callbacks from previous requests
  const requestIdRef = useRef(0);

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
   * Increments request ID to invalidate any pending callbacks.
   */
  const close = useCallback(() => {
    // Increment request ID to make any pending callbacks stale
    requestIdRef.current++;
    connectionRef.current?.close();
    connectionRef.current = null;
    // Clear loading state immediately since we're canceling
    setStreamingContent(undefined);
    setIsLoading(false);
  }, []);

  /**
   * Reset the conversation - clear messages and conversation ID.
   */
  const reset = useCallback(() => {
    close();
    setConversationId(null);
    setMessages([]);
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

      // Close any existing connection (this increments requestIdRef)
      close();

      // Capture the current request ID - callbacks will check this to avoid stale updates
      const currentRequestId = requestIdRef.current;

      // Helper to check if this request is still active
      const isStale = () =>
        !isMountedRef.current || requestIdRef.current !== currentRequestId;

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
          if (isStale()) return;
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
              if (isStale()) return;
              accumulatedContent += token;
              setStreamingContent(accumulatedContent);
            },

            onOperations: (operations: unknown[]) => {
              if (isStale()) return;
              // Log operations (for debugging)
              console.log('[useChat] Operations received:', operations);
              onOperations?.(operations);
            },

            onGraph: (graph: GraphResponse) => {
              if (isStale()) return;
              console.log('[useChat] Graph update received');
              onGraphUpdate?.(graph);
            },

            onError: (errorMsg: string) => {
              if (isStale()) return;
              console.error('[useChat] Error:', errorMsg);
              setError(errorMsg);
            },

            onDone: () => {
              // Skip finalization if this request was canceled or superseded
              if (isStale()) return;
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
        if (isStale()) return;
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
