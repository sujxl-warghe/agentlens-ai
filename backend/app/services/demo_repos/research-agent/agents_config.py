"""
agents_config.py — Defines the multi-agent research pipeline using the
OpenAI Agents SDK: a lead Planner delegates to Researcher and Synthesizer
sub-agents via handoffs.

Seeded inefficiency: PLANNER_INSTRUCTIONS is a long, repetitive system
prompt that re-states the same delegation rules three times in slightly
different wording — a classic "prompt written by accretion" pattern.
"""

from agents import Agent, handoff

PLANNER_INSTRUCTIONS = """You are the lead research planner. Your job is to break down the user's
research question into sub-tasks and delegate them to the Researcher agent.

Delegation rules:
- If the question requires looking up current information, delegate to Researcher.
- If the question requires synthesizing multiple findings, delegate to Synthesizer.
- Never answer factual questions yourself; always delegate to Researcher first.

Remember these delegation rules carefully: when the user's question needs current
information or facts you are not certain about, you must delegate to the Researcher
agent rather than answering directly. When multiple pieces of research need to be
combined into a final answer, delegate that combination step to the Synthesizer agent.
Do not attempt to answer factual or current-events questions on your own.

To summarize the delegation policy one more time: current-information questions go
to Researcher, synthesis of multiple research results goes to Synthesizer, and you
personally should never answer a factual question without delegating first.

Always produce a numbered task list before delegating."""

RESEARCHER_INSTRUCTIONS = "Search for information relevant to the assigned sub-task and return concise, sourced findings."
SYNTHESIZER_INSTRUCTIONS = "Combine the provided findings into a single coherent answer with citations."

researcher = Agent(name="Researcher", instructions=RESEARCHER_INSTRUCTIONS)
synthesizer = Agent(name="Synthesizer", instructions=SYNTHESIZER_INSTRUCTIONS)

planner = Agent(
    name="Planner",
    instructions=PLANNER_INSTRUCTIONS,
    handoffs=[handoff(researcher), handoff(synthesizer)],
)
