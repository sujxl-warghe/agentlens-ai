import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VitalsStrip } from "@/components/marketing/vitals-strip";
import { HeroDemoAnimation } from "@/components/marketing/hero-demo-animation";

export function Hero() {
  return (
    <section className="scan-grid relative overflow-hidden border-b border-border py-20">
      {/* Premium ambient glow — layered, low-opacity radial blobs, not a flat gradient */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-25 blur-[120px]"
        style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute left-[15%] top-[280px] h-[300px] w-[300px] rounded-full opacity-[0.15] blur-[100px]"
        style={{ background: "radial-gradient(circle, var(--teal) 0%, transparent 70%)" }}
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 text-center">
        <div className="hero-fade-up" style={{ animationDelay: "0ms" }}>
          <Badge variant="teal">
            <span className="h-1.5 w-1.5 rounded-full bg-teal" />
            [SCAN] Paritok Token Efficiency Hackathon
          </Badge>
        </div>

        <h1
          className="hero-fade-up mt-6 max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-tight md:text-6xl"
          style={{ animationDelay: "80ms" }}
        >
          Your AI agents are bleeding tokens.
          <br />
          <span className="text-muted-foreground">AgentLens finds the wound.</span>
        </h1>

        <p
          className="hero-fade-up mt-6 max-w-xl text-balance text-base text-muted-foreground md:text-lg"
          style={{ animationDelay: "160ms" }}
        >
          Point AgentLens at a LangGraph or OpenAI Agents SDK repository. It
          diagnoses prompt bloat, memory sprawl, and wasteful RAG retrieval —
          then optimizes and benchmarks the fix with Paritok, in real numbers.
        </p>

        <div
          className="hero-fade-up mt-9 flex flex-col items-center gap-3 sm:flex-row"
          style={{ animationDelay: "240ms" }}
        >
          <Button size="lg" asChild>
            <Link href="/sign-in">
              Analyze repository
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/sign-in?guest=1">
              <Play className="h-4 w-4" />
              Try live demo
            </Link>
          </Button>
        </div>

        <p
          className="hero-fade-up mono-tag mt-4 text-xs text-subtle-foreground"
          style={{ animationDelay: "320ms" }}
        >
          NO CREDIT CARD · GUEST MODE INCLUDES 3 FREE SCANS
        </p>

        <div className="hero-fade-up mt-16 w-full max-w-4xl" style={{ animationDelay: "400ms" }}>
          <p className="mono-tag mb-3 text-center text-[11px] text-subtle-foreground">
            INTERACTIVE DEMO · SAMPLE REPOSITORY ANALYSIS · NOT LIVE DATA
          </p>
          <HeroDemoAnimation />
        </div>
      </div>

      <VitalsStrip
        className="pointer-events-none absolute inset-x-0 bottom-0 opacity-40"
        color="teal"
        height={48}
      />
    </section>
  );
}
