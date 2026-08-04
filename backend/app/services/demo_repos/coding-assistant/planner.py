"""
planner.py — Plans coding tasks and routes them to the executor.

Seeded inefficiency: the SYSTEM_PROMPT below repeats its formatting
instructions twice (once at the top, once near the bottom) and includes
a long list of "capabilities" that duplicates what's already implied by
the tool schema passed to the model. AgentLens' AI Doctor should flag
this as a duplicate-instructions issue with a clear token-savings estimate.
"""

from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, HumanMessage

SYSTEM_PROMPT = """You are an expert AI coding assistant embedded in a developer's IDE.
You have access to the following tools: read_file, write_file, run_tests, search_codebase, git_diff, git_commit.

When responding, always follow this format:
1. Restate the user's goal in your own words.
2. List the files you plan to touch.
3. Explain your reasoning step by step before writing any code.
4. Write the code changes as a unified diff.
5. Summarize what changed and why.

Your capabilities include: reading files, writing files, running the test suite,
searching the codebase for symbols and usages, viewing git diffs, and committing
changes with a descriptive commit message. You are also capable of reading files,
writing files to disk, executing the test suite to verify changes, performing
codebase-wide search for symbols, inspecting git diffs before committing, and
creating git commits once changes are verified and tests pass.

You must never delete a file without explicit user confirmation.
You must never commit directly to the main branch.
You must always run tests after making a change and report the results.
You must always explain your reasoning before taking any destructive action.

Remember: when responding, always follow this exact format:
1. Restate the user's goal in your own words.
2. List the files you plan to touch.
3. Explain your reasoning step by step before writing any code.
4. Write the code changes as a unified diff.
5. Summarize what changed and why.

Be concise, be correct, and never fabricate file contents you have not read.
"""


def plan_node(state: dict) -> dict:
    """Entry node: turns a raw user request into a structured task plan."""
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=state["user_request"]),
    ]
    plan = state["llm"].invoke(messages)
    return {**state, "plan": plan.content, "messages": state.get("messages", []) + messages}


def build_graph(llm):
    graph = StateGraph(dict)
    graph.add_node("plan", plan_node)
    graph.add_node("execute", lambda state: state)  # see executor.py
    graph.add_node("review", lambda state: state)  # see reviewer.py

    graph.set_entry_point("plan")
    graph.add_edge("plan", "execute")
    graph.add_edge("execute", "review")
    graph.add_edge("review", END)

    return graph.compile()
