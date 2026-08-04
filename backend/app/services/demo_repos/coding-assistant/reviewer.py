"""
reviewer.py — Reviews the diff produced by the executor before it's applied.
This node is intentionally lean: short prompt, no duplication, bounded
input, so AgentLens should score it well relative to planner.py/memory.py.
"""

REVIEW_PROMPT = "Review this diff for correctness and safety. Reply APPROVE or REJECT with a one-line reason."


def review_node(state: dict) -> dict:
    diff = state["git"].diff()
    verdict = state["llm"].invoke([
        {"role": "system", "content": REVIEW_PROMPT},
        {"role": "user", "content": diff},
    ])
    return {**state, "review_verdict": verdict.content}
