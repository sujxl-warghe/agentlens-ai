import {
  Stethoscope,
  Network,
  FlaskConical,
  FileBarChart,
  Layers,
  MessagesSquare,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Reveal } from "@/components/shared/reveal";

const FEATURES = [
  {
    icon: Stethoscope,
    title: "AI Doctor Report",
    description:
      "A ranked diagnosis of every inefficiency — duplicate prompts, oversized history, repeated context — each with severity, cause, and expected token savings.",
    color: "text-red",
  },
  {
    icon: Network,
    title: "Architecture Visualizer",
    description:
      "An interactive React Flow graph of your actual agent topology: routers, sub-agents, memory, tools, and RAG, wired the way your code really executes.",
    color: "text-primary",
  },
  {
    icon: Layers,
    title: "Token Heatmap",
    description:
      "Every file in your repo ranked by estimated token cost, so you know exactly which planner or retriever to fix first.",
    color: "text-amber",
  },
  {
    icon: FlaskConical,
    title: "Paritok Optimization",
    description:
      "Compress prompts, retrieved context, memory, and code context through the Paritok engine — see original vs. compressed size on every pass.",
    color: "text-teal",
  },
  {
    icon: FileBarChart,
    title: "Before / After Benchmark",
    description:
      "Run your original pipeline against the Paritok-optimized one and compare tokens, latency, and estimated cost side by side.",
    color: "text-primary",
  },
  {
    icon: MessagesSquare,
    title: "AI Optimization Chat",
    description:
      "Ask 'why is my planner slow' or 'which agent wastes tokens' and get answers grounded directly in your scan results.",
    color: "text-teal",
  },
];

export function Features() {
  return (
    <section id="features" className="border-b border-border py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="max-w-xl">
          <span className="mono-tag text-xs text-primary">[MODULES]</span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            One platform, every stage of the diagnosis.
          </h2>
          <p className="mt-4 text-muted-foreground">
            AgentLens covers the full loop from repository scan to proven
            savings — nothing here is a mockup bolted onto a Paritok demo.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 60}>
              <Card interactive className="group h-full">
                <CardHeader>
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg bg-surface-raised transition-transform duration-200 ease-out group-hover:scale-110 ${feature.color}`}
                  >
                    <feature.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  </div>
                  <CardTitle className="mt-3">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
