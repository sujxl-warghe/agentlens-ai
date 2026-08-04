"use client";

import { useState } from "react";
import { ChevronDown, FlaskConical, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OptimizationResult } from "@/types/scan";

function EngineBadge({ engine, gpuStatus }: { engine: string; gpuStatus: string }) {
  const isRealApi = engine === "paritok_api";
  return (
    <div className="flex items-center gap-2">
      <Badge variant={isRealApi ? "teal" : "primary"}>
        <Cpu className="h-3 w-3" />
        {isRealApi ? "PARITOK API" : "PARITOK ENGINE (LOCAL)"}
      </Badge>
      <span className="mono-tag text-[10px] text-subtle-foreground">GPU: {gpuStatus.toUpperCase()}</span>
    </div>
  );
}

function DiffItem({ item }: { item: OptimizationResult["items"][number] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-raised"
      >
        <div className="min-w-0">
          <p className="mono-tag truncate text-sm text-foreground">{item.variable_name}</p>
          <p className="truncate text-xs text-subtle-foreground">{item.file}</p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <span className="mono-tag text-xs text-muted-foreground">
            {item.original_tokens} <span className="text-subtle-foreground">→</span>{" "}
            <span className="text-teal">{item.compressed_tokens}</span>
          </span>
          <Badge variant="teal">-{item.compression_pct}%</Badge>
          <ChevronDown className={cn("h-4 w-4 text-subtle-foreground transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <div className="grid gap-3 px-5 pb-5 md:grid-cols-2">
          <div>
            <p className="mono-tag mb-1.5 text-[10px] text-red">ORIGINAL · {item.original_tokens} TOK</p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface-raised p-3 text-[11px] leading-relaxed text-muted-foreground">
              {item.original_text}
            </pre>
          </div>
          <div>
            <p className="mono-tag mb-1.5 text-[10px] text-teal">COMPRESSED · {item.compressed_tokens} TOK</p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-teal/20 bg-teal-muted p-3 text-[11px] leading-relaxed text-foreground">
              {item.compressed_text}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export function ParitokPanel({ optimization }: { optimization: OptimizationResult }) {
  if (optimization.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <span className="mono-tag text-xs text-primary">[PARITOK OPTIMIZATION]</span>
          <CardTitle className="mt-1">Nothing to compress</CardTitle>
          <CardDescription>
            No large triple-quoted prompt blocks were found to run through Paritok.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="mono-tag text-xs text-primary">[PARITOK OPTIMIZATION]</span>
            <CardTitle className="mt-1 flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              {optimization.overall_compression_pct}% overall compression
            </CardTitle>
          </div>
          <EngineBadge engine={optimization.engine} gpuStatus={optimization.gpu_status} />
        </div>
        <CardDescription>
          {optimization.total_original_tokens.toLocaleString()} tokens compressed to{" "}
          {optimization.total_compressed_tokens.toLocaleString()} across {optimization.items.length} prompt
          {optimization.items.length === 1 ? "" : "s"} in {optimization.processing_time_ms}ms.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {optimization.items.map((item) => (
          <DiffItem key={`${item.file}-${item.variable_name}`} item={item} />
        ))}
      </CardContent>
    </Card>
  );
}
