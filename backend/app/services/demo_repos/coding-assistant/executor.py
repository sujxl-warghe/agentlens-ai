"""
executor.py — Executes the plan produced by planner.py, one tool call at a time.
"""

from langchain_core.messages import AIMessage, ToolMessage

TOOLS = ["read_file", "write_file", "run_tests", "search_codebase", "git_diff", "git_commit"]


def execute_node(state: dict) -> dict:
    llm = state["llm"]
    messages = state["messages"]

    for _ in range(state.get("max_tool_calls", 8)):
        response: AIMessage = llm.invoke(messages)
        messages = messages + [response]

        if not response.tool_calls:
            break

        for call in response.tool_calls:
            result = _run_tool(call["name"], call["args"], state)
            messages = messages + [ToolMessage(content=str(result), tool_call_id=call["id"])]

    return {**state, "messages": messages}


def _run_tool(name: str, args: dict, state: dict):
    if name == "read_file":
        return state["fs"].read(args["path"])
    if name == "write_file":
        return state["fs"].write(args["path"], args["content"])
    if name == "run_tests":
        return state["runner"].run()
    if name == "search_codebase":
        return state["index"].search(args["query"])
    if name == "git_diff":
        return state["git"].diff()
    if name == "git_commit":
        return state["git"].commit(args["message"])
    raise ValueError(f"Unknown tool: {name}")
