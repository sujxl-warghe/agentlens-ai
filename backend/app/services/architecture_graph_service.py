from dataclasses import dataclass, field

from app.analyzers.agent_scanner import AgentScanResult
from app.analyzers.repo_structure import FileEntry
from app.core.logging import get_logger
from app.detectors.framework_detector import FrameworkDetectionResult
from app.services.ai_doctor_service import DoctorResult
from app.services.paritok_service import OptimizationResult

logger = get_logger(__name__)

# Filename/keyword -> Agent type label. Checked in order; first match wins.
TYPE_KEYWORDS: list[tuple[str, str]] = [
    ("plan", "Planner"),
    ("rout", "Router"),
    ("orchestr", "Orchestrator"),
    ("graph", "Router"),
    ("research", "Research Agent"),
    ("review", "Reviewer"),
    ("writ", "Writer"),
    ("synth", "Synthesizer"),
    ("execut", "Executor"),
    ("run", "Executor"),
    ("support", "Support Agent"),
    ("assist", "Support Agent"),
]

FRAMEWORK_FALLBACK_LABELS: dict[str, str] = {
    "LangGraph": "Router",
    "OpenAI Agents SDK": "Planner",
    "CrewAI": "Orchestrator",
    "AutoGen": "Orchestrator",
    "Google ADK": "Orchestrator",
}

TOKENS_PER_LLM_CALL_ESTIMATE = 250  # rough completion-side estimate for sink-edge weighting


@dataclass
class IssueSummary:
    severity: str
    title: str
    explanation: str
    suggested_fix: str
    expected_token_savings: int
    confidence: float


@dataclass
class GraphNode:
    id: str
    label: str
    agent_type: str
    lane: str  # "entry" | "main" | "support" | "sink"
    order: int
    attached_to: str | None
    file: str | None
    health: str  # "healthy" | "warning" | "critical"
    estimated_tokens: int
    prompt_count: int
    llm_call_count: int
    memory_usage: bool
    memory_detail: str | None
    rag_usage: bool
    rag_detail: str | None
    issues: list[IssueSummary] = field(default_factory=list)
    suggested_optimizations: list[str] = field(default_factory=list)
    expected_savings_tokens: int = 0
    is_inferred: bool = False


@dataclass
class GraphEdge:
    id: str
    source: str
    target: str
    estimated_token_flow: int
    label: str | None = None


@dataclass
class GraphResult:
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    is_inferred: bool
    framework: str | None


class ArchitectureGraphService:
    """
    Builds the Architecture Visualizer graph from data already collected
    earlier in the pipeline (structure, framework, agent scan, doctor,
    optimization) — deliberately does NOT re-read the filesystem, since by
    the time this runs the cloned workspace may already be gone.

    A node is created for every file carrying at least one detected AI
    signal (an agent pattern, a prompt, memory/RAG usage, or a Doctor
    issue). Only when there is truly zero signal anywhere in the repo does
    this fall back to a generic, explicitly-labeled inferred pipeline
    built from the detected framework name.
    """

    def build(
        self,
        framework: FrameworkDetectionResult,
        agent_scan: AgentScanResult,
        doctor: DoctorResult,
        optimization: OptimizationResult,
        file_entries: list[FileEntry],
    ) -> GraphResult:
        signal_files = self._collect_signal_files(agent_scan, doctor, optimization)

        if not signal_files:
            return self._build_inferred_fallback(framework)

        tokens_by_file = {f.path: f.estimated_tokens for f in file_entries}
        agent_hit_files = {h.file for h in agent_scan.agents}
        memory_hit_files = {h.file for h in agent_scan.memory_components}
        rag_hit_files = {h.file for h in agent_scan.rag_pipelines}
        prompts_by_file: dict[str, int] = {}
        for p in agent_scan.prompts:
            prompts_by_file[p.file] = prompts_by_file.get(p.file, 0) + 1
        issues_by_file: dict[str, list] = {}
        for issue in doctor.issues:
            issues_by_file.setdefault(issue.file, []).append(issue)
        optimization_by_file: dict[str, list] = {}
        for item in optimization.items:
            optimization_by_file.setdefault(item.file, []).append(item)

        main_nodes: list[GraphNode] = []
        support_nodes: list[GraphNode] = []

        for file in sorted(signal_files):
            is_memory_kind = file in memory_hit_files and file not in agent_hit_files
            is_rag_kind = file in rag_hit_files and file not in agent_hit_files and not is_memory_kind
            lane = "support" if (is_memory_kind or is_rag_kind) else "main"

            agent_type = (
                "Memory Store" if is_memory_kind else "RAG Retriever" if is_rag_kind else self._infer_type(file)
            )

            file_issues = issues_by_file.get(file, [])
            health = self._health_for_issues(file_issues)
            file_opt_items = optimization_by_file.get(file, [])

            node = GraphNode(
                id=self._node_id(file),
                label=file.split("/")[-1],
                agent_type=agent_type,
                lane=lane,
                order=0,  # assigned after sorting below
                attached_to=None,
                file=file,
                health=health,
                estimated_tokens=tokens_by_file.get(file, 0),
                prompt_count=prompts_by_file.get(file, 0),
                llm_call_count=agent_scan.llm_calls_by_file.get(file, 0),
                memory_usage=file in memory_hit_files,
                memory_detail=self._first_snippet(agent_scan.memory_components, file),
                rag_usage=file in rag_hit_files,
                rag_detail=self._first_snippet(agent_scan.rag_pipelines, file),
                issues=[
                    IssueSummary(i.severity, i.title, i.explanation, i.suggested_fix, i.expected_token_savings, i.confidence)
                    for i in file_issues
                ],
                suggested_optimizations=self._optimizations_for(file_issues, file_opt_items),
                expected_savings_tokens=sum(i.expected_token_savings for i in file_issues)
                + sum(o.original_tokens - o.compressed_tokens for o in file_opt_items),
            )

            (support_nodes if lane == "support" else main_nodes).append(node)

        # Rank the main lane into a left-to-right pipeline order
        main_nodes.sort(key=lambda n: (self._rank_for_type(n.agent_type), n.label))
        for i, node in enumerate(main_nodes):
            node.order = i

        # Attach each support node to the main node with the most LLM
        # calls (the most plausible "owner" of that memory/RAG component)
        hub = max(main_nodes, key=lambda n: n.llm_call_count, default=None)
        for i, node in enumerate(support_nodes):
            node.order = i
            node.attached_to = hub.id if hub else None

        nodes: list[GraphNode] = list(main_nodes) + list(support_nodes)

        entry = GraphNode(
            id="entry-user", label="User", agent_type="Entry Point", lane="entry", order=0,
            attached_to=None, file=None, health="healthy", estimated_tokens=0, prompt_count=0,
            llm_call_count=0, memory_usage=False, memory_detail=None, rag_usage=False, rag_detail=None,
        )
        sink = GraphNode(
            id="sink-llm", label="LLM", agent_type="Model Endpoint", lane="sink", order=0,
            attached_to=None, file=None, health="healthy",
            estimated_tokens=sum(n.estimated_tokens for n in main_nodes),
            prompt_count=0, llm_call_count=agent_scan.llm_call_count,
            memory_usage=False, memory_detail=None, rag_usage=False, rag_detail=None,
        )
        nodes = [entry] + nodes + [sink]

        edges = self._build_edges(entry, main_nodes, support_nodes, sink)

        logger.info("Architecture graph: %d nodes (%d main, %d support), %d edges",
                    len(nodes), len(main_nodes), len(support_nodes), len(edges))

        return GraphResult(nodes=nodes, edges=edges, is_inferred=False, framework=framework.primary_framework)

    # ---- fallback path ------------------------------------------------------

    def _build_inferred_fallback(self, framework: FrameworkDetectionResult) -> GraphResult:
        fw_name = framework.primary_framework
        mid_label = FRAMEWORK_FALLBACK_LABELS.get(fw_name or "", "Agent")

        entry = GraphNode(
            id="entry-user", label="User", agent_type="Entry Point", lane="entry", order=0,
            attached_to=None, file=None, health="healthy", estimated_tokens=0, prompt_count=0,
            llm_call_count=0, memory_usage=False, memory_detail=None, rag_usage=False, rag_detail=None,
        )
        mid = GraphNode(
            id="inferred-agent", label=f"{mid_label} (inferred)", agent_type=mid_label, lane="main", order=0,
            attached_to=None, file=None, health="healthy", estimated_tokens=0, prompt_count=0,
            llm_call_count=0, memory_usage=False, memory_detail=None, rag_usage=False, rag_detail=None,
            is_inferred=True,
            suggested_optimizations=[
                "No prompts, agent classes, or LLM calls were detected in this repository, "
                "so this is a generic pipeline inferred from the detected framework rather "
                "than your actual code."
            ],
        )
        sink = GraphNode(
            id="sink-llm", label="LLM", agent_type="Model Endpoint", lane="sink", order=0,
            attached_to=None, file=None, health="healthy", estimated_tokens=0, prompt_count=0,
            llm_call_count=0, memory_usage=False, memory_detail=None, rag_usage=False, rag_detail=None,
            is_inferred=True,
        )

        edges = [
            GraphEdge(id="e-entry-mid", source=entry.id, target=mid.id, estimated_token_flow=50),
            GraphEdge(id="e-mid-sink", source=mid.id, target=sink.id, estimated_token_flow=50),
        ]

        logger.info("Architecture graph: no signal detected, using inferred fallback (framework=%s)", fw_name)
        return GraphResult(nodes=[entry, mid, sink], edges=edges, is_inferred=True, framework=fw_name)

    # ---- helpers --------------------------------------------------------------

    @staticmethod
    def _collect_signal_files(
        agent_scan: AgentScanResult, doctor: DoctorResult, optimization: OptimizationResult
    ) -> set[str]:
        files: set[str] = set()
        files.update(h.file for h in agent_scan.agents)
        files.update(h.file for h in agent_scan.memory_components)
        files.update(h.file for h in agent_scan.rag_pipelines)
        files.update(p.file for p in agent_scan.prompts)
        files.update(agent_scan.llm_calls_by_file.keys())
        files.update(i.file for i in doctor.issues)
        files.update(i.file for i in optimization.items)
        return files

    @staticmethod
    def _node_id(file: str) -> str:
        return "node-" + file.replace("/", "-").replace(".", "-")

    @staticmethod
    def _infer_type(file: str) -> str:
        stem = file.rsplit("/", 1)[-1].lower()
        for keyword, label in TYPE_KEYWORDS:
            if keyword in stem:
                return label
        return "Agent"

    @staticmethod
    def _rank_for_type(agent_type: str) -> int:
        order = ["Router", "Orchestrator", "Planner", "Research Agent", "Executor",
                 "Support Agent", "Writer", "Synthesizer", "Reviewer", "Agent"]
        return order.index(agent_type) if agent_type in order else len(order)

    @staticmethod
    def _health_for_issues(issues: list) -> str:
        severities = {i.severity for i in issues}
        if "critical" in severities:
            return "critical"
        if "warning" in severities:
            return "warning"
        return "healthy"

    @staticmethod
    def _first_snippet(hits: list, file: str) -> str | None:
        for h in hits:
            if h.file == file:
                return h.snippet
        return None

    @staticmethod
    def _optimizations_for(issues: list, opt_items: list) -> list[str]:
        suggestions: list[str] = []
        seen: set[str] = set()
        for issue in issues:
            if issue.suggested_fix not in seen:
                suggestions.append(issue.suggested_fix)
                seen.add(issue.suggested_fix)
        for item in opt_items:
            note = f"Compress {item.variable_name} via Paritok: -{item.compression_pct}%"
            if note not in seen:
                suggestions.append(note)
                seen.add(note)
        return suggestions

    def _build_edges(
        self, entry: GraphNode, main_nodes: list[GraphNode], support_nodes: list[GraphNode], sink: GraphNode
    ) -> list[GraphEdge]:
        edges: list[GraphEdge] = []

        def flow_for(node: GraphNode) -> int:
            # Edge thickness approximates the token volume a stage pushes
            # downstream, using that stage's own estimated token footprint
            # as a proxy (its prompt/code content is what gets forwarded).
            return max(node.estimated_tokens, 40)

        if main_nodes:
            edges.append(GraphEdge(
                id=f"e-entry-{main_nodes[0].id}", source=entry.id, target=main_nodes[0].id,
                estimated_token_flow=flow_for(main_nodes[0]),
            ))
            for a, b in zip(main_nodes, main_nodes[1:]):
                edges.append(GraphEdge(
                    id=f"e-{a.id}-{b.id}", source=a.id, target=b.id, estimated_token_flow=flow_for(a),
                ))
            for node in main_nodes:
                edges.append(GraphEdge(
                    id=f"e-{node.id}-sink", source=node.id, target=sink.id,
                    estimated_token_flow=max(node.llm_call_count * TOKENS_PER_LLM_CALL_ESTIMATE, 30),
                ))
        else:
            edges.append(GraphEdge(id="e-entry-sink", source=entry.id, target=sink.id, estimated_token_flow=40))

        for node in support_nodes:
            if node.attached_to:
                edges.append(GraphEdge(
                    id=f"e-{node.attached_to}-{node.id}", source=node.attached_to, target=node.id,
                    estimated_token_flow=flow_for(node), label=node.agent_type,
                ))

        return edges
