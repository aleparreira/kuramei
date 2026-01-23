/**
 * API client for Kuramei backend.
 *
 * Handles communication with the FastAPI backend for graph persistence.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  constructor(
    message: string,
    public status: number,
    public detail?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
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

export async function loadGraph(modelId: string): Promise<GraphResponse> {
  return apiCall<GraphResponse>(`/api/v1/models/${modelId}/graph`);
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
