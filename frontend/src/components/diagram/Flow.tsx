import { useCallback, useEffect, useState, useMemo } from 'react';
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
import { MessageSquare, Layers, DollarSign } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ChatPanel } from '@/components/chat';
import { Breadcrumbs } from '@/components/diagram/Breadcrumbs';
import { CostNode, formatCurrency, type CostData } from '@/components/diagram/CostNode';
import { useChat, type ChatMessage } from '@/hooks/useChat';
import {
  loadGraph,
  saveGraph,
  bootstrapMvp,
  ApiError,
  type GraphData,
  type GraphResponse,
  type NodeData,
  type EdgeData,
  type Viewport,
} from '@/lib/api';
import { useCanvasStore, type ZoomLevel, type NavigationItem } from '@/stores/canvasStore';

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

// Custom node types for React Flow
const nodeTypes = {
  costNode: CostNode,
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
 * Parse cost data from backend format.
 * Backend may use 'monthlyUSD' or 'monthly' for the cost value.
 * @param costData - Raw cost data from backend (JSON object)
 * @returns Parsed CostData or null
 */
function parseCostData(costData: Record<string, unknown> | null | undefined): CostData | null {
  if (!costData) return null;

  // Support both 'monthly' and 'monthlyUSD' field names from backend
  const monthly = typeof costData.monthly === 'number'
    ? costData.monthly
    : typeof costData.monthlyUSD === 'number'
      ? costData.monthlyUSD
      : undefined;
  const breakdown = costData.breakdown && typeof costData.breakdown === 'object'
    ? costData.breakdown as Record<string, number>
    : undefined;
  const currency = typeof costData.currency === 'string' ? costData.currency : 'USD';
  const confidence = costData.confidence === 'estimated' || costData.confidence === 'actual'
    ? costData.confidence
    : undefined;

  if (monthly === undefined) return null;

  return { monthly, breakdown, currency, confidence };
}

/**
 * Convert backend node to React Flow format.
 * @param node - Backend node data
 * @param hasChildren - Whether this node has child nodes
 */
function nodeFromBackend(node: NodeData, hasChildren: boolean = false): Node {
  const cost = parseCostData(node.cost);
  // Use costNode type for all nodes (it handles cost display gracefully)
  const nodeType = 'costNode';

  return {
    id: node.id,
    type: nodeType,
    position: { x: node.position.x, y: node.position.y },
    data: {
      label: node.name,
      level: node.level,
      hasChildren,
      backendParentId: node.parent_node_id,
      cost,
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

// --- Level descriptions for tooltips ---
function getLevelDescription(level: ZoomLevel): string {
  const descriptions: Record<ZoomLevel, string> = {
    L0: 'System view (CEO)',
    L1: 'Domain view (CTO)',
    L2: 'Service view (Architect)',
    L3: 'Infrastructure view (DevOps)',
  };
  return descriptions[level];
}

// --- Main component ---

interface FlowCanvasProps {
  modelId: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
  /** Callback to register graph update handler from parent */
  onRegisterGraphUpdate?: (
    handler: (graph: GraphResponse) => void
  ) => void;
}

function FlowCanvas({
  modelId,
  onError,
  onSuccess,
  isChatOpen,
  onToggleChat,
  onRegisterGraphUpdate,
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { screenToFlowPosition, setViewport, toObject, fitView } = useReactFlow();

  // Store all nodes from backend (unfiltered) for child lookups
  const [allBackendNodes, setAllBackendNodes] = useState<NodeData[]>([]);
  const [allBackendEdges, setAllBackendEdges] = useState<EdgeData[]>([]);

  // Zustand store for semantic zoom and navigation
  const currentLevel = useCanvasStore((state) => state.currentLevel);
  const setLevel = useCanvasStore((state) => state.setLevel);
  const navigationPath = useCanvasStore((state) => state.navigationPath);
  const currentParentId = useCanvasStore((state) => state.currentParentId);
  const pushNavigation = useCanvasStore((state) => state.pushNavigation);
  const popToNavigation = useCanvasStore((state) => state.popToNavigation);
  const clearNavigation = useCanvasStore((state) => state.clearNavigation);

  // Helper to check if a node has children
  const getNodesWithChildrenInfo = useCallback((backendNodes: NodeData[]) => {
    const parentIds = new Set(
      backendNodes
        .filter((n) => n.parent_node_id)
        .map((n) => n.parent_node_id as string)
    );
    return backendNodes.map((node) => ({
      ...node,
      hasChildren: parentIds.has(node.id),
    }));
  }, []);

  // Filter nodes based on currentParentId (for drill-down)
  const filterNodesForDisplay = useCallback(
    (backendNodes: NodeData[], parentId: string | null) => {
      // Build children info for all nodes
      const nodesWithChildren = getNodesWithChildrenInfo(backendNodes);

      // Filter based on parent
      const filtered = nodesWithChildren.filter((node) => {
        if (parentId === null) {
          // Show nodes without parent (root level)
          return !node.parent_node_id;
        }
        // Show children of the current parent
        return node.parent_node_id === parentId;
      });

      return filtered.map((n) => nodeFromBackend(n, n.hasChildren));
    },
    [getNodesWithChildrenInfo]
  );

  // Filter edges to only show those connecting visible nodes
  const filterEdgesForDisplay = useCallback(
    (backendEdges: EdgeData[], visibleNodeIds: Set<string>) => {
      return backendEdges
        .filter(
          (edge) =>
            visibleNodeIds.has(edge.source_node_id) &&
            visibleNodeIds.has(edge.target_node_id)
        )
        .map(edgeFromBackend);
    },
    []
  );

  // Handle graph updates from chat (SSE)
  const handleGraphUpdate = useCallback(
    (graph: GraphResponse) => {
      console.log('[FlowCanvas] Applying graph update from chat');
      setAllBackendNodes(graph.nodes);
      setAllBackendEdges(graph.edges);

      const displayNodes = filterNodesForDisplay(graph.nodes, currentParentId);
      const visibleIds = new Set(displayNodes.map((n) => n.id));
      const displayEdges = filterEdgesForDisplay(graph.edges, visibleIds);

      setNodes(displayNodes);
      setEdges(displayEdges);
      onSuccess('Architecture updated via chat');
    },
    [setNodes, setEdges, onSuccess, currentParentId, filterNodesForDisplay, filterEdgesForDisplay, setAllBackendNodes, setAllBackendEdges]
  );

  // Register the graph update handler with parent
  useEffect(() => {
    onRegisterGraphUpdate?.(handleGraphUpdate);
  }, [onRegisterGraphUpdate, handleGraphUpdate]);

  // Load graph when modelId or currentLevel changes
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const graph = await loadGraph(modelId, { level: currentLevel });
        // Store all backend data
        setAllBackendNodes(graph.nodes);
        setAllBackendEdges(graph.edges);

        // Apply drill-down filter
        const displayNodes = filterNodesForDisplay(graph.nodes, currentParentId);
        const visibleIds = new Set(displayNodes.map((n) => n.id));
        const displayEdges = filterEdgesForDisplay(graph.edges, visibleIds);

        setNodes(displayNodes);
        setEdges(displayEdges);

        if (graph.viewport) {
          setViewport(graph.viewport);
        }
        onSuccess(currentLevel ? `Graph loaded (${currentLevel})` : 'Graph loaded');
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
  }, [modelId, currentLevel, setNodes, setEdges, setViewport, onError, onSuccess, currentParentId, filterNodesForDisplay, filterEdgesForDisplay]);

  // Handle level toggle
  const handleLevelChange = useCallback(
    (level: ZoomLevel | null) => {
      setLevel(level);
      // Clear navigation when level changes
      clearNavigation();
    },
    [setLevel, clearNavigation]
  );

  // Handle node double-click for drill-down
  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Check if node has children
      if (!node.data?.hasChildren) {
        return; // No drill-down for leaf nodes
      }

      // Find the backend node to get full info
      const backendNode = allBackendNodes.find((n) => n.id === node.id);
      if (!backendNode) return;

      const navItem: NavigationItem = {
        id: node.id,
        name: String(node.data?.label || 'Unknown'),
        level: String(backendNode.level || 'N/A'),
      };

      pushNavigation(navItem);

      // Filter and display children
      const displayNodes = filterNodesForDisplay(allBackendNodes, node.id);
      const visibleIds = new Set(displayNodes.map((n) => n.id));
      const displayEdges = filterEdgesForDisplay(allBackendEdges, visibleIds);

      setNodes(displayNodes);
      setEdges(displayEdges);

      // Fit view to show all children
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
    },
    [allBackendNodes, allBackendEdges, pushNavigation, filterNodesForDisplay, filterEdgesForDisplay, setNodes, setEdges, fitView]
  );

  // Handle breadcrumb navigation
  const handleBreadcrumbNavigate = useCallback(
    (index: number) => {
      const targetItem = navigationPath[index];
      if (!targetItem) return;

      popToNavigation(index);

      // Filter to show children of the selected node
      const displayNodes = filterNodesForDisplay(allBackendNodes, targetItem.id);
      const visibleIds = new Set(displayNodes.map((n) => n.id));
      const displayEdges = filterEdgesForDisplay(allBackendEdges, visibleIds);

      setNodes(displayNodes);
      setEdges(displayEdges);

      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
    },
    [navigationPath, popToNavigation, allBackendNodes, allBackendEdges, filterNodesForDisplay, filterEdgesForDisplay, setNodes, setEdges, fitView]
  );

  // Handle breadcrumb "Home" click
  const handleBreadcrumbHome = useCallback(() => {
    clearNavigation();

    // Show root nodes (no parent)
    const displayNodes = filterNodesForDisplay(allBackendNodes, null);
    const visibleIds = new Set(displayNodes.map((n) => n.id));
    const displayEdges = filterEdgesForDisplay(allBackendEdges, visibleIds);

    setNodes(displayNodes);
    setEdges(displayEdges);

    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
  }, [clearNavigation, allBackendNodes, allBackendEdges, filterNodesForDisplay, filterEdgesForDisplay, setNodes, setEdges, fitView]);

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

  // Add node at center of current viewport
  const handleAddNode = useCallback(() => {
    const flow = toObject();
    const { x, y, zoom } = flow.viewport;

    // Calculate center of visible area
    const centerX = (-x + window.innerWidth / 2) / zoom;
    const centerY = (-y + window.innerHeight / 2) / zoom;

    const newNode: Node = {
      id: getNextId(),
      type: 'default',
      position: { x: centerX - 75, y: centerY - 20 }, // Offset to center the node
      data: { label: `Node ${nodes.length + 1}` },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [setNodes, toObject, nodes.length]);

  // Calculate total cost of visible nodes
  const totalCost = useMemo(() => {
    return nodes.reduce((sum, node) => {
      const cost = node.data?.cost as CostData | undefined;
      if (cost?.monthly && typeof cost.monthly === 'number') {
        return sum + cost.monthly;
      }
      return sum;
    }, 0);
  }, [nodes]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading graph...</div>
      </div>
    );
  }

  // Enhance nodes with hasChildren visual indicator
  const enhancedNodes = nodes.map((node) => ({
    ...node,
    // Add a subtle className for nodes with children (can be styled in CSS)
    className: node.data?.hasChildren ? 'has-children' : undefined,
  }));

  return (
    <ReactFlow
      nodes={enhancedNodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDoubleClick={onDoubleClick}
      onNodeDoubleClick={handleNodeDoubleClick}
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
        nodeColor={(node) => (node.data?.hasChildren ? '#65ebe7' : '#ff4c60')}
        maskColor="rgba(69, 67, 96, 0.1)"
      />
      {/* Breadcrumbs for drill-down navigation */}
      {navigationPath.length > 0 && (
        <Panel position="top-center">
          <Breadcrumbs
            path={navigationPath}
            onNavigate={handleBreadcrumbNavigate}
            onHome={handleBreadcrumbHome}
          />
        </Panel>
      )}
      <Panel position="top-right" className="flex gap-2">
        <Button
          variant={isChatOpen ? 'default' : 'outline'}
          onClick={onToggleChat}
          size="icon"
          title="Toggle chat"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={handleAddNode}>
          + Add Node
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </Panel>
      <Panel position="top-left" className="flex flex-col gap-2">
        <div className="flex gap-1 items-center">
          {(['L0', 'L1', 'L2', 'L3'] as const).map((level) => (
            <Button
              key={level}
              variant={currentLevel === level ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleLevelChange(level)}
              title={getLevelDescription(level)}
              className="min-w-[40px]"
            >
              {level}
            </Button>
          ))}
          <Button
            variant={currentLevel === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleLevelChange(null)}
            title="Show all levels"
            className="min-w-[40px]"
          >
            All
          </Button>
          {/* Total cost display */}
          {totalCost > 0 && (
            <>
              <div className="h-4 w-px bg-border mx-1" />
              <div
                className="flex items-center gap-1 bg-card/90 backdrop-blur-sm px-2 py-1 rounded-md border border-border text-sm"
                title="Total monthly cost of visible nodes"
              >
                <DollarSign className="h-4 w-4 text-secondary" />
                <span className="font-medium">
                  Total: {formatCurrency(totalCost)}/mo
                </span>
              </div>
            </>
          )}
        </div>
        {/* Legend for drill-down */}
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Layers className="h-3 w-3" />
          <span>Double-click nodes with children to drill-down</span>
        </div>
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

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Graph update handler - will be set by FlowCanvas
  const [graphUpdateHandler, setGraphUpdateHandler] = useState<
    ((graph: GraphResponse) => void) | null
  >(null);

  // useChat hook for SSE streaming
  const {
    messages,
    streamingContent,
    isLoading: isLoadingChat,
    error: chatError,
    sendMessage,
  } = useChat({
    modelId: modelId || '',
    onGraphUpdate: useCallback(
      (graph: GraphResponse) => {
        // Forward to FlowCanvas via the registered handler
        graphUpdateHandler?.(graph);
      },
      [graphUpdateHandler]
    ),
    onOperations: useCallback((operations: unknown[]) => {
      // Log operations for debugging
      console.log('[Flow] Operations applied:', operations.length);
    }, []),
  });

  // Convert chat messages to the format expected by ChatPanel
  const chatMessages: ChatMessage[] = messages;

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

  // Chat handlers
  const handleToggleChat = useCallback(() => {
    setIsChatOpen((prev) => !prev);
  }, []);

  const handleCloseChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  // Register graph update handler from FlowCanvas
  const handleRegisterGraphUpdate = useCallback(
    (handler: (graph: GraphResponse) => void) => {
      setGraphUpdateHandler(() => handler);
    },
    []
  );

  // Show chat error in status bar
  useEffect(() => {
    if (chatError) {
      handleError(chatError);
    }
  }, [chatError, handleError]);

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
    <div className="flex h-full w-full">
      {/* Canvas area */}
      <div className="relative flex-1">
        <ReactFlowProvider>
          {modelId && (
            <FlowCanvas
              modelId={modelId}
              onError={handleError}
              onSuccess={handleSuccess}
              isChatOpen={isChatOpen}
              onToggleChat={handleToggleChat}
              onRegisterGraphUpdate={handleRegisterGraphUpdate}
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

      {/* Chat panel */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={handleCloseChat}
        messages={chatMessages}
        onSendMessage={sendMessage}
        isLoading={isLoadingChat}
        streamingContent={streamingContent}
      />
    </div>
  );
}
