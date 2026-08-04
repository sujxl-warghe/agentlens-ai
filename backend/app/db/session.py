from collections.abc import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
)

if settings.DATABASE_URL.startswith("sqlite"):
    # WAL mode lets readers (e.g. the frontend polling GET /scan/{id}) proceed
    # without blocking behind the background scan task's writes. Without this,
    # SQLite's default journal mode can make polling appear to hang — especially
    # on Windows or inside cloud-synced folders (OneDrive/Dropbox), where file
    # locking is already more aggressive than on a native Linux filesystem.
    @event.listens_for(engine.sync_engine, "connect")
    def _enable_wal(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    """Create tables if they don't exist. Fine for a hackathon; a real
    deployment would use Alembic migrations instead."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
