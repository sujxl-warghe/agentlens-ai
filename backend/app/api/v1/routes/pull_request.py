from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import Scan, SourceType
from app.db.session import get_db
from app.models.repository import PullRequestCreateRequest, PullRequestResponse
from app.services.github_service import GitHubServiceError
from app.services.pull_request_service import PullRequestPlanItem, PullRequestService, parse_github_url

router = APIRouter(tags=["pull-request"])
logger = get_logger(__name__)


@router.post("/scan/{scan_id}/pull-request", response_model=PullRequestResponse)
async def create_pull_request(
    scan_id: str,
    payload: PullRequestCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found.")

    if scan.source_type != SourceType.GITHUB_URL:
        raise HTTPException(
            status_code=400,
            detail="Pull requests can only be created for scans of a real GitHub repository "
            "(not demo or ZIP-upload scans, since there's no real repo to open a PR against).",
        )

    if not scan.optimization_result or not scan.optimization_result.get("items"):
        raise HTTPException(status_code=400, detail="This scan has no Paritok optimizations to apply.")

    all_items = scan.optimization_result["items"]
    selected = []
    for idx in payload.accepted_item_indices:
        if idx < 0 or idx >= len(all_items):
            raise HTTPException(status_code=400, detail=f"Invalid optimization index: {idx}")
        item = all_items[idx]
        selected.append(PullRequestPlanItem(
            file=item["file"],
            variable_name=item["variable_name"],
            original_text=item["original_text"],
            compressed_text=item["compressed_text"],
            original_tokens=item["original_tokens"],
            compressed_tokens=item["compressed_tokens"],
        ))

    if not selected:
        raise HTTPException(status_code=400, detail="No optimizations were selected.")

    try:
        owner, repo = parse_github_url(scan.source_ref)
    except GitHubServiceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    base_branch = (scan.repo_metadata or {}).get("default_branch") or "main"
    health_score = (scan.doctor_result or {}).get("health_score")
    framework = (scan.framework_result or {}).get("primary_framework")
    overall_pct = scan.optimization_result.get("overall_compression_pct", 0.0)
    total_savings = sum(i.original_tokens - i.compressed_tokens for i in selected)

    service = PullRequestService(payload.github_token)
    try:
        outcome = await service.create_optimization_pr(
            owner=owner,
            repo=repo,
            base_branch=base_branch,
            items=selected,
            health_score=health_score,
            framework=framework,
            overall_compression_pct=overall_pct,
            total_savings_tokens=total_savings,
            scan_id=scan.id,
        )
    except GitHubServiceError as exc:
        logger.warning("PR creation failed for scan %s: %s", scan_id, exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    scan.pr_url = outcome.pr_url
    scan.pr_number = outcome.pr_number
    scan.pr_branch = outcome.branch
    await db.commit()

    return PullRequestResponse(
        pr_url=outcome.pr_url,
        pr_number=outcome.pr_number,
        branch=outcome.branch,
        files_changed=outcome.files_changed,
        skipped_files=outcome.skipped_files,
    )
