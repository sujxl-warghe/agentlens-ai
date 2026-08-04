"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import type { StructureResult, DoctorResult } from "@/types/scan";

const LANGUAGE_COLORS = ["#6c8ef5", "#5eead4", "#ffb454", "#f87171", "#a78bfa", "#38bdf8"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function StatBlock({
  label,
  value,
  formatter,
  suffix,
  accent,
}: {
  label: string;
  value: number;
  formatter?: (v: number) => string;
  suffix?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-raised px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25">
      <p className="mono-tag text-[10px] text-subtle-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold" style={accent ? { color: accent } : undefined}>
        <AnimatedNumber value={value} formatter={formatter} />
        {suffix ? <span className="ml-1 text-sm text-muted-foreground">{suffix}</span> : null}
      </p>
    </div>
  );
}

export function TokenDashboard({
  structure,
  doctor,
}: {
  structure: StructureResult;
  doctor: DoctorResult;
}) {
  const heatmapData = structure.top_files_by_size.slice(0, 8).map((f) => ({
    name: f.path.split("/").pop() ?? f.path,
    tokens: f.estimated_tokens,
    fullPath: f.path,
  }));

  const pieData = structure.languages.map((l) => ({ name: l.language, value: l.total_size_bytes }));

  return (
    <Card>
      <CardHeader>
        <span className="mono-tag text-xs text-primary">[TOKEN DASHBOARD]</span>
        <CardTitle className="mt-1">Where your tokens are going</CardTitle>
        <CardDescription>Estimated from static file size — a real tokenizer refines this per request.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBlock label="TOTAL TOKENS" value={doctor.total_estimated_tokens} />
          <StatBlock label="FILES SCANNED" value={structure.total_files} />
          <StatBlock label="REPO SIZE" value={structure.total_size_bytes} formatter={formatBytes} />
          <StatBlock
            label="EST. SAVINGS"
            value={doctor.total_estimated_savings_tokens}
            suffix="tok"
            accent="var(--teal)"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <p className="mono-tag mb-3 text-[11px] text-muted-foreground">TOKEN HEATMAP · TOP FILES</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heatmapData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category" dataKey="name" width={100}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "var(--foreground)" }}
                    formatter={(value) => [`${Number(value).toLocaleString()} tokens`, "Estimated"]}
                  />
                  <Bar dataKey="tokens" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2">
            <p className="mono-tag mb-3 text-[11px] text-muted-foreground">LANGUAGE BREAKDOWN</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={LANGUAGE_COLORS[i % LANGUAGE_COLORS.length]} stroke="var(--surface)" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(value) => formatBytes(Number(value))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {structure.languages.map((l, i) => (
                <span key={l.language} className="mono-tag flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: LANGUAGE_COLORS[i % LANGUAGE_COLORS.length] }} />
                  {l.language} {l.percentage}%
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
