import { GitBranch, Search, Stethoscope, FlaskConical, FileBarChart } from "lucide-react";
import { VitalsStrip } from "@/components/marketing/vitals-strip";
import { Reveal } from "@/components/shared/reveal";

const STAGES = [
  { icon: GitBranch, title: "Scan", detail: "Clone repo, parse AST via Tree-sitter" },
  { icon: Search, title: "Detect", detail: "Identify framework, agents, prompts, RAG" },
  { icon: Stethoscope, title: "Diagnose", detail: "Score architecture, flag inefficiencies" },
  { icon: FlaskConical, title: "Optimize", detail: "Compress via the Paritok engine" },
  { icon: FileBarChart, title: "Benchmark", detail: "Prove savings, original vs. optimized" },
];

export function Architecture() {
  return (
    <section id="architecture" className="border-b border-border py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="max-w-xl">
          <span className="mono-tag text-xs text-primary">[PIPELINE]</span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Every scan runs the same five-stage pipeline.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Paritok sits at the center of stage four — the optimization engine
            the entire diagnosis is building toward, not a bolted-on step.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-5">
          {STAGES.map((stage, i) => (
            <Reveal key={stage.title} delay={i * 70} className="h-full">
              <div
                className={`group relative flex h-full flex-col gap-3 bg-surface p-6 transition-colors duration-200 hover:bg-surface-raised ${
                  i === 3 ? "ring-1 ring-inset ring-primary/40" : ""
                }`}
              >
                <span className="mono-tag text-xs text-subtle-foreground">
                  0{i + 1}
                </span>
                <stage.icon
                  className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${i === 3 ? "text-primary" : "text-muted-foreground"}`}
                />
                <div>
                  <p className="font-display text-sm font-semibold">{stage.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stage.detail}</p>
                </div>
                {i === 3 && (
                  <span className="mono-tag absolute right-4 top-4 text-[10px] text-primary">
                    PARITOK
                  </span>
                )}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <VitalsStrip className="mt-14 opacity-60" color="primary" height={40} />
        </Reveal>
      </div>
    </section>
  );
}
