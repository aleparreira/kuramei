"""Pydantic schemas for Terraform generation."""

from pydantic import BaseModel, Field


# --- Validation schemas ---


class ValidationError(BaseModel):
    """A validation error for a specific node."""

    node_id: str
    node_name: str
    message: str


class ValidationWarning(BaseModel):
    """A validation warning for a specific node."""

    node_id: str
    node_name: str
    message: str


class ValidationResult(BaseModel):
    """Result of model validation for Terraform export."""

    valid: bool
    errors: list[ValidationError] = Field(default_factory=list)
    warnings: list[ValidationWarning] = Field(default_factory=list)


# --- Generation schemas ---


class TerraformFile(BaseModel):
    """A generated Terraform file (API response format)."""

    path: str
    content: str


class GenerateResponse(BaseModel):
    """Response from Terraform generation endpoint."""

    files: list[TerraformFile]
    warnings: list[str] = Field(default_factory=list)


# --- Internal schemas ---


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
