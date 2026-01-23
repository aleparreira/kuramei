"""Pydantic schemas for Terraform generation."""

from pydantic import BaseModel, Field


class TerraformNode(BaseModel):
    """Simplified node data for Terraform generation."""

    id: str
    name: str
    type: str
    description: str | None = None
    properties: dict = Field(default_factory=dict)
    level: str | None = None


class TerraformEdge(BaseModel):
    """Simplified edge data for Terraform generation."""

    id: str
    type: str
    source_node_id: str
    target_node_id: str
    label: str | None = None
    properties: dict = Field(default_factory=dict)


class GeneratedFile(BaseModel):
    """A generated Terraform file."""

    filename: str
    content: str


class TerraformGenerationResult(BaseModel):
    """Result of Terraform generation."""

    files: list[GeneratedFile]
    warnings: list[str] = Field(default_factory=list)
