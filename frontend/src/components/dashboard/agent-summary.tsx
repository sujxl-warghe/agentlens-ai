import { Bot, MessageSquareText, Zap, Database, Wrench, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import type { AgentResult, FrameworkResult } from "@/types/scan";

const STATS = [
  { key: "agent_count", label: "Agents", icon: Bot },
  { key: "prompt_count", label: "Prompts", icon: MessageSquareText },
  { key: "llm_call_count", label: "LLM Calls", icon: Zap },
  { key: "memory_component_count", label: "Memory", icon: Database },
  { key: "tool_count", label: "Tools", icon: Wrench },
  { key: "rag_pipeline_count", label: "RAG Pipelines", icon: Search },
] as const;

export function AgentSummary({
  agent,
  framework,
}: {
  agent: AgentResult;
  framework: FrameworkResult;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <span className="mono-tag text-xs text-primary">[FRAMEWORK DETECTION]</span>
            <CardTitle className="mt-1">
              {framework.primary_framework ?? "No framework detected"}
            </CardTitle>
          </div>
          {framework.matches[0] && (
            <Badge variant="teal">
              {Math.round(framework.matches[0].confidence * 100)}% CONFIDENCE
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {framework.matches[0] ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mono-tag text-[10px] text-subtle-foreground">DETECTED BECAUSE:</span>
              {framework.matches[0].detected_because.map((reason) => (
                <span
                  key={reason}
                  className="mono-tag rounded-full border border-border-strong bg-surface-raised px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {reason}
                </span>
              ))}
            </div>
          ) : (
            "None of the supported framework signatures (LangGraph, OpenAI Agents SDK) were found."
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {STATS.map((stat) => (
            <div key={stat.key} className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-2 py-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25">
              <stat.icon className="h-4 w-4 text-primary" />
              <span className="font-display text-lg font-semibold">
                <AnimatedNumber value={agent[stat.key]} duration={0.7} />
              </span>
              <span className="mono-tag text-[10px] text-subtle-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
