"use client";

import { useMemo, useState, useCallback } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from "reactflow";
import "reactflow/dist/style.css";
import { Network } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgentNode } from "./agent-node";
import { TokenFlowEdge } from "./token-flow-edge";
import { AgentDetailPanel } from "./agent-detail-panel";
import { layoutGraph } from "./layout";
import type { GraphResult, GraphNodeData } from "@/types/scan";

const nodeTypes = { agentNode: AgentNode };
const edgeTypes = { tokenFlow: TokenFlowEdge };

const HEALTH_LEGEND: { color: string; label: string }[] = [
  { color: "var(--teal)", label: "Healthy" },
  { color: "var(--amber)", label: "Warning" },
  { color: "var(--red)", label: "Critical" },
];

export function ArchitectureGraph({ graph }: { graph: GraphResult }) {
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);

  const { flowNodes, flowEdges } = useMemo(() => {
    const laidOut = layoutGraph(graph.nodes);

    const nodes: Node<GraphNodeData>[] = laidOut.map((n) => ({
      id: n.id,
      type: "agentNode",
      position: { x: n.x, y: n.y },
      data: n,
    }));

    const edges: Edge[] = graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "tokenFlow",
      data: { estimated_token_flow: e.estimated_token_flow, label: e.label },
    }));

    return { flowNodes: nodes, flowEdges: edges };
  }, [graph]);

  const handleNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedNode(node.data as GraphNodeData);
  }, []);

  const nodeColor = useCallback((node: Node<GraphNodeData>) => {
    const health = node.data?.health;
    if (health === "critical") return "var(--red)";
    if (health === "warning") return "var(--amber)";
    if (health === "healthy" && (node.data?.lane === "main" || node.data?.lane === "support")) return "var(--teal)";
    return "var(--border-strong)";
  }, []);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="mono-tag text-xs text-primary">[ARCHITECTURE VISUALIZER]</span>
            <CardTitle className="mt-1 flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" />
              Detected agent workflow
            </CardTitle>
          </div>
          <div className="flex items-center gap-3">
            {HEALTH_LEGEND.map((item) => (
              <span key={item.label} className="mono-tag flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
            ))}
            {graph.is_inferred && <Badge variant="amber">FULLY INFERRED</Badge>}
          </div>
        </div>
        <CardDescription>
          {graph.is_inferred
            ? `No agent code was detected — this is a generic ${graph.framework ?? "framework"} pipeline shape, not your actual architecture.`
            : "Click any node for the full diagnosis. Edge thickness reflects estimated token flow."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative h-[480px] w-full border-t border-border bg-background">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={handleNodeClick}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.3}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ type: "tokenFlow" }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
            <Controls
              className="!border !border-border !bg-surface !shadow-lg [&>button]:!border-border [&>button]:!bg-surface [&>button]:!text-foreground [&>button:hover]:!bg-surface-raised"
              showInteractive={false}
            />
            <MiniMap
              nodeColor={nodeColor}
              maskColor="rgba(10,13,18,0.75)"
              className="!border !border-border !bg-surface"
              pannable
              zoomable
            />
          </ReactFlow>

          <AgentDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        </div>
      </CardContent>
    </Card>
  );
}
