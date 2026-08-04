from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class ScanCreateRequest(BaseModel):
    """POST /scan body for a GitHub URL scan."""

    repo_url: HttpUrl = Field(..., description="Public GitHub repository URL")
    branch: str | None = Field(default=None, description="Branch to clone; defaults to the repo's default branch")


class DemoScanRequest(BaseModel):
    """POST /scan/demo body — runs a built-in demo repository."""

    demo_id: Literal["coding-assistant", "research-agent", "rag-assistant"]


class FileEntry(BaseModel):
    path: str
    language: str
    size_bytes: int
    estimated_tokens: int


class LanguageBreakdown(BaseModel):
    language: str
    file_count: int
    total_size_bytes: int
    percentage: float


class StructureResult(BaseModel):
    """Output of Phase 2 repository analysis."""

    total_files: int
    total_size_bytes: int
    languages: list[LanguageBreakdown]
    top_files_by_size: list[FileEntry]
    directory_tree_depth: int
    ignored_file_count: int


class GraphIssueSchema(BaseModel):
    severity: str
    title: str
    explanation: str
    suggested_fix: str
    expected_token_savings: int
    confidence: float = 0.7


class GraphNodeSchema(BaseModel):
    id: str
    label: str
    agent_type: str
    lane: str
    order: int
    attached_to: str | None = None
    file: str | None = None
    health: str
    estimated_tokens: int
    prompt_count: int
    llm_call_count: int
    memory_usage: bool
    memory_detail: str | None = None
    rag_usage: bool
    rag_detail: str | None = None
    issues: list[GraphIssueSchema] = []
    suggested_optimizations: list[str] = []
    expected_savings_tokens: int = 0
    is_inferred: bool = False


class GraphEdgeSchema(BaseModel):
    id: str
    source: str
    target: str
    estimated_token_flow: int
    label: str | None = None


class GraphResultSchema(BaseModel):
    nodes: list[GraphNodeSchema]
    edges: list[GraphEdgeSchema]
    is_inferred: bool
    framework: str | None = None


class PullRequestCreateRequest(BaseModel):
    accepted_item_indices: list[int] = Field(..., description="Indices into optimization_result.items to apply")
    github_token: str = Field(..., description="The user's own GitHub OAuth access token, used directly, never stored")


class PullRequestResponse(BaseModel):
    pr_url: str
    pr_number: int
    branch: str
    files_changed: list[str]
    skipped_files: list[str]


class ScanResponse(BaseModel):
    id: str
    source_type: str
    source_ref: str
    status: str
    status_message: str | None = None
    error_message: str | None = None

    file_count: int
    total_size_bytes: int
    repo_metadata: dict | None = None

    structure_result: StructureResult | None = None
    framework_result: dict | None = None
    agent_result: dict | None = None
    doctor_result: dict | None = None
    optimization_result: dict | None = None
    benchmark_result: dict | None = None
    graph_result: GraphResultSchema | None = None
    pr_url: str | None = None
    pr_number: int | None = None
    pr_branch: str | None = None

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
