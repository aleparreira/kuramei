'use client';

import { useCallback } from 'react';
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
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

// Config from DESIGN-SYSTEM.md
const canvasConfig = {
  defaultViewport: { x: 0, y: 0, zoom: 1 },
  minZoom: 0.1,
  maxZoom: 4,
  snapToGrid: true,
  snapGrid: [16, 16] as [number, number],
  fitView: true,
  fitViewOptions: {
    padding: 0.2,
  },
};

let nodeId = 0;
const getNextId = () => `node_${++nodeId}`;

function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

  const onConnect: OnConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      // Convert screen coordinates to flow coordinates
      // This accounts for zoom and pan transformations
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: getNextId(),
        type: 'default',
        position,
        data: { label: `Node ${nodeId}` },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, screenToFlowPosition]
  );

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
    </ReactFlow>
  );
}

export default function Flow() {
  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <FlowCanvas />
      </ReactFlowProvider>
    </div>
  );
}
