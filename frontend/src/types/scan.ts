export type ScanStatus =
  | "pending"
  | "cloning"
  | "scanning"
  | "detecting"
  | "analyzing"
  | "complete"
  | "failed";

export interface LanguageBreakdown {
  language: string;
  file_count: number;
  total_size_bytes: number;
  percentage: number;
}

export interface FileEntry {
  path: string;
  language: string;
  size_bytes: number;
  estimated_tokens: number;
}

export interface StructureResult {
  total_files: number;
  total_size_bytes: number;
  languages: LanguageBreakdown[];
  top_files_by_size: FileEntry[];
  directory_tree_depth: number;
  ignored_file_count: number;
}

export interface FrameworkMatch {
  framework: string;
  confidence: number;
  matched_signatures: number;
  detected_files: string[];
  detected_because: string[];
}

export interface FrameworkResult {
  primary_framework: string | null;
  matches: FrameworkMatch[];
}

export interface ComponentHit {
  file: string;
  line: number;
  snippet: string;
}

export interface AgentResult {
  agent_count: number;
  prompt_count: number;
  llm_call_count: number;
  memory_component_count: number;
  tool_count: number;
  rag_pipeline_count: number;
  agents: ComponentHit[];
  memory_components: ComponentHit[];
  rag_pipelines: ComponentHit[];
}

export type IssueSeverity = "critical" | "warning" | "info";

export interface Issue {
  id: string;
  title: string;
  category: string;
  severity: IssueSeverity;
  file: string;
  line: number | null;
  explanation: string;
  expected_token_savings: number;
  suggested_fix: string;
  confidence: number;
}

export interface DoctorResult {
  health_score: number;
  subscores: Record<string, number>;
  total_estimated_tokens: number;
  total_estimated_savings_tokens: number;
  issues: Issue[];
}

export interface CompressedItem {
  file: string;
  variable_name: string;
  original_text: string;
  compressed_text: string;
  original_tokens: number;
  compressed_tokens: number;
  compression_pct: number;
}

export interface OptimizationResult {
  engine: string;
  gpu_status: string;
  total_original_tokens: number;
  total_compressed_tokens: number;
  overall_compression_pct: number;
  processing_time_ms: number;
  items: CompressedItem[];
}

export interface PipelineMetrics {
  label: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_latency_ms: number;
  estimated_cost_usd: number;
}

export interface BenchmarkResult {
  pipeline_a: PipelineMetrics;
  pipeline_b: PipelineMetrics;
  token_reduction_pct: number;
  latency_reduction_pct: number;
  cost_reduction_pct: number;
  estimated_calls_per_session: number;
}

export interface GraphIssue {
  severity: IssueSeverity;
  title: string;
  explanation: string;
  suggested_fix: string;
  expected_token_savings: number;
  confidence: number;
}

export type GraphLane = "entry" | "main" | "support" | "sink";
export type NodeHealth = "healthy" | "warning" | "critical";

export interface GraphNodeData {
  id: string;
  label: string;
  agent_type: string;
  lane: GraphLane;
  order: number;
  attached_to: string | null;
  file: string | null;
  health: NodeHealth;
  estimated_tokens: number;
  prompt_count: number;
  llm_call_count: number;
  memory_usage: boolean;
  memory_detail: string | null;
  rag_usage: boolean;
  rag_detail: string | null;
  issues: GraphIssue[];
  suggested_optimizations: string[];
  expected_savings_tokens: number;
  is_inferred: boolean;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  estimated_token_flow: number;
  label: string | null;
}

export interface GraphResult {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  is_inferred: boolean;
  framework: string | null;
}

export interface RepoMetadata {
  name: string;
  full_name: string;
  default_branch: string | null;
  language: string | null;
  size_kb: number;
  pushed_at: string | null;
  stargazers_count: number;
}

export interface ScanResponse {
  id: string;
  source_type: string;
  source_ref: string;
  status: ScanStatus;
  status_message: string | null;
  error_message: string | null;
  file_count: number;
  total_size_bytes: number;
  repo_metadata: RepoMetadata | null;
  structure_result: StructureResult | null;
  framework_result: FrameworkResult | null;
  agent_result: AgentResult | null;
  doctor_result: DoctorResult | null;
  optimization_result: OptimizationResult | null;
  benchmark_result: BenchmarkResult | null;
  graph_result: GraphResult | null;
  pr_url: string | null;
  pr_number: number | null;
  pr_branch: string | null;
  created_at: string;
  updated_at: string;
}

export interface PullRequestResponse {
  pr_url: string;
  pr_number: number;
  branch: string;
  files_changed: string[];
  skipped_files: string[];
}
