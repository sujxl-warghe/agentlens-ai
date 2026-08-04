from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.db.models import Scan, ScanStatus, SourceType
from app.db.session import get_db
from app.models.repository import DemoScanRequest, ScanCreateRequest, ScanResponse
from app.services.repository_service import RepositoryService, RepositoryServiceError
from app.services.scan_orchestrator import run_scan_pipeline

router = APIRouter(tags=["repository"])
logger = get_logger(__name__)
settings = get_settings()

GUEST_SCAN_LIMIT = 3


async def _enforce_guest_limit(db: AsyncSession, owner_id: str) -> None:
    if not owner_id.startswith("guest_"):
        return
    result = await db.execute(select(func.count()).select_from(Scan).where(Scan.owner_id == owner_id))
    count = result.scalar_one()
    if count >= GUEST_SCAN_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Guest accounts are limited to {GUEST_SCAN_LIMIT} scans. Sign in with GitHub for unlimited scans.",
        )


@router.post("/scan", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
async def create_scan_from_url(
    payload: ScanCreateRequest,
    background_tasks: BackgroundTasks,
    owner_id: str = "anonymous",
    db: AsyncSession = Depends(get_db),
):
    await _enforce_guest_limit(db, owner_id)

    scan = Scan(
        source_type=SourceType.GITHUB_URL,
        source_ref=str(payload.repo_url),
        owner_id=owner_id,
        status=ScanStatus.PENDING,
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    background_tasks.add_task(run_scan_pipeline, scan.id)
    return _to_response(scan)


@router.post("/scan/demo", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
async def create_scan_from_demo(
    payload: DemoScanRequest,
    background_tasks: BackgroundTasks,
    owner_id: str = "anonymous",
    db: AsyncSession = Depends(get_db),
):
    await _enforce_guest_limit(db, owner_id)

    scan = Scan(
        source_type=SourceType.DEMO,
        source_ref=payload.demo_id,
        owner_id=owner_id,
        status=ScanStatus.PENDING,
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    background_tasks.add_task(run_scan_pipeline, scan.id)
    return _to_response(scan)


@router.post("/scan/upload", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
async def create_scan_from_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile,
    owner_id: str = "anonymous",
    db: AsyncSession = Depends(get_db),
):
    await _enforce_guest_limit(db, owner_id)

    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip uploads are supported.")

    scan = Scan(
        source_type=SourceType.ZIP_UPLOAD,
        source_ref=file.filename,
        owner_id=owner_id,
        status=ScanStatus.PENDING,
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    # Extracted synchronously here (not in the background task) because
    # UploadFile's underlying stream is closed once the request completes.
    zip_bytes = await file.read()
    try:
        RepositoryService().extract_zip_upload(scan.id, zip_bytes)
    except RepositoryServiceError as exc:
        scan.status = ScanStatus.FAILED
        scan.error_message = str(exc)
        await db.commit()
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    background_tasks.add_task(run_scan_pipeline, scan.id)
    return _to_response(scan)


@router.get("/scan/{scan_id}", response_model=ScanResponse)
async def get_scan(scan_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found.")
    return _to_response(scan)


@router.get("/scans", response_model=list[ScanResponse])
async def list_scans(owner_id: str = "anonymous", db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Scan).where(Scan.owner_id == owner_id).order_by(Scan.created_at.desc()).limit(50)
    )
    return [_to_response(s) for s in result.scalars().all()]


def _to_response(scan: Scan) -> ScanResponse:
    return ScanResponse(
        id=scan.id,
        source_type=scan.source_type.value,
        source_ref=scan.source_ref,
        status=scan.status.value,
        status_message=scan.status_message,
        error_message=scan.error_message,
        file_count=scan.file_count,
        total_size_bytes=scan.total_size_bytes,
        repo_metadata=scan.repo_metadata,
        structure_result=scan.structure_result,
        framework_result=scan.framework_result,
        agent_result=scan.agent_result,
        doctor_result=scan.doctor_result,
        optimization_result=scan.optimization_result,
        benchmark_result=scan.benchmark_result,
        graph_result=scan.graph_result,
        pr_url=scan.pr_url,
        pr_number=scan.pr_number,
        pr_branch=scan.pr_branch,
        created_at=scan.created_at,
        updated_at=scan.updated_at,
    )
