from dataclasses import asdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analyzers.agent_scanner import AgentScanner
from app.core.logging import get_logger
from app.db.models import Scan, ScanStatus, SourceType
from app.db.session import AsyncSessionLocal
from app.detectors.framework_detector import FrameworkDetector
from app.services.ai_doctor_service import AIDoctorService
from app.services.architecture_graph_service import ArchitectureGraphService
from app.services.benchmark_service import BenchmarkService
from app.services.paritok_service import ParitokService
from app.services.repository_service import RepositoryService, RepositoryServiceError

logger = get_logger(__name__)


async def run_scan_pipeline(scan_id: str) -> None:
    """
    Runs the full AgentLens pipeline for one scan, as a FastAPI background
    task. Each stage persists its result to the `scans` row immediately
    after completing, so the frontend can poll GET /scan/{id} and render
    partial progress instead of waiting for the whole pipeline to finish.
    """
    repo_service = RepositoryService()

    async with AsyncSessionLocal() as db:
        scan = await _get_scan(db, scan_id)
        if scan is None:
            logger.error("run_scan_pipeline: scan %s not found", scan_id)
            return

        workspace_path = None
        try:
            # --- acquire source -------------------------------------------------
            await _update_status(db, scan, ScanStatus.CLONING, "Acquiring repository source...")

            if scan.source_type == SourceType.GITHUB_URL:
                workspace_path, repo_metadata = repo_service.clone_github_repo(scan.id, scan.source_ref)
                if repo_metadata:
                    scan.repo_metadata = {
                        "name": repo_metadata.name,
                        "full_name": repo_metadata.full_name,
                        "default_branch": repo_metadata.default_branch,
                        "language": repo_metadata.language,
                        "size_kb": repo_metadata.size_kb,
                        "pushed_at": repo_metadata.pushed_at,
                        "stargazers_count": repo_metadata.stargazers_count,
                    }
                    await db.commit()
            elif scan.source_type == SourceType.DEMO:
                workspace_path = repo_service.prepare_demo_repo(scan.id, scan.source_ref)
            elif scan.source_type == SourceType.ZIP_UPLOAD:
                # ZIP bytes were already extracted synchronously in the route
                # handler (before this background task starts) because
                # UploadFile streams aren't safe to read twice; the path is
                # deterministic from scan_id.
                workspace_path = repo_service.workspace_root / scan.id
                if not workspace_path.exists():
                    raise RepositoryServiceError("Uploaded archive was not found on disk.")

            # --- Phase 2: repository structure -----------------------------------
            await _update_status(db, scan, ScanStatus.SCANNING, "Analyzing repository structure...")
            structure, full_entries = repo_service.analyze_structure(workspace_path)
            scan.file_count = structure.total_files
            scan.total_size_bytes = structure.total_size_bytes
            scan.structure_result = {
                "total_files": structure.total_files,
                "total_size_bytes": structure.total_size_bytes,
                "languages": structure.languages,
                "top_files_by_size": [asdict(f) for f in structure.top_files_by_size],
                "directory_tree_depth": structure.directory_tree_depth,
                "ignored_file_count": structure.ignored_file_count,
            }
            await db.commit()

            # --- Phase 3: framework detection --------------------------------------
            await _update_status(db, scan, ScanStatus.DETECTING, "Detecting agent framework...")
            framework = FrameworkDetector(workspace_path).detect()
            scan.framework_result = {
                "primary_framework": framework.primary_framework,
                "matches": [
                    {
                        "framework": m.framework,
                        "confidence": m.confidence,
                        "matched_signatures": m.matched_signatures,
                        "detected_files": m.detected_files,
                        "detected_because": m.detected_because,
                    }
                    for m in framework.matches
                ],
            }
            await db.commit()

            # --- Phase 4: agent scanner ---------------------------------------------
            await _update_status(db, scan, ScanStatus.DETECTING, "Searching for agents, prompts, and tools...")
            agent_scan = AgentScanner(workspace_path).scan()
            scan.agent_result = {
                "agent_count": agent_scan.agent_count,
                "prompt_count": agent_scan.prompt_count,
                "llm_call_count": agent_scan.llm_call_count,
                "memory_component_count": agent_scan.memory_component_count,
                "tool_count": agent_scan.tool_count,
                "rag_pipeline_count": agent_scan.rag_pipeline_count,
                "agents": [asdict(h) for h in agent_scan.agents],
                "memory_components": [asdict(h) for h in agent_scan.memory_components],
                "rag_pipelines": [asdict(h) for h in agent_scan.rag_pipelines],
            }
            await db.commit()

            # --- Phase 5: AI Doctor ---------------------------------------------------
            await _update_status(db, scan, ScanStatus.ANALYZING, "Running AI Doctor diagnosis...")
            total_tokens = structure.total_size_bytes // 4
            doctor = AIDoctorService(workspace_path, agent_scan, total_tokens).diagnose()
            scan.doctor_result = {
                "health_score": doctor.health_score,
                "subscores": doctor.subscores,
                "total_estimated_tokens": doctor.total_estimated_tokens,
                "total_estimated_savings_tokens": doctor.total_estimated_savings_tokens,
                "issues": [asdict(i) for i in doctor.issues],
            }
            await db.commit()

            # --- Phase 6: Paritok optimization -----------------------------------------
            await _update_status(db, scan, ScanStatus.ANALYZING, "Optimizing prompts with Paritok...")
            optimization = await ParitokService().optimize_repository(workspace_path)
            scan.optimization_result = {
                "engine": optimization.engine,
                "gpu_status": optimization.gpu_status,
                "total_original_tokens": optimization.total_original_tokens,
                "total_compressed_tokens": optimization.total_compressed_tokens,
                "overall_compression_pct": optimization.overall_compression_pct,
                "processing_time_ms": optimization.processing_time_ms,
                "items": [
                    {
                        "file": i.file,
                        "variable_name": i.variable_name,
                        "original_text": i.original_text,
                        "compressed_text": i.compressed_text,
                        "original_tokens": i.original_tokens,
                        "compressed_tokens": i.compressed_tokens,
                        "compression_pct": i.compression_pct,
                    }
                    for i in optimization.items
                ],
            }
            await db.commit()

            # --- Architecture Visualizer graph ---------------------------------------
            await _update_status(db, scan, ScanStatus.ANALYZING, "Building architecture graph...")
            graph = ArchitectureGraphService().build(framework, agent_scan, doctor, optimization, full_entries)
            scan.graph_result = {
                "nodes": [
                    {
                        "id": n.id, "label": n.label, "agent_type": n.agent_type, "lane": n.lane,
                        "order": n.order, "attached_to": n.attached_to, "file": n.file, "health": n.health,
                        "estimated_tokens": n.estimated_tokens, "prompt_count": n.prompt_count,
                        "llm_call_count": n.llm_call_count, "memory_usage": n.memory_usage,
                        "memory_detail": n.memory_detail, "rag_usage": n.rag_usage, "rag_detail": n.rag_detail,
                        "issues": [asdict(i) for i in n.issues],
                        "suggested_optimizations": n.suggested_optimizations,
                        "expected_savings_tokens": n.expected_savings_tokens,
                        "is_inferred": n.is_inferred,
                    }
                    for n in graph.nodes
                ],
                "edges": [asdict(e) for e in graph.edges],
                "is_inferred": graph.is_inferred,
                "framework": graph.framework,
            }
            await db.commit()

            # --- Phase 7: benchmark ------------------------------------------------------
            await _update_status(db, scan, ScanStatus.ANALYZING, "Running before/after benchmark...")
            benchmark = BenchmarkService().run(
                optimization, estimated_calls_per_session=max(agent_scan.llm_call_count, 4)
            )
            scan.benchmark_result = {
                "pipeline_a": asdict(benchmark.pipeline_a),
                "pipeline_b": asdict(benchmark.pipeline_b),
                "token_reduction_pct": benchmark.token_reduction_pct,
                "latency_reduction_pct": benchmark.latency_reduction_pct,
                "cost_reduction_pct": benchmark.cost_reduction_pct,
                "estimated_calls_per_session": benchmark.estimated_calls_per_session,
            }

            await _update_status(db, scan, ScanStatus.COMPLETE, "Scan complete.")

        except RepositoryServiceError as exc:
            logger.warning("Scan %s failed: %s", scan_id, exc)
            await _update_status(db, scan, ScanStatus.FAILED, None, error_message=str(exc))
        except Exception as exc:  # noqa: BLE001 — top-level pipeline guard
            logger.exception("Scan %s failed unexpectedly", scan_id)
            await _update_status(
                db, scan, ScanStatus.FAILED, None,
                error_message="An unexpected error occurred while analyzing this repository.",
            )
        finally:
            if workspace_path is not None:
                repo_service.cleanup(workspace_path)


async def _get_scan(db: AsyncSession, scan_id: str) -> Scan | None:
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    return result.scalar_one_or_none()


async def _update_status(
    db: AsyncSession, scan: Scan, status: ScanStatus, message: str | None, error_message: str | None = None
) -> None:
    scan.status = status
    scan.status_message = message
    if error_message is not None:
        scan.error_message = error_message
    await db.commit()
