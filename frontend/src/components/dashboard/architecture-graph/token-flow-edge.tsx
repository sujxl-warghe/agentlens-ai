"use client";

import { getBezierPath, type EdgeProps } from "reactflow";

function clampWidth(flow: number): number {
  return Math.min(8, Math.max(1.5, 1.5 + flow / 250));
}

export function TokenFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<{ estimated_token_flow: number; label?: string | null }>) {
  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  });

  const flow = data?.estimated_token_flow ?? 40;
  const strokeWidth = clampWidth(flow);
  const pathId = `edge-path-${id}`;
  const duration = Math.max(1.4, 3 - flow / 400);

  return (
    <>
      <path id={pathId} d={edgePath} fill="none" stroke="var(--border-strong)" strokeWidth={strokeWidth} markerEnd={markerEnd} />
      <path
        d={edgePath}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={strokeWidth}
        strokeOpacity={0.35}
        strokeDasharray="6 5"
        style={{ animation: "dash-flow 1.2s linear infinite" }}
      />
      <circle r={Math.min(4.5, 2 + strokeWidth / 3)} fill="var(--teal)">
        <animateMotion dur={`${duration}s`} repeatCount="indefinite">
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </circle>

      {data?.label && (
        <text>
          <textPath
            href={`#${pathId}`}
            startOffset="50%"
            textAnchor="middle"
            className="mono-tag"
            style={{ fontSize: 9, fill: "var(--subtle-foreground)" }}
          >
            {data.label}
          </textPath>
        </text>
      )}
    </>
  );
}
