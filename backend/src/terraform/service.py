"""Terraform generation service using Jinja2 templates."""

import logging
import re
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, TemplateNotFound

from src.terraform.mappings import get_template_for_type
from src.terraform.schemas import (
    GeneratedFile,
    TerraformEdge,
    TerraformGenerationResult,
    TerraformNode,
)

logger = logging.getLogger(__name__)

# Default template directory (relative to this file)
DEFAULT_TEMPLATE_DIR = Path(__file__).parent / "templates"


class TerraformGeneratorError(Exception):
    """Error during Terraform generation."""

    pass


class TerraformGenerator:
    """Service for generating Terraform files from architecture nodes.

    Uses Jinja2 templates to render AWS resources from Kuramei nodes.
    """

    def __init__(self, template_dir: Path | None = None):
        """Initialize the generator with a template directory.

        Args:
            template_dir: Path to the directory containing .tf.j2 templates.
                          Defaults to the 'templates' subdirectory.
        """
        self.template_dir = template_dir or DEFAULT_TEMPLATE_DIR
        self.env = Environment(
            loader=FileSystemLoader(str(self.template_dir)),
            trim_blocks=True,
            lstrip_blocks=True,
        )
        # Add custom filters
        self.env.filters["sanitize_name"] = self._sanitize_name

    @staticmethod
    def _sanitize_name(name: str) -> str:
        """Sanitize a name for use as a Terraform resource name.

        Terraform resource names must:
        - Start with a letter or underscore
        - Contain only letters, digits, underscores, and hyphens

        Args:
            name: The original name (e.g., "Order Service").

        Returns:
            A valid Terraform resource name (e.g., "order_service").
        """
        if not name:
            return "unnamed"

        # Convert to lowercase and replace spaces with underscores
        sanitized = name.lower().replace(" ", "_").replace("-", "_")

        # Remove any characters that aren't alphanumeric or underscore
        sanitized = re.sub(r"[^a-z0-9_]", "", sanitized)

        # Ensure it starts with a letter or underscore
        if sanitized and sanitized[0].isdigit():
            sanitized = f"_{sanitized}"

        # Handle empty result
        if not sanitized:
            return "unnamed"

        return sanitized

    def _render_template(
        self,
        template_name: str,
        context: dict,
    ) -> str:
        """Render a Jinja2 template with the given context.

        Args:
            template_name: Name of the template file.
            context: Variables to pass to the template.

        Returns:
            Rendered template content.

        Raises:
            TerraformGeneratorError: If template not found or render fails.
        """
        try:
            template = self.env.get_template(template_name)
            return template.render(**context)
        except TemplateNotFound:
            raise TerraformGeneratorError(
                f"Template not found: {template_name}"
            )
        except Exception as e:
            raise TerraformGeneratorError(
                f"Error rendering template {template_name}: {e}"
            )

    def _render_provider(self, region: str = "us-east-1") -> str:
        """Render the AWS provider configuration.

        Args:
            region: AWS region (default: us-east-1).

        Returns:
            Rendered provider.tf content.
        """
        return self._render_template("provider.tf.j2", {"region": region})

    def _render_outputs(
        self,
        nodes: list[TerraformNode],
    ) -> str:
        """Render outputs for all generated resources.

        Args:
            nodes: List of nodes to generate outputs for.

        Returns:
            Rendered outputs.tf content.
        """
        # Filter nodes that have Terraform resources
        terraform_nodes = [n for n in nodes if get_template_for_type(n.type)]
        return self._render_template("outputs.tf.j2", {"nodes": terraform_nodes})

    def _render_node(
        self,
        node: TerraformNode,
        template_name: str,
        nodes_by_id: dict[str, TerraformNode],
        edges: list[TerraformEdge],
    ) -> str:
        """Render a single node to Terraform HCL.

        Args:
            node: The node to render.
            template_name: Name of the template to use.
            nodes_by_id: Lookup dict for all nodes.
            edges: All edges in the model.

        Returns:
            Rendered Terraform configuration.
        """
        # Find related edges (where this node is source or target)
        node_edges = [
            e for e in edges
            if e.source_node_id == node.id or e.target_node_id == node.id
        ]

        # Build context with node data and relationships
        context = {
            "node": node,
            "resource_name": self._sanitize_name(node.name),
            "edges": node_edges,
            "nodes_by_id": nodes_by_id,
        }

        return self._render_template(template_name, context)

    def generate(
        self,
        nodes: list[TerraformNode],
        edges: list[TerraformEdge] | None = None,
        region: str = "us-east-1",
    ) -> TerraformGenerationResult:
        """Generate Terraform files from architecture nodes and edges.

        Args:
            nodes: List of architecture nodes.
            edges: List of edges connecting nodes (optional).
            region: AWS region for provider configuration.

        Returns:
            TerraformGenerationResult with generated files and warnings.
        """
        files: list[GeneratedFile] = []
        warnings: list[str] = []
        edges = edges or []

        # Build lookup dict
        nodes_by_id = {n.id: n for n in nodes}

        # 1. Generate provider.tf
        try:
            provider_content = self._render_provider(region)
            files.append(GeneratedFile(
                filename="provider.tf",
                content=provider_content,
            ))
        except TerraformGeneratorError as e:
            warnings.append(f"Failed to generate provider.tf: {e}")

        # 2. Generate resource files for each node
        for node in nodes:
            template_name = get_template_for_type(node.type)

            if template_name is None:
                # Node type doesn't map to Terraform
                if node.type == "external_system":
                    # Add a comment placeholder
                    sanitized = self._sanitize_name(node.name)
                    content = f"""# External System: {node.name}
# This represents an external system that is not managed by Terraform.
# You may need to configure IAM roles or security groups to allow access.

# resource "aws_security_group_rule" "{sanitized}_access" {{
#   type              = "egress"
#   from_port         = 443
#   to_port           = 443
#   protocol          = "tcp"
#   cidr_blocks       = ["0.0.0.0/0"]  # Replace with actual CIDR
#   security_group_id = aws_security_group.main.id
#   description       = "Allow access to {node.name}"
# }}
"""
                    files.append(GeneratedFile(
                        filename=f"{sanitized}_external.tf",
                        content=content,
                    ))
                else:
                    warnings.append(
                        f"Node '{node.name}' (type: {node.type}) "
                        "has no Terraform template"
                    )
                continue

            try:
                content = self._render_node(
                    node,
                    template_name,
                    nodes_by_id,
                    edges,
                )
                sanitized = self._sanitize_name(node.name)
                files.append(GeneratedFile(
                    filename=f"{sanitized}.tf",
                    content=content,
                ))
            except TerraformGeneratorError as e:
                warnings.append(f"Failed to generate {node.name}: {e}")

        # 3. Generate outputs.tf
        try:
            outputs_content = self._render_outputs(nodes)
            files.append(GeneratedFile(
                filename="outputs.tf",
                content=outputs_content,
            ))
        except TerraformGeneratorError as e:
            warnings.append(f"Failed to generate outputs.tf: {e}")

        return TerraformGenerationResult(files=files, warnings=warnings)
