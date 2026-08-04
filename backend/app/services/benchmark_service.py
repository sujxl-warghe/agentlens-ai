from dataclasses import dataclass

from app.services.paritok_service import OptimizationResult

# Pricing/latency constants are documented assumptions (roughly in line
# with mid-tier hosted LLM pricing/latency as of early 2026), not measured
# from a live account — the point of the benchmark is the *relative* delta
# between pipeline A and B, which holds regardless of the exact constants.
INPUT_COST_PER_1K_TOKENS_USD = 0.003
OUTPUT_COST_PER_1K_TOKENS_USD = 0.015
AVG_COMPLETION_TOKENS = 300

BASE_LATENCY_MS = 280
INPUT_LATENCY_MS_PER_TOKEN = 0.35
OUTPUT_LATENCY_MS_PER_TOKEN = 12


@dataclass
class PipelineMetrics:
    label: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_latency_ms: int
    estimated_cost_usd: float


@dataclass
class BenchmarkResult:
    pipeline_a: PipelineMetrics
    pipeline_b: PipelineMetrics
    token_reduction_pct: float
    latency_reduction_pct: float
    cost_reduction_pct: float
    estimated_calls_per_session: int


class BenchmarkService:
    def run(self, optimization: OptimizationResult, estimated_calls_per_session: int) -> BenchmarkResult:
        calls = max(estimated_calls_per_session, 1)

        pipeline_a = self._metrics(
            "Original", optimization.total_original_tokens, calls,
        )
        pipeline_b = self._metrics(
            "Paritok Optimized", optimization.total_compressed_tokens, calls,
        )

        token_reduction = self._pct_reduction(pipeline_a.total_tokens, pipeline_b.total_tokens)
        latency_reduction = self._pct_reduction(pipeline_a.estimated_latency_ms, pipeline_b.estimated_latency_ms)
        cost_reduction = self._pct_reduction(pipeline_a.estimated_cost_usd, pipeline_b.estimated_cost_usd)

        return BenchmarkResult(
            pipeline_a=pipeline_a,
            pipeline_b=pipeline_b,
            token_reduction_pct=token_reduction,
            latency_reduction_pct=latency_reduction,
            cost_reduction_pct=cost_reduction,
            estimated_calls_per_session=calls,
        )

    @staticmethod
    def _metrics(label: str, prompt_tokens_per_call: int, calls: int) -> PipelineMetrics:
        total_prompt_tokens = prompt_tokens_per_call * calls
        total_completion_tokens = AVG_COMPLETION_TOKENS * calls
        total_tokens = total_prompt_tokens + total_completion_tokens

        latency_ms = round(
            BASE_LATENCY_MS
            + prompt_tokens_per_call * INPUT_LATENCY_MS_PER_TOKEN
            + AVG_COMPLETION_TOKENS * OUTPUT_LATENCY_MS_PER_TOKEN
        )

        cost = (
            (total_prompt_tokens / 1000) * INPUT_COST_PER_1K_TOKENS_USD
            + (total_completion_tokens / 1000) * OUTPUT_COST_PER_1K_TOKENS_USD
        )

        return PipelineMetrics(
            label=label,
            prompt_tokens=total_prompt_tokens,
            completion_tokens=total_completion_tokens,
            total_tokens=total_tokens,
            estimated_latency_ms=latency_ms,
            estimated_cost_usd=round(cost, 4),
        )

    @staticmethod
    def _pct_reduction(before: float, after: float) -> float:
        if before <= 0:
            return 0.0
        return round((1 - after / before) * 100, 1)
