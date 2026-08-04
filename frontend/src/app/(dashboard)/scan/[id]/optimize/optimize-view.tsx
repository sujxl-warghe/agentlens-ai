"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowLeft, Check, ChevronDown, GitPullRequest, AlertTriangle,
  ExternalLink, Copy, Loader2, ShieldAlert, TrendingDown, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { DiffViewer } from "@/components/dashboard/diff-viewer";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ScanResponse, PullRequestResponse } from "@/types/scan";

type PrFlowState = "idle" | "confirming" | "creating" | "success" | "error";

export function OptimizeView({ scanId }: { scanId: string }) {
  const { data: session } = useSession();
  const [scan, setScan] = useState<ScanResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [flowState, setFlowState] = useState<PrFlowState>("idle");
  const [prResult, setPrResult] = useState<PullRequestResponse | null>(null);
  const [prError, setPrError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getScan(scanId)
      .then((s) => {
        setScan(s);
        const items = s.optimization_result?.items ?? [];
        setAccepted(new Set(items.map((_, i) => i)));
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Failed to load scan."));
  }, [scanId]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red" />
        <p className="mt-4 text-sm text-muted-foreground">{loadError}</p>
        <Button asChild variant="outline" size="sm" className="mt-6">
          <Link href={`/scan/${scanId}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to scan
          </Link>
        </Button>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Skeleton className="mb-6 h-9 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const items = scan.optimization_result?.items ?? [];
  const isGithubRepo = scan.source_type === "github_url";
  const isGithubUser = session?.user?.role === "github";
  const hasToken = Boolean(session?.githubAccessToken);
  const canCreatePr = isGithubRepo && isGithubUser && hasToken && accepted.size > 0;

  const nonFixableIssues = (scan.doctor_result?.issues ?? []).filter(
    (issue) => !items.some((item) => item.file === issue.file),
  );

  const acceptedSavings = items
    .filter((_, i) => accepted.has(i))
    .reduce((sum, item) => sum + (item.original_tokens - item.compressed_tokens), 0);

  function toggleAccepted(i: number) {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  }

  function toggleExpanded(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  }

  async function handleCreatePr() {
    if (!session?.githubAccessToken) return;
    setFlowState("creating");
    setPrError(null);
    try {
      const result = await api.createPullRequest(scanId, Array.from(accepted), session.githubAccessToken);
      setPrResult(result);
      setFlowState("success");
    } catch (err) {
      setPrError(err instanceof ApiError ? err.message : "Failed to create pull request.");
      setFlowState("error");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/scan/${scanId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <span className="mono-tag text-xs text-primary">[OPTIMIZATION PLAN]</span>
          <h1 className="font-display text-xl font-semibold">{scan.source_ref}</h1>
        </div>
      </div>

      {flowState === "success" && prResult ? (
        <PrSuccessCard result={prResult} />
      ) : (
        <>
          <EligibilityBanner
            isGithubRepo={isGithubRepo}
            isGithubUser={isGithubUser}
            hasToken={hasToken}
          />

          {scan.benchmark_result && scan.doctor_result && (
            <ImpactCards benchmark={scan.benchmark_result} doctor={scan.doctor_result} />
          )}

          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Optimizations ({items.length})</CardTitle>
                  <CardDescription>
                    Each accepted item replaces the exact prompt text below with Paritok&apos;s
                    compressed version — nothing else in the file changes.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAccepted(new Set(items.map((_, i) => i)))}>
                    Accept All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setAccepted(new Set())}>
                    Reject All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground">No Paritok-compressible prompts were found in this repository.</p>
              )}
              {items.map((item, i) => {
                const isAccepted = accepted.has(i);
                const isExpanded = expanded.has(i);
                const savings = item.original_tokens - item.compressed_tokens;

                return (
                  <div
                    key={`${item.file}-${item.variable_name}`}
                    className={cn(
                      "rounded-lg border transition-colors",
                      isAccepted ? "border-teal/30 bg-teal-muted" : "border-border bg-surface-raised opacity-60",
                    )}
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button
                        onClick={() => toggleAccepted(i)}
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                          isAccepted ? "border-teal bg-teal text-background" : "border-border-strong",
                        )}
                        aria-label={isAccepted ? "Reject" : "Accept"}
                      >
                        {isAccepted ? <Check className="h-3.5 w-3.5" /> : null}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className="mono-tag truncate text-sm text-foreground">{item.variable_name}</p>
                        <p className="truncate text-xs text-subtle-foreground">{item.file}</p>
                      </div>

                      <Badge variant="teal">-{item.compression_pct}%</Badge>
                      <span className="mono-tag hidden text-xs text-muted-foreground sm:inline">
                        -{savings} tok
                      </span>

                      <button
                        onClick={() => toggleExpanded(i)}
                        className="rounded-md p-1 text-subtle-foreground hover:bg-surface-raised hover:text-foreground"
                      >
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <DiffViewer before={item.original_text} after={item.compressed_text} />
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {nonFixableIssues.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Flagged for manual review ({nonFixableIssues.length})</CardTitle>
                <CardDescription>
                  These issues need a human decision (e.g. restructuring memory or RAG logic) — AgentLens
                  doesn&apos;t auto-generate a fix for them in this version.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {nonFixableIssues.map((issue) => (
                  <div key={issue.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-raised px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">{issue.title}</p>
                      <p className="mono-tag truncate text-[11px] text-subtle-foreground">{issue.file}</p>
                    </div>
                    <Badge variant={issue.severity === "critical" ? "red" : issue.severity === "warning" ? "amber" : "default"}>
                      {issue.severity.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="mono-tag text-xs text-muted-foreground">SELECTED SAVINGS</p>
              <p className="font-display text-xl font-semibold text-teal">
                <AnimatedNumber value={acceptedSavings} /> tokens
              </p>
            </div>
            <Button size="lg" disabled={!canCreatePr} onClick={() => setFlowState("confirming")}>
              <GitPullRequest className="h-4 w-4" />
              Create Pull Request
            </Button>
          </div>

          {flowState === "confirming" && (
            <ConfirmDialog
              itemCount={accepted.size}
              onCancel={() => setFlowState("idle")}
              onConfirm={handleCreatePr}
            />
          )}
          {flowState === "creating" && <CreatingOverlay />}
          {flowState === "error" && prError && (
            <div className="mt-4 rounded-lg border border-red/30 bg-red-muted p-4">
              <p className="text-sm text-red">{prError}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setFlowState("idle")}>
                Try again
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EligibilityBanner({
  isGithubRepo,
  isGithubUser,
  hasToken,
}: {
  isGithubRepo: boolean;
  isGithubUser: boolean;
  hasToken: boolean;
}) {
  if (isGithubRepo && isGithubUser && hasToken) return null;

  let reason = "Pull requests aren't available for this scan.";
  if (!isGithubRepo) {
    reason = "This scan is from a demo or ZIP upload — there's no real GitHub repository to open a pull request against. Analyze a real GitHub repo to unlock this.";
  } else if (!isGithubUser) {
    reason = "Sign in with GitHub (not guest mode) to create a pull request.";
  } else if (!hasToken) {
    reason = "Your GitHub session doesn't have a write token yet — sign out and back in with GitHub to grant repo access.";
  }

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber/30 bg-amber-muted p-4">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
      <p className="text-sm text-foreground">{reason} You can still review the optimization plan and diffs below.</p>
    </div>
  );
}

function ImpactCards({
  benchmark,
  doctor,
}: {
  benchmark: NonNullable<ScanResponse["benchmark_result"]>;
  doctor: NonNullable<ScanResponse["doctor_result"]>;
}) {
  return (
    <Card>
      <CardHeader>
        <span className="mono-tag text-xs text-primary">[REPOSITORY IMPACT]</span>
        <CardTitle className="mt-1">Before → After</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ImpactStat label="TOKENS" before={benchmark.pipeline_a.total_tokens} after={benchmark.pipeline_b.total_tokens} />
        <ImpactStat
          label="COST/SESSION"
          before={benchmark.pipeline_a.estimated_cost_usd}
          after={benchmark.pipeline_b.estimated_cost_usd}
          formatter={(v) => `$${v.toFixed(3)}`}
        />
        <ImpactStat label="LATENCY (MS)" before={benchmark.pipeline_a.estimated_latency_ms} after={benchmark.pipeline_b.estimated_latency_ms} />
        <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-teal/25 bg-teal-muted px-3 py-3 text-center">
          <Sparkles className="h-4 w-4 text-teal" />
          <span className="font-display text-lg font-semibold text-teal">{doctor.health_score}/100</span>
          <span className="mono-tag text-[10px] text-muted-foreground">HEALTH SCORE</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ImpactStat({
  label,
  before,
  after,
  formatter = (v: number) => v.toLocaleString(),
}: {
  label: string;
  before: number;
  after: number;
  formatter?: (v: number) => string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-surface-raised px-3 py-3 text-center">
      <span className="mono-tag text-[10px] text-subtle-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-red line-through">{formatter(before)}</span>
        <TrendingDown className="h-3 w-3 text-teal" />
        <span className="font-display text-sm font-semibold text-teal">{formatter(after)}</span>
      </div>
    </div>
  );
}

function ConfirmDialog({
  itemCount,
  onCancel,
  onConfirm,
}: {
  itemCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl"
      >
        <GitPullRequest className="h-6 w-6 text-primary" />
        <h3 className="mt-3 font-display text-lg font-semibold">Create this pull request?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          AgentLens will create a new branch, commit {itemCount} real change{itemCount === 1 ? "" : "s"} to
          your repository, and open a pull request against the default branch. Nothing merges automatically —
          you review and merge it yourself on GitHub.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm}>
            <Check className="h-4 w-4" />
            Yes, create the PR
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreatingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-8 text-center shadow-2xl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div>
          <p className="font-display text-base font-semibold">Creating your pull request...</p>
          <p className="mono-tag mt-1 text-xs text-muted-foreground">
            Branching, committing, and opening the PR on GitHub
          </p>
        </div>
      </div>
    </div>
  );
}

function PrSuccessCard({ result }: { result: PullRequestResponse }) {
  const [copied, setCopied] = useState(false);

  return (
    <Card className="border-teal/30 bg-teal-muted">
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal/20 text-teal">
          <GitPullRequest className="h-7 w-7" />
        </div>
        <div>
          <p className="font-display text-xl font-semibold text-foreground">Pull Request Created</p>
          <p className="mono-tag mt-1 text-sm text-muted-foreground">
            #{result.pr_number} · {result.branch}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
          <span>{result.files_changed.length} file{result.files_changed.length === 1 ? "" : "s"} changed</span>
          {result.skipped_files.length > 0 && (
            <span className="text-amber">· {result.skipped_files.length} skipped (changed on GitHub)</span>
          )}
        </div>

        <div className="flex gap-2">
          <Button asChild>
            <a href={result.pr_url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open Pull Request
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(result.pr_url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            <Copy className="h-4 w-4" />
            {copied ? "Copied!" : "Copy URL"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
