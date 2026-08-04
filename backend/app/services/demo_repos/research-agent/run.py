"""
run.py — Entrypoint for the research agent pipeline.

Seeded inefficiency: every run makes a redundant "explain_plan" LLM call
that re-sends the planner's full instructions just to produce a debug
log line — a repeated-LLM-call pattern the Agent Scanner should catch.
"""

from agents import Runner
from agents_config import planner, RESEARCHER_INSTRUCTIONS


def run_research(question: str) -> str:
    result = Runner.run_sync(planner, question)

    # Redundant call: re-sends the planner instructions purely to log
    # a human-readable explanation of the plan that was already produced.
    debug_explainer = Runner.run_sync(
        planner,
        f"Explain in plain English the plan you just made for: {question}",
    )
    print(f"[debug] plan explanation: {debug_explainer.final_output}")

    return result.final_output


def run_research_batch(questions: list[str]) -> list[str]:
    return [run_research(q) for q in questions]
