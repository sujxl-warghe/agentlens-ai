"""
retriever.py — Retrieves context chunks for the support RAG assistant.

Seeded inefficiency: TOP_K=20 is far larger than needed for a support
FAQ corpus, and retrieve() never deduplicates near-identical chunks
that come from overlapping document splits. AgentLens' RAG Analyzer
should flag both: reduce top_k, and remove duplicate chunks.
"""

TOP_K = 20  # seeded: unnecessarily large for this corpus size


class VectorRetriever:
    def __init__(self, vector_store):
        self.vector_store = vector_store

    def retrieve(self, query: str) -> list[dict]:
        results = self.vector_store.similarity_search(query, k=TOP_K)
        # No deduplication step: overlapping chunk splits from the same
        # source document are returned as separate "relevant" results.
        return [{"text": r.text, "source": r.source, "score": r.score} for r in results]

    def retrieve_with_scores(self, query: str, threshold: float = 0.0) -> list[dict]:
        # Duplicate retrieval path: re-implements retrieve() instead of
        # composing it, doubling the maintenance surface and risk of drift.
        results = self.vector_store.similarity_search(query, k=TOP_K)
        return [
            {"text": r.text, "source": r.source, "score": r.score}
            for r in results
            if r.score >= threshold
        ]
