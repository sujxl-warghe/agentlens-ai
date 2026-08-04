import difflib
import re
import time
from dataclasses import dataclass, field
from pathlib import Path

import httpx

from app.analyzers.prompt_extractor import extract_prompts
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

CHARS_PER_TOKEN_ESTIMATE = 4

# Rule-based filler removed by the local compression fallback. These are
# genuinely low-information phrases common in LLM-authored system prompts
# ("remember", "to summarize", restated transition phrases) — removing
# them is a real, verifiable transformation, not a fabricated number.
FILLER_PHRASES = [
    r"\bRemember(?:,)?\s+",
    r"\bTo summarize[^.:]*[.:]\s*",
    r"\bLet me (?:also |just )?(?:say|note|add)[^.]*\.\s*",
    r"\bAs (?:mentioned|stated|noted) (?:above|earlier|before)[,]?\s*",
    r"\bone more time\b[,:]?\s*",
]


@dataclass
class CompressedItem:
    file: str
    variable_name: str
    original_text: str
    compressed_text: str
    original_tokens: int
    compressed_tokens: int
    compression_pct: float


@dataclass
class OptimizationResult:
    engine: str  # "paritok_api" | "paritok_local_fallback"
    gpu_status: str
    items: list[CompressedItem] = field(default_factory=list)
    total_original_tokens: int = 0
    total_compressed_tokens: int = 0
    overall_compression_pct: float = 0.0
    processing_time_ms: int = 0


class ParitokService:
    """
    Paritok is the optimization engine for the whole product. This service
    always attempts the real Paritok Compression API first when an API key
    is configured. If no key is set, or the API call fails (e.g. no network
    egress in this environment), it falls back to a local, rule-based
    compression engine so the pipeline still produces genuine, computed
    before/after numbers rather than stalling or faking results.
    """

    def __init__(self):
        self.api_key = settings.PARITOK_API_KEY
        self.base_url = settings.PARITOK_API_BASE_URL
        self.timeout = settings.PARITOK_TIMEOUT_SECONDS

    async def optimize_repository(self, root: Path) -> OptimizationResult:
        start = time.monotonic()
        prompts = extract_prompts(root)
        if not prompts:
            return OptimizationResult(engine="paritok_local_fallback", gpu_status="idle")

        items: list[CompressedItem] = []
        engine_used = "paritok_local_fallback"
        gpu_status = "idle"

        for prompt in prompts:
            compressed_text, engine_used, gpu_status = await self._compress_one(prompt.text)
            original_tokens = len(prompt.text) // CHARS_PER_TOKEN_ESTIMATE
            compressed_tokens = len(compressed_text) // CHARS_PER_TOKEN_ESTIMATE
            pct = round((1 - compressed_tokens / original_tokens) * 100, 1) if original_tokens else 0.0

            items.append(CompressedItem(
                file=prompt.file,
                variable_name=prompt.variable_name,
                original_text=prompt.text,
                compressed_text=compressed_text,
                original_tokens=original_tokens,
                compressed_tokens=compressed_tokens,
                compression_pct=pct,
            ))

        total_original = sum(i.original_tokens for i in items)
        total_compressed = sum(i.compressed_tokens for i in items)
        overall_pct = round((1 - total_compressed / total_original) * 100, 1) if total_original else 0.0
        processing_time_ms = round((time.monotonic() - start) * 1000)

        logger.info("Paritok optimize: engine=%s, %d items, %.1f%% overall compression, %dms",
                     engine_used, len(items), overall_pct, processing_time_ms)

        return OptimizationResult(
            engine=engine_used,
            gpu_status=gpu_status,
            items=items,
            total_original_tokens=total_original,
            total_compressed_tokens=total_compressed,
            overall_compression_pct=overall_pct,
            processing_time_ms=processing_time_ms,
        )

    async def _compress_one(self, text: str) -> tuple[str, str, str]:
        if self.api_key:
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(
                        f"{self.base_url}/api/compress",
                        headers={"Authorization": f"Bearer {self.api_key}"},
                        json={"content": text, "type": "prompt"},
                    )
                    response.raise_for_status()
                    data = response.json()
                    return data["compressed_content"], "paritok_api", data.get("gpu_status", "active")
            except (httpx.HTTPError, KeyError, ValueError) as exc:
                logger.warning("Paritok API call failed (%s); using local fallback.", exc)

        return self._local_compress(text), "paritok_local_fallback", "idle"

    @staticmethod
    def _local_compress(text: str) -> str:
        """
        A transparent, rule-based compression pass used when the real
        Paritok API is unavailable:
          1. Remove near-duplicate paragraphs (keep the first occurrence).
          2. Strip low-information filler phrases.
          3. Collapse redundant whitespace.
        Every byte removed is a byte that would otherwise be re-sent to
        the model on every call, so the resulting token count is real.
        """
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
        stopwords = {
            "the", "and", "for", "that", "this", "with", "from", "your", "you",
            "are", "when", "should", "must", "not", "before", "always", "never",
            "only", "will", "have", "has",
        }

        def significant_words(p: str) -> set[str]:
            words = re.findall(r"[a-z']+", p.lower())
            return {w for w in words if len(w) > 4 and w not in stopwords}

        deduped: list[str] = []
        for para in paragraphs:
            is_duplicate = False
            para_words = significant_words(para)
            for kept in deduped:
                exact_ratio = difflib.SequenceMatcher(None, para, kept).ratio()
                if exact_ratio >= 0.72:
                    is_duplicate = True
                    break
                kept_words = significant_words(kept)
                if para_words and kept_words:
                    jaccard = len(para_words & kept_words) / len(para_words | kept_words)
                    if jaccard >= 0.4:
                        is_duplicate = True
                        break
            if not is_duplicate:
                deduped.append(para)

        compressed = "\n\n".join(deduped)
        for pattern in FILLER_PHRASES:
            compressed = re.sub(pattern, "", compressed, flags=re.IGNORECASE)

        compressed = re.sub(r"[ \t]+", " ", compressed)
        compressed = re.sub(r"\n{3,}", "\n\n", compressed)
        return compressed.strip()
