import re
from dataclasses import dataclass, field
from pathlib import Path

from app.core.logging import get_logger

logger = get_logger(__name__)

SCANNABLE_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx"}
MAX_FILE_BYTES_TO_READ = 400_000

# Each pattern set below is intentionally conservative (favors precision
# over recall) since a false positive here directly inflates the health
# score's "detected agents/prompts" counts shown to the user.
AGENT_PATTERNS = [
    re.compile(r"StateGraph\("),
    re.compile(r"Agent\(\s*name\s*="),
    re.compile(r"AssistantAgent\("),
    re.compile(r"class\s+\w*Agent\w*\s*[:\(]"),
    re.compile(r"LlmAgent\("),
]

PROMPT_VAR_PATTERNS = [
    re.compile(r"\b[A-Z_]*(?:PROMPT|INSTRUCTIONS)[A-Z_]*\s*[:=]"),
    re.compile(r"SystemMessage\(\s*content\s*="),
    re.compile(r"\{\s*[\"']role[\"']\s*:\s*[\"']system[\"']"),
]

LLM_CALL_PATTERNS = [
    re.compile(r"\.invoke\("),
    re.compile(r"Runner\.run(?:_sync)?\("),
    re.compile(r"\.chat\.completions\.create\("),
    re.compile(r"client\.messages\.create\("),
]

MEMORY_PATTERNS = [
    re.compile(r"class\s+\w*Memory\w*"),
    re.compile(r"ConversationBufferMemory"),
    re.compile(r"\bmemory\s*=\s*\[\]"),
]

TOOL_PATTERNS = [
    re.compile(r"@tool\b"),
    re.compile(r"\bTOOLS\s*=\s*\["),
    re.compile(r"tool_calls"),
]

RAG_PATTERNS = [
    re.compile(r"similarity_search"),
    re.compile(r"VectorRetriever|vector_store|VectorStore"),
    re.compile(r"top_k|TOP_K"),
]


@dataclass
class ComponentHit:
    file: str
    line: int
    snippet: str


@dataclass
class AgentScanResult:
    agent_count: int
    prompt_count: int
    llm_call_count: int
    memory_component_count: int
    tool_count: int
    rag_pipeline_count: int
    agents: list[ComponentHit] = field(default_factory=list)
    prompts: list[ComponentHit] = field(default_factory=list)
    memory_components: list[ComponentHit] = field(default_factory=list)
    rag_pipelines: list[ComponentHit] = field(default_factory=list)
    llm_calls_by_file: dict[str, int] = field(default_factory=dict)


class AgentScanner:
    """
    Scans real file content for agent-framework building blocks. This is
    deliberately regex/heuristic-based rather than a full AST walk — it
    trades some precision for running instantly on any repo size without
    needing per-framework AST grammars wired up, which matters more for
    a hackathon demo than exhaustive correctness.
    """

    def __init__(self, root: Path):
        self.root = root

    def scan(self) -> AgentScanResult:
        agents: list[ComponentHit] = []
        prompts: list[ComponentHit] = []
        memory_components: list[ComponentHit] = []
        rag_pipelines: list[ComponentHit] = []
        llm_call_count = 0
        tool_count = 0
        llm_calls_by_file: dict[str, int] = {}

        for file_path in self.root.rglob("*"):
            if not file_path.is_file() or file_path.suffix not in SCANNABLE_EXTENSIONS:
                continue
            if any(part in {".git", "node_modules", "__pycache__", ".venv"} for part in file_path.parts):
                continue

            try:
                if file_path.stat().st_size > MAX_FILE_BYTES_TO_READ:
                    continue
                content = file_path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue

            rel_path = str(file_path.relative_to(self.root))
            lines = content.splitlines()

            agents.extend(self._find_hits(rel_path, lines, AGENT_PATTERNS))
            prompts.extend(self._find_hits(rel_path, lines, PROMPT_VAR_PATTERNS))
            memory_components.extend(self._find_hits(rel_path, lines, MEMORY_PATTERNS))
            rag_pipelines.extend(self._find_hits(rel_path, lines, RAG_PATTERNS))

            for pattern in LLM_CALL_PATTERNS:
                matches = len(pattern.findall(content))
                llm_call_count += matches
                if matches:
                    llm_calls_by_file[rel_path] = llm_calls_by_file.get(rel_path, 0) + matches
            for pattern in TOOL_PATTERNS:
                tool_count += len(pattern.findall(content))

        result = AgentScanResult(
            agent_count=len(agents),
            prompt_count=len(prompts),
            llm_call_count=llm_call_count,
            memory_component_count=len(memory_components),
            tool_count=tool_count,
            rag_pipeline_count=len(rag_pipelines),
            agents=agents,
            prompts=prompts,
            memory_components=memory_components,
            rag_pipelines=rag_pipelines,
            llm_calls_by_file=llm_calls_by_file,
        )

        logger.info(
            "Agent scan: %d agents, %d prompts, %d llm calls, %d memory, %d rag",
            result.agent_count, result.prompt_count, result.llm_call_count,
            result.memory_component_count, result.rag_pipeline_count,
        )
        return result

    @staticmethod
    def _find_hits(rel_path: str, lines: list[str], patterns: list[re.Pattern]) -> list[ComponentHit]:
        hits = []
        seen_lines: set[int] = set()
        for i, line in enumerate(lines):
            for pattern in patterns:
                if pattern.search(line) and i not in seen_lines:
                    hits.append(ComponentHit(file=rel_path, line=i + 1, snippet=line.strip()[:120]))
                    seen_lines.add(i)
                    break
        return hits
