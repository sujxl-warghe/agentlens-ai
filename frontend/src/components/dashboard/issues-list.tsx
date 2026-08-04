"use client";

import { useState } from "react";
import { ChevronDown, FileCode2, Stethoscope, Pill, TrendingDown, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { cn } from "@/lib/utils";
import type { Issue, IssueSeverity } from "@/types/scan";

const SEVERITY_STYLE: Record<IssueSeverity, { variant: "red" | "amber" | "default"; label: string; barColor: string }> = {
  critical: { variant: "red", label: "CRITICAL", barColor: "var(--red)" },
  warning: { variant: "amber", label: "WARNING", barColor: "var(--amber)" },
  info: { variant: "default", label: "INFO", barColor: "var(--subtle-foreground)" },
};

function DiagnosisRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Stethoscope;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-subtle-foreground" />
      <div className="min-w-0 flex-1">
        <p className="mono-tag text-[10px] text-subtle-foreground">{label}</p>
        <div className="mt-0.5 text-sm text-foreground">{children}</div>
      </div>
    </div>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const [open, setOpen] = useState(false);
  const style = SEVERITY_STYLE[issue.severity];

  return (
    <div className="border-b border-border last:border-b-0" style={{ borderLeft: `3px solid ${style.barColor}` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-raised"
      >
        <div className="flex min-w-0 items-center gap-3">
          <Badge variant={style.variant}>{style.label}</Badge>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{issue.title}</p>
            <p className="mono-tag flex items-center gap-1 truncate text-[11px] text-subtle-foreground">
              <FileCode2 className="h-3 w-3 shrink-0" />
              {issue.file}
              {issue.line ? `:${issue.line}` : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="mono-tag flex items-center gap-1 text-xs text-teal">
            <TrendingDown className="h-3 w-3" />-
            <AnimatedNumber value={issue.expected_token_savings} duration={0.5} /> tok
          </span>
          <ChevronDown className={cn("h-4 w-4 text-subtle-foreground transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <div className="flex flex-col gap-4 px-5 pb-5 pl-8">
          <DiagnosisRow icon={Stethoscope} label="DIAGNOSIS">
            <p className="text-muted-foreground">{issue.explanation}</p>
          </DiagnosisRow>
          <DiagnosisRow icon={Pill} label="TREATMENT">
            <div className="rounded-md border border-primary/20 bg-primary-muted px-3 py-2 text-foreground">
              {issue.suggested_fix}
            </div>
          </DiagnosisRow>
          <DiagnosisRow icon={Gauge} label="DETECTION CONFIDENCE">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-raised">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round(issue.confidence * 100)}%` }}
                />
              </div>
              <span className="mono-tag text-xs text-muted-foreground">
                {Math.round(issue.confidence * 100)}%
              </span>
            </div>
          </DiagnosisRow>
        </div>
      )}
    </div>
  );
}

export function IssuesList({ issues }: { issues: Issue[] }) {
  if (issues.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-muted text-teal">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-base font-semibold">Clean bill of health</p>
            <p className="mt-1 text-sm text-muted-foreground">
              No inefficiencies detected in the scanned files.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <span className="mono-tag text-xs text-primary">[AI DOCTOR REPORT]</span>
        <CardTitle className="mt-1">{issues.length} inefficiencies found</CardTitle>
        <CardDescription>Ranked by severity. Click any diagnosis to expand it.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {issues.map((issue) => (
          <IssueRow key={issue.id} issue={issue} />
        ))}
      </CardContent>
    </Card>
  );
}
