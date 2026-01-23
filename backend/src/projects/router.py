"""FastAPI router for projects domain."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.projects.models import Project
from src.projects.schemas import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter()


@router.get("/", response_model=list[ProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db)) -> list[Project]:
    """List all projects."""
    result = await db.execute(select(Project).order_by(Project.created_at.desc()))
    return list(result.scalars().all())


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Create a new project."""
    project = Project(**project_data.model_dump())
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Get a project by ID."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        )
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Update a project."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        )

    # Filter out None values to avoid setting required fields to null
    update_data = project_data.model_dump(exclude_unset=True)
    update_data = {k: v for k, v in update_data.items() if v is not None}

    for field, value in update_data.items():
        setattr(project, field, value)

    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a project."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        )

    await db.delete(project)
    await db.commit()
