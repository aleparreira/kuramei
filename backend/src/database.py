"""Database configuration with SQLAlchemy 2.0 async."""

from collections.abc import AsyncGenerator

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import Pool

from src.config import get_settings

settings = get_settings()

# Create async engine with SQLite-specific settings
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    connect_args={"check_same_thread": False},
)


# Enable SQLite foreign keys and WAL mode on each connection
@event.listens_for(Pool, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable SQLite foreign keys and WAL mode for better concurrency."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


# Session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""

    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides a database session.

    Note: This dependency does NOT auto-commit. Endpoints that modify data
    must explicitly call session.commit() or use session.begin() context.
    """
    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """Initialize database tables."""
    # Import models to register them with Base.metadata
    from src.projects.models import Project  # noqa: F401
    from src.models.models import Model, Node, Edge  # noqa: F401

    async with engine.begin() as conn:
        # Enable foreign keys for this connection
        await conn.execute(text("PRAGMA foreign_keys=ON"))
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Close database connections."""
    await engine.dispose()
