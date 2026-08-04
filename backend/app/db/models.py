import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class ScanStatus(str, enum.Enum):
    PENDING = "pending"
    CLONING = "cloning"
    SCANNING = "scanning"
    DETECTING = "detecting"
    ANALYZING = "analyzing"
    COMPLETE = "complete"
    FAILED = "failed"


class SourceType(str, enum.Enum):
    GITHUB_URL = "github_url"
    ZIP_UPLOAD = "zip_upload"
    DEMO = "demo"


class Scan(Base):
    """
    One row per repository analysis run. `structure_result`,
    `framework_result`, `agent_result`, and `doctor_result` are populated
    incrementally as the pipeline stages (Phase 2-5) complete, so the
    frontend can poll a single row and render partial progress.
    """

    __tablename__ = "scans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)

    source_type: Mapped[SourceType] = mapped_column(Enum(SourceType))
    source_ref: Mapped[str] = mapped_column(String(1024))  # URL, filename, or demo id
    owner_id: Mapped[str] = mapped_column(String(128), index=True)  # session user id

    status: Mapped[ScanStatus] = mapped_column(
        Enum(ScanStatus), default=ScanStatus.PENDING, index=True
    )
    status_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Phase 2: Repository Analysis output
    structure_result: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Phase 3: Framework Detection output
    framework_result: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Phase 4: Agent Scanner output
    agent_result: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Phase 5: AI Doctor output (health score, issues, subscores)
    doctor_result: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Phase 6/7: Paritok optimization + benchmark output
    optimization_result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    benchmark_result: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Architecture Visualizer graph (nodes/edges), built from the above
    graph_result: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Real repo metadata from GitHub API (branch, language, size, last push)
    # captured before cloning starts — None for demo/ZIP sources.
    repo_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Set once a real Pull Request has been created via the GitHub API
    pr_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    pr_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pr_branch: Mapped[str | None] = mapped_column(String(256), nullable=True)

    file_count: Mapped[int] = mapped_column(Integer, default=0)
    total_size_bytes: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )
