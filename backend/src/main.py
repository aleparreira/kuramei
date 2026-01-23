"""FastAPI application entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.chat.router import router as chat_router
from src.config import get_settings
from src.database import close_db
from src.models.router import router as models_router
from src.projects.router import router as projects_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan handler for startup/shutdown.

    Note: Database schema is managed by Alembic migrations.
    Run `alembic upgrade head` before starting the app.
    The init_db() function (which uses create_all) is only for tests.
    """
    # Startup - just verify DB connectivity, don't create tables
    # Tables should be created via: alembic upgrade head
    yield
    # Shutdown
    await close_db()


app = FastAPI(
    title=settings.app_name,
    description="Kuramei AI Architecture Platform - Backend API",
    version="0.1.0",
    lifespan=lifespan,
    redirect_slashes=False,  # Avoid 307 redirects for trailing slashes
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Convert FastAPI's 422 validation errors to 400 as per spec."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": exc.errors()},
    )


# Include routers under /api/v1 prefix
app.include_router(projects_router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(models_router, prefix="/api/v1/models", tags=["models"])
app.include_router(chat_router, prefix="/api/v1/chat", tags=["chat"])


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}
