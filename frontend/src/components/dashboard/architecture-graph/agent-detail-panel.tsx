"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  X, FileCode2, MessageSquareText, Database, Search, Coins, Sparkles, Zap, Stethoscope,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import type { GraphNodeData } from "@/types/scan";

const HEALTH_BADGE: Record<string, { variant: "teal" | "amber" | "red"; label: string }> = {
  healthy: { variant: "teal", label: "HEALTHY" },
  warning: { variant: "amber", label: "WARNING" },
  critical: { variant: "red", label: "CRITICAL" },
};

const ISSUE_BADGE: Record<string, "red" | "amber" | "default"> = {
  critical: "red",
  warning: "amber",
  info: "default",
};

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof FileCode2;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <p className="mono-tag text-[10px] text-muted-foreground">{title}</p>
      </div>
      {children}
    </div>
  );
}

export function AgentDetailPanel({
  node,
  onClose,
}: {
  node: GraphNodeData | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {node && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            key="panel"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute right-0 top-0 z-20 flex h-full w-[340px] flex-col overflow-y-auto border-l border-border bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="mono-tag text-xs text-primary">[AGENT DETAIL]</span>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-subtle-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-5 p-4">
              <Section icon={FileCode2} title="AGENT SUMMARY">
                <div className="flex items-center justify-between">
                  <p className="font-display text-base font-semibold text-foreground">{node.label}</p>
                  <Badge variant={HEALTH_BADGE[node.health]?.variant ?? "default"}>
                    {HEALTH_BADGE[node.health]?.label ?? node.health.toUpperCase()}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{node.agent_type}</p>
                {node.file && <p className="mono-tag mt-1 text-[11px] text-subtle-foreground">{node.file}</p>}
                {node.is_inferred && (
                  <p className="mt-2 rounded-md border border-amber/30 bg-amber-muted px-2.5 py-1.5 text-[11px] text-amber">
                    This node is inferred — no matching code was found for it directly.
                  </p>
                )}
              </Section>

              <Section icon={Coins} title="ESTIMATED TOKEN COST">
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="TOKENS" value={node.estimated_tokens} />
                  <MiniStat label="PROMPTS" value={node.prompt_count} />
                  <MiniStat label="LLM CALLS" value={node.llm_call_count} />
                </div>
              </Section>

              <Section icon={MessageSquareText} title="PROMPT INFORMATION">
                <p className="text-sm text-muted-foreground">
                  {node.prompt_count > 0
                    ? `${node.prompt_count} prompt block${node.prompt_count === 1 ? "" : "s"} detected in this file.`
                    : "No prompt blocks detected in this file."}
                </p>
              </Section>

              <Section icon={Database} title="MEMORY USAGE">
                {node.memory_usage ? (
                  <div className="rounded-md border border-border bg-surface-raised px-2.5 py-2">
                    <p className="mono-tag text-[11px] text-foreground">{node.memory_detail}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No memory component detected.</p>
                )}
              </Section>

              <Section icon={Search} title="RAG USAGE">
                {node.rag_usage ? (
                  <div className="rounded-md border border-border bg-surface-raised px-2.5 py-2">
                    <p className="mono-tag text-[11px] text-foreground">{node.rag_detail}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No RAG pipeline detected.</p>
                )}
              </Section>

              {node.issues.length > 0 && (
                <Section icon={Stethoscope} title="DIAGNOSIS">
                  <div className="flex flex-col gap-2">
                    {node.issues.map((issue) => (
                      <div key={issue.title} className="rounded-md border border-border bg-surface-raised p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={ISSUE_BADGE[issue.severity]}>{issue.severity.toUpperCase()}</Badge>
                            <p className="truncate text-xs font-medium text-foreground">{issue.title}</p>
                          </div>
                          <span className="mono-tag shrink-0 text-[10px] text-subtle-foreground">
                            {Math.round(issue.confidence * 100)}% conf.
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground">{issue.explanation}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              <Section icon={Zap} title="OPTIMIZATION SUGGESTIONS">
                {node.suggested_optimizations.length > 0 ? (
                  <ul className="flex flex-col gap-1.5">
                    {node.suggested_optimizations.map((s) => (
                      <li
                        key={s}
                        className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary-muted px-2.5 py-2 text-xs text-foreground"
                      >
                        <span className="mt-0.5 text-primary">→</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nothing to optimize here — clean.</p>
                )}
              </Section>

              <div className="flex items-center justify-between rounded-lg border border-teal/25 bg-teal-muted px-3 py-3">
                <div className="flex items-center gap-2 text-teal">
                  <Sparkles className="h-4 w-4" />
                  <span className="mono-tag text-[11px]">EXPECTED SAVINGS W/ PARITOK</span>
                </div>
                <span className="font-display text-lg font-semibold text-teal">
                  <AnimatedNumber value={node.expected_savings_tokens} duration={0.6} /> tok
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-md border border-border bg-surface-raised py-2">
      <span className="font-display text-sm font-semibold text-foreground">
        <AnimatedNumber value={value} duration={0.5} />
      </span>
      <span className="mono-tag text-[9px] text-subtle-foreground">{label}</span>
    </div>
  );
}
