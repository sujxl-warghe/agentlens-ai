import difflib
import re
from dataclasses import dataclass, field
from pathlib import Path

from app.analyzers.agent_scanner import AgentScanResult
from app.core.logging import get_logger

logger = get_logger(__name__)

SCANNABLE_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx"}
CHARS_PER_TOKEN_ESTIMATE = 4

# Thresholds tuned against the built-in demo repos; a real product would
# calibrate these against a broader corpus, but they're not arbitrary —
# each maps to a concrete, explainable rule of thumb.
OVERSIZED_PROMPT_TOKEN_THRESHOLD = 250
LARGE_TOP_K_THRESHOLD = 10
DUPLICATE_PARAGRAPH_SIMILARITY = 0.72
UNBOUNDED_MEMORY_SAFE_KEYWORDS = ("trim", "summar", "window", "max_", "truncate", "[-", "deque")
DEDUP_SAFE_KEYWORDS = ("dedup", "unique", "seen", "set(")

SEVERITY_WEIGHTS = {"critical": 15, "warning": 8, "info": 3}

# Confidence reflects how each detector actually works, not a vibe. Regex
# matches on a literal, unambiguous value in the source (e.g. "TOP_K=20")
# are high confidence; absence-of-a-keyword heuristics (e.g. "no 'trim'
# nearby") are inherently weaker signals and scored lower.
CONFIDENCE_OVERSIZED_PROMPT = 0.8   # exact token count measured, "too large" is the judgment call
CONFIDENCE_DUPLICATE_PROMPT = 0.7   # text-similarity heuristic, can misfire on legitimately repeated phrasing
CONFIDENCE_UNBOUNDED_MEMORY = 0.65  # absence-of-keyword heuristic
CONFIDENCE_OVERSIZED_TOPK = 0.9     # literal integer parsed directly from source
CONFIDENCE_NO_DEDUP = 0.6           # absence-of-keyword heuristic, weakest signal
CONFIDENCE_REDUNDANT_CALLS = 0.7    # concrete call count, but "redundant" is inferred

SUBSCORE_CATEGORIES = [
    "prompt-quality", "memory", "rag", "architecture", "token-efficiency", "performance",
]


@dataclass
class Issue:
    id: str
    title: str
    category: str  # maps to a SUBSCORE_CATEGORIES key
    severity: str  # critical | warning | info
    file: str
    line: int | None
    explanation: str
    expected_token_savings: int
    suggested_fix: str
    confidence: float  # 0-1, reflects how the detector actually works (see DETECTION_CONFIDENCE below)


@dataclass
class DoctorResult:
    health_score: int
    subscores: dict[str, int]
    issues: list[Issue] = field(default_factory=list)
    total_estimated_tokens: int = 0
    total_estimated_savings_tokens: int = 0


class AIDoctorService:
    def __init__(self, root: Path, agent_scan: AgentScanResult, total_estimated_tokens: int):
        self.root = root
        self.agent_scan = agent_scan
        self.total_estimated_tokens = total_estimated_tokens

    def diagnose(self) -> DoctorResult:
        issues: list[Issue] = []
        issues += self._detect_oversized_and_duplicate_prompts()
        issues += self._detect_unbounded_memory()
        issues += self._detect_oversized_rag()
        issues += self._detect_redundant_llm_calls()

        subscores = self._compute_subscores(issues)
        health_score = round(sum(subscores.values()) / len(subscores))
        total_savings = sum(i.expected_token_savings for i in issues)

        logger.info("AI Doctor: health=%d, issues=%d, est. savings=%d tokens",
                     health_score, len(issues), total_savings)

        return DoctorResult(
            health_score=health_score,
            subscores=subscores,
            issues=sorted(issues, key=lambda i: SEVERITY_WEIGHTS[i.severity], reverse=True),
            total_estimated_tokens=self.total_estimated_tokens,
            total_estimated_savings_tokens=total_savings,
        )

    # ---- individual detectors -------------------------------------------------

    def _detect_oversized_and_duplicate_prompts(self) -> list[Issue]:
        issues: list[Issue] = []
        for file_path in self._iter_files():
            content = self._read(file_path)
            if content is None or not re.search(r"(PROMPT|INSTRUCTIONS)\s*[:=]", content):
                continue
            rel_path = str(file_path.relative_to(self.root))

            for match in re.finditer(r'([A-Z_]*(?:PROMPT|INSTRUCTIONS)[A-Z_]*)\s*[:=]\s*(?:f?""")', content):
                var_name = match.group(1)
                start = match.end()
                end = content.find('"""', start)
                if end == -1:
                    continue
                prompt_text = content[start:end]
                token_estimate = len(prompt_text) // CHARS_PER_TOKEN_ESTIMATE
                line_no = content[:match.start()].count("\n") + 1

                if token_estimate > OVERSIZED_PROMPT_TOKEN_THRESHOLD:
                    savings = int(token_estimate * 0.35)
                    issues.append(Issue(
                        id=f"oversized-prompt-{rel_path}-{var_name}",
                        title=f"Oversized system prompt: {var_name}",
                        category="prompt-quality",
                        severity="critical" if token_estimate > 900 else "warning",
                        file=rel_path,
                        line=line_no,
                        explanation=(
                            f"{var_name} is approximately {token_estimate} tokens. Long, "
                            "unstructured system prompts are resent on every single LLM "
                            "call, so their cost compounds across a session."
                        ),
                        expected_token_savings=savings,
                        suggested_fix="Compress with Paritok, or move static policy text into fewer, denser instructions.",
                        confidence=CONFIDENCE_OVERSIZED_PROMPT,
                    ))

                dup = self._find_duplicate_paragraph(prompt_text)
                if dup:
                    savings = len(dup) // CHARS_PER_TOKEN_ESTIMATE
                    issues.append(Issue(
                        id=f"duplicate-prompt-{rel_path}-{var_name}",
                        title=f"Duplicate instructions inside {var_name}",
                        category="prompt-quality",
                        severity="warning",
                        file=rel_path,
                        line=line_no,
                        explanation=(
                            f"{var_name} repeats the same instructions more than once "
                            f'(near-duplicate text starting with "{dup[:60].strip()}..."). '
                            "This is common when a prompt is edited over time without "
                            "removing the earlier version."
                        ),
                        expected_token_savings=savings,
                        suggested_fix="Remove the repeated paragraph; state each instruction exactly once.",
                        confidence=CONFIDENCE_DUPLICATE_PROMPT,
                    ))

        return issues

    def _detect_unbounded_memory(self) -> list[Issue]:
        issues: list[Issue] = []
        for hit in self.agent_scan.memory_components:
            file_path = self.root / hit.file
            content = self._read(file_path)
            if content is None:
                continue
            code_only = self._strip_comments_and_docstrings(content).lower()
            has_append = "append(" in code_only or "+= [" in code_only
            is_bounded = any(kw in code_only for kw in UNBOUNDED_MEMORY_SAFE_KEYWORDS)

            if has_append and not is_bounded:
                issues.append(Issue(
                    id=f"unbounded-memory-{hit.file}",
                    title="Unbounded conversation memory growth",
                    category="memory",
                    severity="critical",
                    file=hit.file,
                    line=hit.line,
                    explanation=(
                        "This memory component appends new turns but never trims, "
                        "summarizes, or windows the history. Every past message gets "
                        "resent to the model on every future turn, so cost grows with "
                        "the square of the conversation length."
                    ),
                    expected_token_savings=800,
                    suggested_fix="Add a sliding window or periodic summarization via Paritok memory compression.",
                    confidence=CONFIDENCE_UNBOUNDED_MEMORY,
                ))

        return issues

    def _detect_oversized_rag(self) -> list[Issue]:
        issues: list[Issue] = []
        for file_path in self._iter_files():
            content = self._read(file_path)
            if content is None:
                continue
            rel_path = str(file_path.relative_to(self.root))

            for match in re.finditer(r"\bTOP_K\s*=\s*(\d+)|[^_]k\s*=\s*(\d+)\)", content):
                value = int(match.group(1) or match.group(2))
                if value > LARGE_TOP_K_THRESHOLD:
                    line_no = content[:match.start()].count("\n") + 1
                    issues.append(Issue(
                        id=f"large-topk-{rel_path}-{match.start()}",
                        title=f"Oversized retrieval top-k ({value})",
                        category="rag",
                        severity="warning",
                        file=rel_path,
                        line=line_no,
                        explanation=(
                            f"Retrieving k={value} chunks per query is unusually high. "
                            "Beyond roughly 5-8 chunks, additional context typically adds "
                            "tokens without improving answer quality, and raises the odds "
                            "of retrieving near-duplicate chunks."
                        ),
                        expected_token_savings=(value - 6) * 180,
                        suggested_fix="Reduce top_k to 5-8 and re-rank before stuffing context into the prompt.",
                        confidence=CONFIDENCE_OVERSIZED_TOPK,
                    ))
                    break  # one flag per file is enough signal

            if "similarity_search" in content:
                code_only = self._strip_comments_and_docstrings(content).lower()
                if not any(kw in code_only for kw in DEDUP_SAFE_KEYWORDS):
                    issues.append(Issue(
                        id=f"no-dedup-{rel_path}",
                        title="Retrieved chunks are not deduplicated",
                        category="rag",
                        severity="info",
                        file=rel_path,
                        line=None,
                        explanation=(
                            "This retriever returns raw similarity-search results with no "
                            "deduplication step, so overlapping document splits can appear "
                            "as multiple 'relevant' chunks in the same context window."
                        ),
                        expected_token_savings=250,
                        suggested_fix="Deduplicate by source + text hash before building the prompt context.",
                        confidence=CONFIDENCE_NO_DEDUP,
                    ))

        return issues

    def _detect_redundant_llm_calls(self) -> list[Issue]:
        issues: list[Issue] = []
        for file_path in self._iter_files():
            content = self._read(file_path)
            if content is None:
                continue
            call_count = len(re.findall(r"\.invoke\(|Runner\.run(?:_sync)?\(|\.chat\.completions\.create\(", content))
            if call_count >= 2:
                rel_path = str(file_path.relative_to(self.root))
                issues.append(Issue(
                    id=f"redundant-calls-{rel_path}",
                    title="Multiple LLM calls in one code path",
                    category="performance",
                    severity="warning",
                    file=rel_path,
                    line=None,
                    explanation=(
                        f"{call_count} separate LLM invocations happen in this file's "
                        "execution path. If any of them re-send overlapping context "
                        "(e.g. a debug/explain call after the main call), that's pure "
                        "duplicated token spend and added latency."
                    ),
                    expected_token_savings=400,
                    suggested_fix="Cache or reuse the first call's output instead of re-invoking the model.",
                    confidence=CONFIDENCE_REDUNDANT_CALLS,
                ))
        return issues

    # ---- scoring ----------------------------------------------------------

    def _compute_subscores(self, issues: list[Issue]) -> dict[str, int]:
        scores = {cat: 100 for cat in SUBSCORE_CATEGORIES}
        for issue in issues:
            category = issue.category if issue.category in scores else "architecture"
            scores[category] -= SEVERITY_WEIGHTS[issue.severity]

        # Token efficiency reflects overall issue density rather than one category
        total_deduction = sum(SEVERITY_WEIGHTS[i.severity] for i in issues)
        scores["token-efficiency"] = max(0, 100 - total_deduction)

        # Architecture score also reflects agent/tool topology richness (a
        # repo with agents but zero detected tools/memory looks under-built)
        if self.agent_scan.agent_count > 0 and self.agent_scan.tool_count == 0:
            scores["architecture"] -= 10

        return {k: max(0, min(100, v)) for k, v in scores.items()}

    # ---- helpers ------------------------------------------------------------

    def _iter_files(self):
        for file_path in self.root.rglob("*"):
            if not file_path.is_file() or file_path.suffix not in SCANNABLE_EXTENSIONS:
                continue
            if any(part in {".git", "node_modules", "__pycache__", ".venv"} for part in file_path.parts):
                continue
            yield file_path

    @staticmethod
    def _strip_comments_and_docstrings(content: str) -> str:
        """Removes triple-quoted docstrings and '#' comments so that
        explanatory prose (which may itself mention words like 'trim' or
        'dedup' while describing what's missing) doesn't mask real issues
        in the actual code."""
        no_docstrings = re.sub(r'""".*?"""', "", content, flags=re.DOTALL)
        no_docstrings = re.sub(r"'''.*?'''", "", no_docstrings, flags=re.DOTALL)
        no_comments = re.sub(r"#.*", "", no_docstrings)
        return no_comments

    @staticmethod
    def _read(file_path: Path) -> str | None:
        try:
            if file_path.stat().st_size > 400_000:
                return None
            return file_path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return None

    @staticmethod
    def _find_duplicate_paragraph(text: str) -> str | None:
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if len(p.strip()) > 40]
        stopwords = {
            "the", "and", "for", "that", "this", "with", "from", "your", "you",
            "are", "you're", "when", "should", "must", "not", "own", "own",
            "before", "always", "never", "only", "will", "have", "has",
        }

        def significant_words(p: str) -> set[str]:
            words = re.findall(r"[a-z']+", p.lower())
            return {w for w in words if len(w) > 4 and w not in stopwords}

        for i in range(len(paragraphs)):
            for j in range(i + 1, len(paragraphs)):
                exact_ratio = difflib.SequenceMatcher(None, paragraphs[i], paragraphs[j]).ratio()
                if exact_ratio >= DUPLICATE_PARAGRAPH_SIMILARITY:
                    return paragraphs[j]

                words_i, words_j = significant_words(paragraphs[i]), significant_words(paragraphs[j])
                if words_i and words_j:
                    jaccard = len(words_i & words_j) / len(words_i | words_j)
                    if jaccard >= 0.4:
                        return paragraphs[j]

        return None
