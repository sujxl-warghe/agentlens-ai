export const SITE_NAME = "AgentLens AI";
export const SITE_TAGLINE = "Analyze. Diagnose. Optimize. Benchmark.";
export const SITE_DESCRIPTION =
  "AgentLens is an AI observability and optimization platform for agentic systems. Detect token inefficiencies, optimize prompts and context with Paritok, and prove the savings with before/after benchmarks.";

export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Demo", href: "#demo" },
  { label: "Architecture", href: "#architecture" },
] as const;

export const GITHUB_REPO_URL = "https://github.com/agentlens-ai/agentlens";

export const DEMO_REPOSITORIES = [
  {
    id: "coding-assistant",
    name: "AI Coding Assistant",
    description:
      "A LangGraph-based coding agent with a planner, tool-using executor, and long-running conversation memory.",
    framework: "LangGraph",
    agents: 4,
    healthScore: 61,
  },
  {
    id: "research-agent",
    name: "Research Agent",
    description:
      "A multi-step OpenAI Agents SDK pipeline that plans research tasks, delegates to sub-agents, and synthesizes findings.",
    framework: "OpenAI Agents SDK",
    agents: 5,
    healthScore: 54,
  },
  {
    id: "rag-assistant",
    name: "RAG Assistant",
    description:
      "A retrieval-augmented support assistant with an oversized top-K retriever and duplicate chunk retrieval.",
    framework: "LangGraph",
    agents: 3,
    healthScore: 47,
  },
] as const;

export const HEALTH_SUBSCORES = [
  { key: "prompt-quality", label: "Prompt Quality" },
  { key: "memory", label: "Memory" },
  { key: "rag", label: "RAG" },
  { key: "architecture", label: "Architecture" },
  { key: "token-efficiency", label: "Token Efficiency" },
  { key: "performance", label: "Performance" },
] as const;

export const GUEST_SCAN_LIMIT = 3;
