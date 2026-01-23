/**
 * API client for Kuramei backend.
 *
 * Handles communication with the FastAPI backend for graph persistence.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Constants for MVP
const DEFAULT_PROJECT_NAME = 'Default Project';
const DEFAULT_MODEL_NAME = 'Default Model';

// --- Types ---

export interface Position {
  x: number;
  y: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface NodeData {
  id: string;
  type: string;
  name: string;
  position: Position;
  description?: string | null;
  tags?: string[] | null;
  properties?: Record<string, unknown> | null;
  level?: string | null;
  parent_node_id?: string | null;
  size?: { width: number; height: number } | null;
  cost?: Record<string, unknown> | null;
}

export interface EdgeData {
  id: string;
  type: string;
  source_node_id: string;
  target_node_id: string;
  label?: string | null;
  properties?: Record<string, unknown> | null;
}

export interface GraphData {
  nodes: NodeData[];
  edges: EdgeData[];
  viewport?: Viewport | null;
}

export interface GraphResponse {
  nodes: NodeData[];
  edges: EdgeData[];
  viewport?: Viewport | null;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
}

export interface Model {
  id: string;
  project_id: string;
  name: string;
  description?: string | null;
  status: string;
}

// --- API Error class ---

export class ApiError extends Error {
  status: number;
  detail?: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

// --- Helper for API calls ---

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text();
    }
    throw new ApiError(
      `API request failed: ${response.status} ${response.statusText}`,
      response.status,
      detail
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// --- Project API ---

export async function listProjects(): Promise<Project[]> {
  return apiCall<Project[]>('/api/v1/projects');
}

export async function createProject(data: {
  name: string;
  description?: string;
}): Promise<Project> {
  return apiCall<Project>('/api/v1/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getProject(projectId: string): Promise<Project> {
  return apiCall<Project>(`/api/v1/projects/${projectId}`);
}

// --- Model API ---

export async function listModels(projectId?: string): Promise<Model[]> {
  const params = projectId ? `?project_id=${projectId}` : '';
  return apiCall<Model[]>(`/api/v1/models${params}`);
}

export async function createModel(data: {
  project_id: string;
  name: string;
  description?: string;
}): Promise<Model> {
  return apiCall<Model>('/api/v1/models', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getModel(modelId: string): Promise<Model> {
  return apiCall<Model>(`/api/v1/models/${modelId}`);
}

// --- Graph API ---

export interface LoadGraphOptions {
  /** Filter by semantic zoom level (L0, L1, L2, L3) */
  level?: string | null;
}

export async function loadGraph(
  modelId: string,
  options?: LoadGraphOptions
): Promise<GraphResponse> {
  const params = new URLSearchParams();
  if (options?.level) {
    params.set('level', options.level);
  }
  const queryString = params.toString();
  const url = `/api/v1/models/${modelId}/graph${queryString ? `?${queryString}` : ''}`;
  return apiCall<GraphResponse>(url);
}

export async function saveGraph(
  modelId: string,
  data: GraphData
): Promise<GraphResponse> {
  return apiCall<GraphResponse>(`/api/v1/models/${modelId}/graph`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// --- Bootstrap helpers for MVP ---

/**
 * Ensures a default project exists.
 * Lists existing projects and returns the first one, or creates a new one.
 */
export async function ensureDefaultProject(): Promise<Project> {
  const projects = await listProjects();

  // Use existing project if any
  if (projects.length > 0) {
    return projects[0];
  }

  // Create default project
  return await createProject({
    name: DEFAULT_PROJECT_NAME,
    description: 'Auto-created default project for MVP',
  });
}

/**
 * Ensures a default model exists within a project.
 * Lists existing models and returns the first one, or creates a new one.
 */
export async function ensureDefaultModel(projectId: string): Promise<Model> {
  const models = await listModels(projectId);

  // Use existing model if any
  if (models.length > 0) {
    return models[0];
  }

  // Create default model
  return await createModel({
    project_id: projectId,
    name: DEFAULT_MODEL_NAME,
    description: 'Auto-created default architecture model',
  });
}

/**
 * Bootstrap the MVP: ensure default project and model exist.
 * Returns the model ID to use.
 */
export async function bootstrapMvp(): Promise<string> {
  const project = await ensureDefaultProject();
  const model = await ensureDefaultModel(project.id);
  return model.id;
}

// --- Conversation types ---

export interface Conversation {
  id: string;
  model_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

// --- Chat types ---

export type SSEEventType = 'token' | 'operations' | 'graph' | 'error' | 'done';

export interface SSECallbacks {
  onToken?: (token: string) => void;
  onOperations?: (operations: unknown[]) => void;
  onGraph?: (graph: GraphResponse) => void;
  onError?: (error: string) => void;
  onDone?: () => void;
}

export interface SSEConnection {
  close: () => void;
}

// --- Conversation API ---

/**
 * Create a new conversation for a model.
 */
export async function createConversation(
  modelId: string,
  title?: string
): Promise<Conversation> {
  return apiCall<Conversation>('/api/v1/chat/conversations', {
    method: 'POST',
    body: JSON.stringify({ model_id: modelId, title }),
  });
}

/**
 * List conversations for a model.
 */
export async function listConversations(modelId: string): Promise<Conversation[]> {
  return apiCall<Conversation[]>(`/api/v1/chat/conversations?model_id=${encodeURIComponent(modelId)}`);
}

/**
 * Get messages for a conversation.
 */
export async function getConversationMessages(
  conversationId: string
): Promise<{ id: string; role: string; content: string; created_at: string }[]> {
  return apiCall(`/api/v1/chat/conversations/${conversationId}/messages`);
}

// --- Chat SSE API ---

/**
 * Send a message to a conversation and receive streaming response via SSE.
 *
 * @param conversationId - The conversation to send the message to
 * @param content - The message content
 * @param callbacks - Callbacks for different SSE event types
 * @returns Object with close() method to abort the connection
 */
export function sendMessageSSE(
  conversationId: string,
  content: string,
  callbacks: SSECallbacks
): SSEConnection {
  const url = `${API_URL}/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/messages`;
  const controller = new AbortController();

  // Guard against double onDone calls
  let doneHandled = false;
  const callOnDone = () => {
    if (!doneHandled) {
      doneHandled = true;
      callbacks.onDone?.();
    }
  };

  // Start the SSE connection
  (async () => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ content }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let detail: string;
        try {
          const json = await response.json();
          detail = json.detail || JSON.stringify(json);
        } catch {
          detail = await response.text();
        }
        callbacks.onError?.(`Request failed: ${response.status} - ${detail}`);
        callOnDone();
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        callbacks.onError?.('No response body');
        callOnDone();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Process any remaining buffer
          if (buffer.trim()) {
            processSSEChunk(buffer, callbacks, callOnDone);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Normalize line endings (handle \r\n from some servers)
        buffer = buffer.replace(/\r\n/g, '\n');

        // Process complete events (each ends with double newline)
        const events = buffer.split('\n\n');
        // Keep the last incomplete chunk in buffer
        buffer = events.pop() || '';

        for (const eventText of events) {
          if (eventText.trim()) {
            processSSEChunk(eventText, callbacks, callOnDone);
          }
        }
      }

      // Ensure onDone is called even if not received from server
      callOnDone();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // Connection was intentionally closed - still call onDone for cleanup
          callOnDone();
          return;
        }
        callbacks.onError?.(error.message);
      } else {
        callbacks.onError?.('Unknown error');
      }
      callOnDone();
    }
  })();

  return {
    close: () => controller.abort(),
  };
}

/**
 * Process a single SSE chunk and call appropriate callbacks.
 *
 * SSE spec: multiple `data:` lines are concatenated with newlines.
 */
function processSSEChunk(
  chunk: string,
  callbacks: SSECallbacks,
  callOnDone: () => void
): void {
  let eventType: SSEEventType | null = null;
  const dataLines: string[] = [];

  const lines = chunk.split('\n');
  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventType = line.slice(6).trim() as SSEEventType;
    } else if (line.startsWith('data:')) {
      // Accumulate data lines (SSE spec allows multiple data: lines)
      dataLines.push(line.slice(5));
    }
  }

  if (!eventType) {
    return;
  }

  // Join multiple data lines with newlines (per SSE spec)
  const data = dataLines.length > 0 ? dataLines.join('\n').trim() : null;

  switch (eventType) {
    case 'token':
      if (data) {
        try {
          const token = JSON.parse(data);
          callbacks.onToken?.(token);
        } catch {
          // If not JSON, use as-is
          callbacks.onToken?.(data);
        }
      }
      break;

    case 'operations':
      if (data) {
        try {
          const operations = JSON.parse(data);
          callbacks.onOperations?.(operations);
        } catch (e) {
          console.error('Failed to parse operations:', e, data);
        }
      }
      break;

    case 'graph':
      if (data) {
        try {
          const graph = JSON.parse(data);
          callbacks.onGraph?.(graph);
        } catch (e) {
          console.error('Failed to parse graph:', e, data);
        }
      }
      break;

    case 'error':
      if (data) {
        try {
          const errorMsg = JSON.parse(data);
          callbacks.onError?.(errorMsg);
        } catch {
          callbacks.onError?.(data);
        }
      }
      break;

    case 'done':
      callOnDone();
      break;
  }
}
