import { Card, CardContent } from "@/components/ui/card";
import { HEALTH_SUBSCORES } from "@/lib/constants";
import type { DoctorResult } from "@/types/scan";

function scoreColor(score: number): string {
  if (score >= 80) return "var(--teal)";
  if (score >= 55) return "var(--amber)";
  return "var(--red)";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Healthy";
  if (score >= 55) return "Needs attention";
  return "Critical";
}

export function HealthScore({ doctor }: { doctor: DoctorResult }) {
  const color = scoreColor(doctor.health_score);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="flex items-center gap-6">
            <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
              <g transform="rotate(-90 44 44)">
                <circle cx="44" cy="44" r="38" fill="none" stroke="var(--border)" strokeWidth="8" />
                <circle
                  cx="44" cy="44" r="38" fill="none" stroke={color} strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 38}
                  strokeDashoffset={2 * Math.PI * 38 * (1 - doctor.health_score / 100)}
                  strokeLinecap="round"
                />
              </g>
              <text
                x="44" y="44" textAnchor="middle" dominantBaseline="central"
                fill="var(--foreground)" fontSize="22" fontWeight="600"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {doctor.health_score}
              </text>
            </svg>
            <div>
              <p className="mono-tag text-xs text-muted-foreground">[AI HEALTH SCORE]</p>
              <p className="mt-1 font-display text-lg font-semibold" style={{ color }}>
                {scoreLabel(doctor.health_score)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {doctor.issues.length} issue{doctor.issues.length === 1 ? "" : "s"} found
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <p className="mono-tag text-xs text-muted-foreground">EST. SAVINGS WITH PARITOK</p>
            <p className="mt-1 font-display text-2xl font-semibold text-teal">
              {doctor.total_estimated_savings_tokens.toLocaleString()} tokens
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HEALTH_SUBSCORES.map((sub) => {
            const value = doctor.subscores[sub.key] ?? 0;
            return (
              <div key={sub.key}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{sub.label}</span>
                  <span className="mono-tag" style={{ color: scoreColor(value) }}>{value}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${value}%`, backgroundColor: scoreColor(value) }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
