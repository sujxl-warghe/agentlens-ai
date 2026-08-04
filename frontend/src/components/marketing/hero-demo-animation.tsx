"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2, Stethoscope, FlaskConical,
  Sparkles, Cpu, TrendingDown,
} from "lucide-react";
import { GithubMark } from "@/components/shared/icons";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { Badge } from "@/components/ui/badge";

const FRAMEWORKS = ["LangGraph", "OpenAI Agents SDK", "CrewAI", "AutoGen", "Browser Use"];
const STEP_DURATIONS = [800, 1700, 800, 1300, 1300, 1500, 900, 1100] as const;
const TOKEN_STEPS = [54000, 42000, 25000, 9000];
const SCAN_LINES = [
  "Scanning repository...",
  "Found 248 files",
  "Detecting framework...",
  "Searching AI agents...",
  "Analyzing prompts...",
  "Checking memory...",
  "Analyzing RAG...",
  "Running diagnostics...",
];
const DOCTOR_CARDS = [
  { title: "Large Prompt", saving: 31 },
  { title: "Duplicate Context", saving: 18 },
  { title: "Large RAG Retrieval", saving: 24 },
];
const GRAPH_NODES = ["Repository", "Research Agent", "Planner", "Writer", "Reviewer", "Response"];

export function HeroDemoAnimation() {
  const [step, setStep] = useState(0);
  const [loopCount, setLoopCount] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visible, setVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const id = setTimeout(() => {
      setReducedMotion(mq.matches);
      if (mq.matches) setStep(7); // land on the success state instead of freezing mid-loop
    }, 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion || !visible) return;
    const timer = setTimeout(() => {
      setStep((s) => {
        const next = (s + 1) % STEP_DURATIONS.length;
        if (next === 0) setLoopCount((c) => c + 1);
        return next;
      });
    }, STEP_DURATIONS[step]);
    return () => clearTimeout(timer);
  }, [step, reducedMotion, visible]);

  const framework = FRAMEWORKS[loopCount % FRAMEWORKS.length];

  return (
    <div
      ref={containerRef}
      className="relative h-[340px] w-full overflow-hidden rounded-xl border border-border bg-surface shadow-[0_0_60px_-15px_rgba(108,142,245,0.15)]"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-teal/60" />
        </div>
        <span className="mono-tag text-xs text-subtle-foreground">interactive demo · sample data</span>
        <span />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex h-[260px] w-full items-center justify-center p-6"
        >
          {step === 0 && <RepoStep />}
          {step === 1 && <ScanStep />}
          {step === 2 && <FrameworkStep framework={framework} />}
          {step === 3 && <GraphStep />}
          {step === 4 && <DoctorStep />}
          {step === 5 && <ParitokStep />}
          {step === 6 && <BenchmarkStep />}
          {step === 7 && <SuccessStep />}
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {STEP_DURATIONS.map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === step ? "w-5 bg-primary" : "w-1.5 bg-border-strong"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function RepoStep() {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised px-5 py-4"
    >
      <GithubMark className="h-6 w-6 text-foreground" />
      <div>
        <p className="mono-tag text-sm text-foreground">github.com/company/ai-agent</p>
        <p className="mt-0.5 text-xs text-subtle-foreground">Public repository · fetching...</p>
      </div>
    </motion.div>
  );
}

function ScanStep() {
  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col gap-1.5">
        {SCAN_LINES.map((line, i) => (
          <motion.p
            key={line}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.14, duration: 0.25 }}
            className="mono-tag text-xs text-muted-foreground"
          >
            <span className="text-teal">$</span> {line}
          </motion.p>
        ))}
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.9, repeat: Infinity }}
          className="mono-tag h-3 w-1.5 bg-teal"
        />
      </div>
    </div>
  );
}

function FrameworkStep({ framework }: { framework: string }) {
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className="flex flex-col items-center gap-3"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-muted text-teal">
        <CheckCircle2 className="h-6 w-6" />
      </div>
      <p className="font-display text-xl font-semibold text-foreground">{framework}</p>
      <Badge variant="teal">CONFIDENCE 98%</Badge>
    </motion.div>
  );
}

function GraphStep() {
  return (
    <div className="flex w-full items-center justify-between px-2">
      {GRAPH_NODES.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <motion.span
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
              className="h-3 w-3 rounded-full bg-primary"
            />
            <span className="mono-tag whitespace-nowrap text-[9px] text-subtle-foreground">{label}</span>
          </div>
          {i < GRAPH_NODES.length - 1 && (
            <div className="relative mx-1 h-px w-6 bg-border-strong sm:w-8">
              <motion.span
                className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-teal"
                animate={{ left: ["0%", "100%"] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "linear" }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DoctorStep() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      {DOCTOR_CARDS.map((card, i) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.18, duration: 0.3 }}
          className="flex items-center justify-between rounded-lg border border-amber/25 bg-amber-muted px-3 py-2"
        >
          <div className="flex items-center gap-2">
            <Stethoscope className="h-3.5 w-3.5 text-amber" />
            <span className="text-xs font-medium text-foreground">{card.title}</span>
          </div>
          <span className="mono-tag text-[11px] text-amber">-{card.saving}%</span>
        </motion.div>
      ))}
    </div>
  );
}

function ParitokStep() {
  const [tokenIdx, setTokenIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTokenIdx((i) => Math.min(i + 1, TOKEN_STEPS.length - 1));
    }, 340);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-primary" />
        <span className="mono-tag text-xs text-primary">COMPRESSING CONTEXT</span>
      </div>
      <span className="font-display text-4xl font-semibold text-foreground">
        <AnimatedNumber value={TOKEN_STEPS[tokenIdx]} duration={0.3} />
      </span>
      <div className="flex items-center gap-2">
        <Badge variant="teal">74% SAVED</Badge>
        <span className="mono-tag flex items-center gap-1 text-[10px] text-subtle-foreground">
          <Cpu className="h-3 w-3" /> GPU ACTIVE
        </span>
      </div>
    </div>
  );
}

function BenchmarkStep() {
  return (
    <div className="grid w-full max-w-sm grid-cols-2 gap-3">
      <div className="rounded-lg border border-red/25 bg-red-muted px-3 py-3 text-center">
        <p className="mono-tag text-[10px] text-red">WITHOUT</p>
        <p className="mt-2 font-display text-lg font-semibold text-foreground">54,000 tok</p>
        <p className="mono-tag mt-1 text-[10px] text-subtle-foreground">320ms · $0.24</p>
      </div>
      <div className="rounded-lg border border-teal/25 bg-teal-muted px-3 py-3 text-center">
        <p className="mono-tag flex items-center justify-center gap-1 text-[10px] text-teal">
          <TrendingDown className="h-3 w-3" /> WITH PARITOK
        </p>
        <p className="mt-2 font-display text-lg font-semibold text-foreground">9,000 tok</p>
        <p className="mono-tag mt-1 text-[10px] text-subtle-foreground">140ms · $0.04</p>
      </div>
    </div>
  );
}

function SuccessStep() {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-muted text-teal">
        <Sparkles className="h-6 w-6" />
      </div>
      <p className="font-display text-3xl font-semibold text-foreground">94</p>
      <p className="mono-tag text-xs text-teal">GRADE A+ · 74% TOKEN SAVINGS</p>
      <Badge variant="teal">READY</Badge>
    </motion.div>
  );
}
