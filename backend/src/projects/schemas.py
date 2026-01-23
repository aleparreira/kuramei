"""Pydantic schemas for projects domain."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProjectBase(BaseModel):
    """Base schema for project data."""

    name: str
    description: str | None = None
    default_cloud: str | None = None
    repo_url: str | None = None
    iac_tool: str | None = None


class ProjectCreate(ProjectBase):
    """Schema for creating a project."""

    pass


class ProjectUpdate(BaseModel):
    """Schema for updating a project (all fields optional)."""

    name: str | None = None
    description: str | None = None
    default_cloud: str | None = None
    repo_url: str | None = None
    iac_tool: str | None = None


class ProjectResponse(ProjectBase):
    """Schema for project responses."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
