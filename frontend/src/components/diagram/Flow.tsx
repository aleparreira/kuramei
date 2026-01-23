'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Panel,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Button } from '@/components/ui/button';
import {
  loadGraph,
  saveGraph,
  bootstrapMvp,
  ApiError,
  type GraphData,
  type NodeData,
  type EdgeData,
  type Viewport,
} from '@/lib/api';

// Config from DESIGN-SYSTEM.md
const canvasConfig = {
  defaultViewport: { x: 0, y: 0, zoom: 1 },
  minZoom: 0.1,
  maxZoom: 4,
  snapToGrid: true,
  snapGrid: [16, 16] as [number, number],
  fitView: false, // We'll restore viewport from backend instead
  fitViewOptions: {
    padding: 0.2,
  },
};

// --- Conversion helpers: React Flow <-> Backend ---

/**
 * Convert React Flow node to backend format.
 */
function nodeToBackend(node: Node): NodeData {
  // Extract label from data for the name field
  const name =
    typeof node.data?.label === 'string'
      ? node.data.label
      : `Node ${node.id}`;

  return {
    id: node.id,
    type: node.type || 'default',
    name,
    position: { x: node.position.x, y: node.position.y },
    description: null,
    tags: null,
    properties: node.data ? { ...node.data } : null,
    level: null,
    parent_node_id: node.parentId || null,
    size:
      node.width && node.height
        ? { width: node.width, height: node.height }
        : null,
    cost: null,
  };
}

/**
 * Convert backend node to React Flow format.
 */
function nodeFromBackend(node: NodeData): Node {
  return {
    id: node.id,
    type: node.type === 'default' ? 'default' : node.type,
    position: { x: node.position.x, y: node.position.y },
    data: {
      label: node.name,
      ...(node.properties || {}),
    },
    parentId: node.parent_node_id || undefined,
    ...(node.size
      ? { width: node.size.width, height: node.size.height }
      : {}),
  };
}

/**
 * Convert React Flow edge to backend format.
 */
function edgeToBackend(edge: Edge): EdgeData {
  return {
    id: edge.id,
    type: edge.type || 'default',
    source_node_id: edge.source,
    target_node_id: edge.target,
    label: typeof edge.label === 'string' ? edge.label : null,
    properties: edge.data ? { ...edge.data } : null,
  };
}

/**
 * Convert backend edge to React Flow format.
 */
function edgeFromBackend(edge: EdgeData): Edge {
  return {
    id: edge.id,
    type: edge.type === 'default' ? undefined : edge.type,
    source: edge.source_node_id,
    target: edge.target_node_id,
    label: edge.label || undefined,
    data: edge.properties || {},
  };
}

// --- Node ID generator ---
let nodeIdCounter = 0;
const getNextId = () => `node_${Date.now()}_${++nodeIdCounter}`;

// --- Main component ---

interface FlowCanvasProps {
  modelId: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

function FlowCanvas({ modelId, onError, onSuccess }: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { screenToFlowPosition, setViewport, toObject } = useReactFlow();

  // Load graph on mount
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const graph = await loadGraph(modelId);
        setNodes(graph.nodes.map(nodeFromBackend));
        setEdges(graph.edges.map(edgeFromBackend));
        if (graph.viewport) {
          setViewport(graph.viewport);
        }
        onSuccess('Graph loaded');
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          // Model exists but graph is empty - that's fine
          onSuccess('Ready to create your architecture');
        } else {
          onError(
            error instanceof Error ? error.message : 'Failed to load graph'
          );
        }
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [modelId, setNodes, setEdges, setViewport, onError, onSuccess]);

  // Handle edge connections
  const onConnect: OnConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Handle double-click to create nodes
  const onDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: getNextId(),
        type: 'default',
        position,
        data: { label: `New Node` },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, screenToFlowPosition]
  );

  // Save graph to backend
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const flow = toObject();

      const graphData: GraphData = {
        nodes: flow.nodes.map(nodeToBackend),
        edges: flow.edges.map(edgeToBackend),
        viewport: flow.viewport as Viewport,
      };

      await saveGraph(modelId, graphData);
      onSuccess('Graph saved successfully');
    } catch (error) {
      onError(
        error instanceof Error ? error.message : 'Failed to save graph'
      );
    } finally {
      setIsSaving(false);
    }
  }, [modelId, toObject, onError, onSuccess]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading graph...</div>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDoubleClick={onDoubleClick}
      defaultViewport={canvasConfig.defaultViewport}
      minZoom={canvasConfig.minZoom}
      maxZoom={canvasConfig.maxZoom}
      snapToGrid={canvasConfig.snapToGrid}
      snapGrid={canvasConfig.snapGrid}
      fitView={canvasConfig.fitView}
      fitViewOptions={canvasConfig.fitViewOptions}
      className="bg-background"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={16}
        size={1}
        className="bg-background"
      />
      <Controls className="!bg-card !border-border !shadow-md" />
      <MiniMap
        className="!bg-card !border-border"
        nodeColor="#ff4c60"
        maskColor="rgba(69, 67, 96, 0.1)"
      />
      <Panel position="top-right" className="flex gap-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </Panel>
    </ReactFlow>
  );
}

// --- Wrapper with bootstrap ---

export default function Flow() {
  const [modelId, setModelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  // Bootstrap MVP on mount
  useEffect(() => {
    async function init() {
      setIsBootstrapping(true);
      setError(null);
      try {
        const id = await bootstrapMvp();
        setModelId(id);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to connect to backend. Is the server running?'
        );
      } finally {
        setIsBootstrapping(false);
      }
    }

    init();
  }, []);

  const handleError = useCallback((message: string) => {
    setError(message);
    setStatus(null);
    // Clear error after 5 seconds
    setTimeout(() => setError(null), 5000);
  }, []);

  const handleSuccess = useCallback((message: string) => {
    setStatus(message);
    setError(null);
    // Clear status after 3 seconds
    setTimeout(() => setStatus(null), 3000);
  }, []);

  if (isBootstrapping) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Connecting to backend...</div>
      </div>
    );
  }

  if (error && !modelId) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-background gap-4">
        <div className="text-destructive font-medium">Connection Error</div>
        <div className="text-muted-foreground text-sm max-w-md text-center">
          {error}
        </div>
        <div className="text-muted-foreground text-xs">
          Make sure the backend is running: cd backend && uvicorn src.main:app
          --reload --port 8000
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <ReactFlowProvider>
        {modelId && (
          <FlowCanvas
            modelId={modelId}
            onError={handleError}
            onSuccess={handleSuccess}
          />
        )}
      </ReactFlowProvider>
      {/* Status/Error toast */}
      {(error || status) && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`px-4 py-2 rounded-md shadow-lg text-sm ${
              error
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-card text-card-foreground border border-border'
            }`}
          >
            {error || status}
          </div>
        </div>
      )}
    </div>
  );
}
