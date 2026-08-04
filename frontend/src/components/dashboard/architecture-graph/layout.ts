import type { GraphNodeData } from "@/types/scan";

const X_SPACING = 260;
const LANE_Y: Record<string, number> = {
  entry: 140,
  main: 140,
  sink: 140,
};
const SUPPORT_Y_OFFSET = 200;

export interface LaidOutNode extends GraphNodeData {
  x: number;
  y: number;
}

/**
 * Deliberately simple layered layout, not a generic force-directed graph:
 * entry/main/sink nodes sit on one horizontal spine in pipeline order,
 * support nodes (Memory/RAG) hang below the main node they're attached to.
 * This mirrors how the data was modeled server-side (lane + order +
 * attached_to), so layout and data stay in lockstep.
 */
export function layoutGraph(nodes: GraphNodeData[]): LaidOutNode[] {
  const mainNodes = nodes.filter((n) => n.lane === "main").sort((a, b) => a.order - b.order);
  const entry = nodes.find((n) => n.lane === "entry");
  const sink = nodes.find((n) => n.lane === "sink");
  const supportNodes = nodes.filter((n) => n.lane === "support");

  const positions = new Map<string, { x: number; y: number }>();

  let cursor = 0;
  if (entry) {
    positions.set(entry.id, { x: cursor, y: LANE_Y.entry });
    cursor += X_SPACING;
  }
  for (const node of mainNodes) {
    positions.set(node.id, { x: cursor, y: LANE_Y.main });
    cursor += X_SPACING;
  }
  if (sink) {
    positions.set(sink.id, { x: cursor, y: LANE_Y.sink });
  }

  // Group support nodes by their attachment point so multiple support
  // nodes on the same main node fan out side by side instead of stacking.
  const byAttachment = new Map<string, GraphNodeData[]>();
  for (const node of supportNodes) {
    const key = node.attached_to ?? "unattached";
    byAttachment.set(key, [...(byAttachment.get(key) ?? []), node]);
  }

  for (const [attachedTo, group] of byAttachment) {
    const anchor = positions.get(attachedTo);
    const baseX = anchor?.x ?? cursor;
    const groupWidth = (group.length - 1) * (X_SPACING * 0.7);
    group.forEach((node, i) => {
      positions.set(node.id, {
        x: baseX - groupWidth / 2 + i * (X_SPACING * 0.7),
        y: LANE_Y.main + SUPPORT_Y_OFFSET,
      });
    });
  }

  return nodes.map((node) => ({
    ...node,
    ...(positions.get(node.id) ?? { x: 0, y: 0 }),
  }));
}
