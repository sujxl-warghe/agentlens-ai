"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingDown, FileBarChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import type { BenchmarkResult } from "@/types/scan";

function ReductionStat({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-teal/20 bg-teal-muted px-4 py-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-teal/40">
      <div className="flex items-center gap-1 text-teal">
        <TrendingDown className="h-4 w-4" />
        <span className="font-display text-2xl font-semibold">
          <AnimatedNumber value={pct} formatter={(v) => v.toFixed(1)} />%
        </span>
      </div>
      <span className="mono-tag text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

export function BenchmarkPanel({ benchmark }: { benchmark: BenchmarkResult }) {
  const chartData = [
    { metric: "Tokens", Original: benchmark.pipeline_a.total_tokens, Optimized: benchmark.pipeline_b.total_tokens },
  ];
  const costData = [
    { metric: "Cost (USD)", Original: benchmark.pipeline_a.estimated_cost_usd, Optimized: benchmark.pipeline_b.estimated_cost_usd },
  ];
  const latencyData = [
    { metric: "Latency (ms)", Original: benchmark.pipeline_a.estimated_latency_ms, Optimized: benchmark.pipeline_b.estimated_latency_ms },
  ];

  return (
    <Card>
      <CardHeader>
        <span className="mono-tag text-xs text-primary">[BEFORE / AFTER BENCHMARK]</span>
        <CardTitle className="mt-1 flex items-center gap-2">
          <FileBarChart className="h-4 w-4 text-primary" />
          Pipeline A vs. Pipeline B
        </CardTitle>
        <CardDescription>
          Projected over a {benchmark.estimated_calls_per_session}-call session, using the prompts detected in this repo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid grid-cols-3 gap-3">
          <ReductionStat label="TOKEN REDUCTION" pct={benchmark.token_reduction_pct} />
          <ReductionStat label="COST REDUCTION" pct={benchmark.cost_reduction_pct} />
          <ReductionStat label="LATENCY REDUCTION" pct={benchmark.latency_reduction_pct} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { data: chartData, formatter: (v: number) => v.toLocaleString() },
            { data: costData, formatter: (v: number) => `$${v.toFixed(3)}` },
            { data: latencyData, formatter: (v: number) => `${v}ms` },
          ].map((chart, i) => (
            <div key={i} className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart.data} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="metric" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(value) => chart.formatter(Number(value))}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Original" fill="var(--red)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Optimized" fill="var(--teal)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <Badge variant="teal">
            ${benchmark.pipeline_a.estimated_cost_usd.toFixed(3)} → ${benchmark.pipeline_b.estimated_cost_usd.toFixed(3)}/session
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
