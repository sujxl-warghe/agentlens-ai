"use client";

import { Check, GitBranch, FolderTree, Search, Bot, Stethoscope, FlaskConical, Network, FileBarChart, Star, Clock } from "lucide-react";
import { VitalsStrip } from "@/components/marketing/vitals-strip";
import type { RepoMetadata, ScanStatus } from "@/types/scan";

interface Stage {
  label: string;
  icon: typeof GitBranch;
  match: string; // the exact status_message the backend sends when this stage starts
}

// Ordered to match scan_orchestrator.py exactly — this list is a direct
// mirror of the real backend phases, not an invented set of steps.
const STAGES: Stage[] = [
  { label: "Repository Cloned", icon: GitBranch, match: "Acquiring repository source..." },
  { label: "Structure Analyzed", icon: FolderTree, match: "Analyzing repository structure..." },
  { label: "Framework Detected", icon: Search, match: "Detecting agent framework..." },
  { label: "Agents Found", icon: Bot, match: "Searching for agents, prompts, and tools..." },
  { label: "AI Diagnosis", icon: Stethoscope, match: "Running AI Doctor diagnosis..." },
  { label: "Paritok Optimization", icon: FlaskConical, match: "Optimizing prompts with Paritok..." },
  { label: "Architecture Mapped", icon: Network, match: "Building architecture graph..." },
  { label: "Benchmark Complete", icon: FileBarChart, match: "Running before/after benchmark..." },
];

function formatSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatRelativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function RepoMetadataCard({ metadata }: { metadata: RepoMetadata }) {
  return (
    <div className="mb-6 rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <span className="mono-tag text-sm text-foreground">{metadata.full_name}</span>
        {metadata.stargazers_count > 0 && (
          <span className="mono-tag flex items-center gap-1 text-xs text-amber">
            <Star className="h-3 w-3 fill-amber" /> {metadata.stargazers_count.toLocaleString()}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {metadata.default_branch && <span>branch: {metadata.default_branch}</span>}
        {metadata.language && <span>{metadata.language}</span>}
        <span>{formatSize(metadata.size_kb)}</span>
        {metadata.pushed_at && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> pushed {formatRelativeDate(metadata.pushed_at)}
          </span>
        )}
      </div>
    </div>
  );
}

export function ScanProgress({
  status,
  message,
  repoMetadata,
}: {
  status: ScanStatus;
  message: string | null;
  repoMetadata?: RepoMetadata | null;
}) {
  const currentIdx = message ? STAGES.findIndex((s) => s.match === message) : -1;
  const isComplete = status === "complete";

  return (
    <div className="mx-auto max-w-md">
      <VitalsStrip color="amber" height={48} className="mb-6 opacity-70" />
      <p className="text-center font-display text-xl font-semibold">Running diagnosis...</p>
      <p className="mono-tag mt-2 text-center text-sm text-muted-foreground">{message ?? "Working..."}</p>

      {repoMetadata && (
        <div className="mt-6">
          <RepoMetadataCard metadata={repoMetadata} />
        </div>
      )}

      <div className="mt-8 flex flex-col gap-1 rounded-xl border border-border bg-surface p-2">
        {STAGES.map((stage, i) => {
          const isDone = isComplete || (currentIdx !== -1 && i < currentIdx);
          const isActive = !isComplete && i === currentIdx;

          return (
            <div
              key={stage.label}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-300 ${
                isActive ? "bg-primary-muted" : ""
              }`}
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                  isDone
                    ? "border-teal/40 bg-teal-muted text-teal"
                    : isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border-strong bg-surface-raised text-subtle-foreground"
                }`}
              >
                {isDone ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <stage.icon className={`h-3 w-3 ${isActive ? "animate-pulse" : ""}`} />
                )}
              </div>
              <span
                className={`text-sm transition-colors duration-300 ${
                  isDone ? "text-foreground" : isActive ? "font-medium text-foreground" : "text-subtle-foreground"
                }`}
              >
                {stage.label}
              </span>
              {isActive && (
                <span className="mono-tag ml-auto flex gap-0.5 text-primary">
                  <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-primary" />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
