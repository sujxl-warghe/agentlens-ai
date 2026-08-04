"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { motion } from "framer-motion";
import { Zap, MessageSquareText, Coins, Sparkles, User, Cpu } from "lucide-react";
import type { GraphNodeData } from "@/types/scan";

const HEALTH_COLOR: Record<string, string> = {
  healthy: "var(--teal)",
  warning: "var(--amber)",
  critical: "var(--red)",
};

const LANE_ICON: Record<string, typeof User> = {
  entry: User,
  sink: Cpu,
};

function AgentNodeImpl({ data, selected }: NodeProps<GraphNodeData>) {
  const color = HEALTH_COLOR[data.health] ?? "var(--subtle-foreground)";
  const isTerminal = data.lane === "entry" || data.lane === "sink";
  const Icon = LANE_ICON[data.lane];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="relative w-[210px] cursor-pointer rounded-xl border bg-surface text-left shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-shadow duration-200"
      style={{
        borderColor: selected ? "var(--primary)" : "var(--border)",
        boxShadow: selected
          ? "0 0 0 1px var(--primary), 0 8px 28px -10px rgba(108,142,245,0.55)"
          : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} className="!border-0 !bg-border-strong" />
      <Handle type="source" position={Position.Right} className="!border-0 !bg-border-strong" />
      <Handle type="target" position={Position.Top} id="top" className="!border-0 !bg-border-strong" />

      {/* Health pulse dot */}
      {!isTerminal && (
        <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ backgroundColor: color }}
          />
          <span
            className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-surface"
            style={{ backgroundColor: color }}
          />
        </span>
      )}

      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="mono-tag truncate text-[10px] text-subtle-foreground">{data.agent_type}</span>
        {Icon ? (
          <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
        ) : (
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        )}
      </div>

      <div className="px-3 py-2.5">
        <p className="truncate font-display text-sm font-semibold text-foreground">{data.label}</p>
        {data.is_inferred && (
          <span className="mono-tag mt-1 inline-block text-[9px] text-amber">INFERRED</span>
        )}
      </div>

      {!isTerminal && (
        <div className="grid grid-cols-3 gap-1 border-t border-border px-3 py-2">
          <Stat icon={Coins} value={data.estimated_tokens} />
          <Stat icon={MessageSquareText} value={data.prompt_count} />
          <Stat icon={Zap} value={data.llm_call_count} />
        </div>
      )}

      {data.expected_savings_tokens > 0 && (
        <div className="flex items-center gap-1 border-t border-teal/20 bg-teal-muted px-3 py-1.5">
          <Sparkles className="h-3 w-3 text-teal" />
          <span className="mono-tag text-[10px] text-teal">-{data.expected_savings_tokens} tok possible</span>
        </div>
      )}
    </motion.div>
  );
}

function Stat({ icon: Icon, value }: { icon: typeof Coins; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-md bg-surface-raised py-1">
      <Icon className="h-3 w-3 text-subtle-foreground" />
      <span className="mono-tag text-[10px] text-foreground">{value}</span>
    </div>
  );
}

export const AgentNode = memo(AgentNodeImpl);
