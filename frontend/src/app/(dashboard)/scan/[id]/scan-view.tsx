"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Download, GitBranch, GitPullRequest, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useScanPolling } from "@/hooks/use-scan-polling";
import { ScanProgress } from "@/components/dashboard/scan-progress";
import { ScanCompleteBanner } from "@/components/dashboard/scan-complete-banner";
import { HealthScore } from "@/components/dashboard/health-score";
import { IssuesList } from "@/components/dashboard/issues-list";
import { TokenDashboard } from "@/components/dashboard/token-dashboard";
import { AgentSummary } from "@/components/dashboard/agent-summary";
import { ArchitectureGraph } from "@/components/dashboard/architecture-graph";
import { ParitokPanel } from "@/components/dashboard/paritok-panel";
import { BenchmarkPanel } from "@/components/dashboard/benchmark-panel";
import { downloadReport } from "@/lib/report";
import type { ScanResponse } from "@/types/scan";

function ScanViewSkeleton({ attempt }: { attempt: number }) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        <p className="mono-tag text-xs text-muted-foreground">
          Connecting to AgentLens backend{attempt > 1 ? ` — attempt ${attempt}` : "..."}
        </p>
      </div>
      <div className="mb-8 flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <div className="flex flex-col gap-6">
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function ScanView({ scanId }: { scanId: string }) {
  const [retryKey, setRetryKey] = useState(0);
  const { scan, error, attempt, isDone } = useScanPolling(scanId, retryKey);

  if (!scan && !error) {
    return <ScanViewSkeleton attempt={attempt} />;
  }

  if (!scan) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red" />
        <p className="mt-4 text-sm text-foreground">Can&apos;t reach the AgentLens backend.</p>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <p className="mono-tag mt-4 text-[11px] text-subtle-foreground">
          STILL RETRYING IN THE BACKGROUND · ATTEMPT {attempt}
        </p>
        <p className="mt-4 text-xs text-subtle-foreground">
          Check that <code className="mono-tag text-primary">uvicorn</code> is running on
          port 8000 and that <code className="mono-tag text-primary">NEXT_PUBLIC_API_URL</code> in
          your <code className="mono-tag text-primary">.env.local</code> points to it.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setRetryKey((k) => k + 1)}>
            <RefreshCw className="h-4 w-4" />
            Retry now
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const isFailed = scan.status === "failed";

  return (
    <ScanViewBody scan={scan} isFailed={isFailed} isDone={isDone} />
  );
}

function ScanViewBody({
  scan,
  isFailed,
  isDone,
}: {
  scan: ScanResponse;
  isFailed: boolean;
  isDone: boolean;
}) {
  const [showCompleteBanner, setShowCompleteBanner] = useState(false);
  const hasShownBanner = useRef(false);

  useEffect(() => {
    if (scan.status === "complete" && !hasShownBanner.current) {
      hasShownBanner.current = true;
      setShowCompleteBanner(true);
      const timer = setTimeout(() => setShowCompleteBanner(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [scan.status]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-subtle-foreground" />
            <span className="mono-tag text-sm text-foreground">{scan.source_ref}</span>
          </div>
          <Badge variant={scan.status === "complete" ? "teal" : isFailed ? "red" : "amber"}>
            {scan.status}
          </Badge>
        </div>

        {scan.status === "complete" && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadReport(scan)}>
              <Download className="h-4 w-4" />
              Export report
            </Button>
            {scan.optimization_result && scan.optimization_result.items.length > 0 && (
              <Button asChild size="sm">
                <Link href={`/scan/${scan.id}/optimize`}>
                  <GitPullRequest className="h-4 w-4" />
                  Optimize &amp; Create PR
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {scan.doctor_result && (
        <ScanCompleteBanner doctor={scan.doctor_result} show={showCompleteBanner} />
      )}

      {isFailed && (
        <div className="mx-auto max-w-lg rounded-xl border border-red/30 bg-red-muted p-6 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-red" />
          <p className="mt-3 text-sm text-foreground">{scan.error_message}</p>
          <Button asChild size="sm" className="mt-5">
            <Link href="/dashboard">Try another repository</Link>
          </Button>
        </div>
      )}

      {!isDone && !isFailed && (
        <ScanProgress status={scan.status} message={scan.status_message} repoMetadata={scan.repo_metadata} />
      )}

      {!isFailed && (
        <div className="flex flex-col gap-6">
          {scan.doctor_result && (
            <div className="hero-fade-up">
              <HealthScore doctor={scan.doctor_result} />
            </div>
          )}
          {scan.agent_result && scan.framework_result && (
            <div className="hero-fade-up">
              <AgentSummary agent={scan.agent_result} framework={scan.framework_result} />
            </div>
          )}
          {scan.graph_result && (
            <div className="hero-fade-up">
              <ArchitectureGraph graph={scan.graph_result} />
            </div>
          )}
          {scan.doctor_result && (
            <div className="hero-fade-up">
              <IssuesList issues={scan.doctor_result.issues} />
            </div>
          )}
          {scan.structure_result && scan.doctor_result && (
            <div className="hero-fade-up">
              <TokenDashboard structure={scan.structure_result} doctor={scan.doctor_result} />
            </div>
          )}
          {scan.benchmark_result && (
            <div className="hero-fade-up">
              <BenchmarkPanel benchmark={scan.benchmark_result} />
            </div>
          )}
          {scan.optimization_result && (
            <div className="hero-fade-up">
              <ParitokPanel optimization={scan.optimization_result} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
