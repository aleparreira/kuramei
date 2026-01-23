"""FastAPI router for Kuramei architecture models domain."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.models import Model
from src.models.schemas import ModelCreate, ModelResponse, ModelUpdate
from src.projects.models import Project

router = APIRouter()


@router.get("/", response_model=list[ModelResponse])
async def list_models(
    project_id: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[Model]:
    """List all models, optionally filtered by project_id."""
    query = select(Model).order_by(Model.created_at.desc())
    if project_id:
        query = query.where(Model.project_id == project_id)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/", response_model=ModelResponse, status_code=status.HTTP_201_CREATED)
async def create_model(
    model_data: ModelCreate,
    db: AsyncSession = Depends(get_db),
) -> Model:
    """Create a new architecture model."""
    # Validate project exists
    project_result = await db.execute(
        select(Project).where(Project.id == model_data.project_id)
    )
    if project_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project {model_data.project_id} not found",
        )

    model = Model(**model_data.model_dump())
    db.add(model)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create model: {str(e)}",
        )
    await db.refresh(model)
    return model


@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(
    model_id: str,
    db: AsyncSession = Depends(get_db),
) -> Model:
    """Get a model by ID."""
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model {model_id} not found",
        )
    return model


@router.put("/{model_id}", response_model=ModelResponse)
async def update_model(
    model_id: str,
    model_data: ModelUpdate,
    db: AsyncSession = Depends(get_db),
) -> Model:
    """Update a model."""
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model {model_id} not found",
        )

    # Filter out None values to avoid setting required fields to null
    update_data = model_data.model_dump(exclude_unset=True)
    update_data = {k: v for k, v in update_data.items() if v is not None}

    for field, value in update_data.items():
        setattr(model, field, value)

    await db.commit()
    await db.refresh(model)
    return model


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(
    model_id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a model."""
    result = await db.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model {model_id} not found",
        )

    await db.delete(model)
    await db.commit()
