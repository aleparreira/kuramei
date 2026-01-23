'use client';

import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
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

export default function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onConnect: OnConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      // Get position relative to the React Flow pane
      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNode: Node = {
        id: getNextId(),
        type: 'default',
        position,
        data: { label: `Node ${nodeId}` },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  return (
    <div ref={reactFlowWrapper} className="h-full w-full" onDoubleClick={onDoubleClick}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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
    </div>
  );
}
