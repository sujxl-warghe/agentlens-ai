import re
from dataclasses import dataclass, field
from pathlib import Path

from app.core.logging import get_logger

logger = get_logger(__name__)

# Each signature is (regex, human-readable reason). Confidence is
# proportional to how many distinct signatures fired across the repo,
# capped at 0.98 (we never claim 100% certainty from static text matching).
# The description is shown to the user as "detected because: ..." — it's
# tied directly to the pattern that matched, not written after the fact.
FRAMEWORK_SIGNATURES: dict[str, list[tuple[str, str]]] = {
    "LangGraph": [
        (r"from\s+langgraph", "langgraph package imported"),
        (r"import\s+langgraph", "langgraph package imported"),
        (r"StateGraph\(", "StateGraph() instantiated"),
        (r"\.compile\(\s*\)", "graph.compile() called"),
        (r"add_node\(", "add_node() used to build the graph"),
    ],
    "OpenAI Agents SDK": [
        (r"from\s+agents\s+import", "agents package imported"),
        (r"import\s+agents\b", "agents package imported"),
        (r"Agent\(\s*name=", "Agent(name=...) instantiated"),
        (r"Runner\.run", "Runner.run() called"),
        (r"handoff\(", "handoff() used between agents"),
    ],
    "CrewAI": [
        (r"from\s+crewai", "crewai package imported"),
        (r"import\s+crewai", "crewai package imported"),
        (r"Crew\(", "Crew() instantiated"),
        (r"@agent\b", "@agent decorator used"),
        (r"@task\b", "@task decorator used"),
    ],
    "AutoGen": [
        (r"from\s+autogen", "autogen package imported"),
        (r"import\s+autogen", "autogen package imported"),
        (r"AssistantAgent\(", "AssistantAgent() instantiated"),
        (r"UserProxyAgent\(", "UserProxyAgent() instantiated"),
        (r"GroupChat\(", "GroupChat() instantiated"),
    ],
    "Google ADK": [
        (r"from\s+google\.adk", "google.adk package imported"),
        (r"import\s+google\.adk", "google.adk package imported"),
        (r"LlmAgent\(", "LlmAgent() instantiated"),
        (r"SequentialAgent\(", "SequentialAgent() instantiated"),
    ],
}

SCANNABLE_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx"}
MAX_FILE_BYTES_TO_READ = 400_000


@dataclass
class FrameworkMatch:
    framework: str
    confidence: float
    matched_signatures: int
    detected_files: list[str] = field(default_factory=list)
    detected_because: list[str] = field(default_factory=list)


@dataclass
class FrameworkDetectionResult:
    primary_framework: str | None
    matches: list[FrameworkMatch]
    version: str | None = None


class FrameworkDetector:
    """
    Static-analysis framework detection: reads every code file once,
    tests it against each framework's regex signature set, and scores
    frameworks by how many distinct signatures fired and in how many files.
    """

    def __init__(self, root: Path):
        self.root = root

    def detect(self) -> FrameworkDetectionResult:
        compiled = {
            fw: [(re.compile(pattern), reason) for pattern, reason in sigs]
            for fw, sigs in FRAMEWORK_SIGNATURES.items()
        }

        matched_reasons: dict[str, set[str]] = {fw: set() for fw in FRAMEWORK_SIGNATURES}
        detected_files: dict[str, set[str]] = {fw: set() for fw in FRAMEWORK_SIGNATURES}

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
            for fw, patterns in compiled.items():
                for pattern, reason in patterns:
                    if pattern.search(content):
                        matched_reasons[fw].add(reason)
                        detected_files[fw].add(rel_path)

        matches: list[FrameworkMatch] = []
        for fw, sigs in FRAMEWORK_SIGNATURES.items():
            n_matched = len(matched_reasons[fw])
            if n_matched == 0:
                continue
            confidence = min(0.98, round(n_matched / len(sigs), 2))
            matches.append(
                FrameworkMatch(
                    framework=fw,
                    confidence=confidence,
                    matched_signatures=n_matched,
                    detected_files=sorted(detected_files[fw]),
                    detected_because=sorted(matched_reasons[fw]),
                )
            )

        matches.sort(key=lambda m: (m.confidence, len(m.detected_files)), reverse=True)
        primary = matches[0].framework if matches else None

        logger.info("Framework detection: primary=%s, candidates=%d", primary, len(matches))

        return FrameworkDetectionResult(primary_framework=primary, matches=matches)
