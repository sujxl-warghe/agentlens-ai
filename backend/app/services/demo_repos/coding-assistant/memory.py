"""
memory.py — Conversation memory for the coding assistant.

Seeded inefficiency: ConversationMemory.append() never trims or
summarizes history. Every turn re-sends the full transcript to the
model, so token cost grows roughly quadratically over a long session.
AgentLens' Memory Analyzer (Phase 2/5) should flag this as unbounded
memory growth with a summarization recommendation.
"""


class ConversationMemory:
    def __init__(self):
        self.turns: list[dict] = []

    def append(self, role: str, content: str) -> None:
        self.turns.append({"role": role, "content": content})
        # No trimming, no summarization, no sliding window — every past
        # message is kept forever and replayed on every future turn.

    def to_messages(self) -> list[dict]:
        return list(self.turns)

    def size_estimate_tokens(self) -> int:
        return sum(len(t["content"]) // 4 for t in self.turns)
