"""Parser for extracting and validating operations from LLM responses."""

import json
import logging
import re

from pydantic import ValidationError as PydanticValidationError

from src.chat.schemas import (
    Operation,
    ParsedOperations,
    ValidationError,
    ValidationResult,
)

logger = logging.getLogger(__name__)

# Pattern to match JSON code blocks in markdown
JSON_BLOCK_PATTERN = re.compile(
    r"```(?:json)?\s*\n(.*?)\n\s*```",
    re.DOTALL | re.IGNORECASE,
)


def extract_json_block(text: str) -> str | None:
    """Extract JSON block from markdown-formatted text or raw JSON.

    Looks for JSON in the following order:
    1. Markdown code blocks (```json ... ``` or ``` ... ```)
    2. Raw JSON object starting with {

    Args:
        text: The text to extract JSON from.

    Returns:
        The extracted JSON string, or None if no JSON found.
    """
    if not text:
        return None

    # First, try to find markdown code blocks
    matches = JSON_BLOCK_PATTERN.findall(text)
    for match in matches:
        match = match.strip()
        # Verify it looks like JSON (starts with { or [)
        if match.startswith("{") or match.startswith("["):
            return match

    # If no code block, try to find raw JSON
    # Look for { and find matching }
    text = text.strip()

    # Find the first { and try to extract the JSON object
    start_idx = text.find("{")
    if start_idx == -1:
        return None

    # Count braces to find the matching closing brace
    brace_count = 0
    in_string = False
    escape_next = False

    for i, char in enumerate(text[start_idx:], start=start_idx):
        if escape_next:
            escape_next = False
            continue

        if char == "\\":
            escape_next = True
            continue

        if char == '"' and not escape_next:
            in_string = not in_string
            continue

        if in_string:
            continue

        if char == "{":
            brace_count += 1
        elif char == "}":
            brace_count -= 1
            if brace_count == 0:
                return text[start_idx : i + 1]

    return None


def parse_operations(llm_response: str) -> tuple[str, list[Operation]]:
    """Parse operations from an LLM response.

    The response may contain:
    1. Just explanation text (no operations)
    2. Explanation followed by JSON block with operations
    3. Pure JSON response

    Args:
        llm_response: The raw text response from the LLM.

    Returns:
        Tuple of (explanation_text, list_of_operations).
        If no operations found, returns (full_text, []).
    """
    if not llm_response:
        return "", []

    # Extract JSON if present
    json_str = extract_json_block(llm_response)

    if json_str is None:
        # No JSON found, return full response as explanation
        return llm_response.strip(), []

    # Try to parse the JSON
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse JSON from LLM response: {e}")
        return llm_response.strip(), []

    # Extract operations from the parsed JSON
    # Support both { "operations": [...] } and top-level [...]
    if isinstance(data, list):
        # Top-level list of operations
        operations_data = data
    elif isinstance(data, dict):
        operations_data = data.get("operations", [])
    else:
        # Unexpected type
        return llm_response.strip(), []

    if not operations_data:
        # JSON exists but no operations
        return llm_response.strip(), []

    # Validate operations using Pydantic
    try:
        parsed = ParsedOperations(operations=operations_data)
        operations = parsed.operations
    except PydanticValidationError as e:
        logger.warning(f"Failed to validate operations: {e}")
        return llm_response.strip(), []

    # Extract explanation (text before the JSON block)
    explanation = llm_response
    # Remove the JSON block (including markdown markers) from explanation
    json_block_match = JSON_BLOCK_PATTERN.search(llm_response)
    if json_block_match:
        explanation = llm_response[: json_block_match.start()].strip()
    else:
        # Raw JSON - find where it starts and take text before
        json_start = llm_response.find(json_str)
        if json_start > 0:
            explanation = llm_response[:json_start].strip()
        elif json_start == 0:
            # Response is pure JSON
            explanation = ""

    return explanation, list(operations)


def validate_operations(
    operations: list[Operation],
    existing_nodes: dict[str, str],
    existing_edges: dict[str, tuple[str, str]],
) -> ValidationResult:
    """Validate operations against existing graph state.

    Checks for:
    - References to non-existent nodes in edges
    - Duplicate node names when adding
    - References to non-existent nodes/edges for update/delete
    - Duplicate edge connections

    Args:
        operations: List of operations to validate.
        existing_nodes: Dict mapping node ID/name to node ID.
        existing_edges: Dict mapping edge ID to (source_id, target_id).

    Returns:
        ValidationResult with valid=True if all operations are valid,
        or valid=False with list of errors.
    """
    errors: list[ValidationError] = []

    # Track nodes/edges that will be added by previous operations in the list
    pending_nodes: set[str] = set()
    pending_deleted_nodes: set[str] = set()
    pending_deleted_edges: set[str] = set()

    for i, op in enumerate(operations):
        op_type = op.op

        if op_type == "add_node":
            # Check for duplicate name
            node_name = op.node.name
            if node_name in existing_nodes and node_name not in pending_deleted_nodes:
                errors.append(
                    ValidationError(
                        operation_index=i,
                        operation_type=op_type,
                        field="node.name",
                        message=f"Node with name '{node_name}' already exists",
                    )
                )
            elif node_name in pending_nodes:
                errors.append(
                    ValidationError(
                        operation_index=i,
                        operation_type=op_type,
                        field="node.name",
                        message=f"Node with name '{node_name}' is already being added by a previous operation",
                    )
                )
            else:
                pending_nodes.add(node_name)

        elif op_type == "update_node":
            node_id = op.node_id
            node_exists = (
                node_id in existing_nodes or node_id in pending_nodes
            ) and node_id not in pending_deleted_nodes

            if not node_exists:
                errors.append(
                    ValidationError(
                        operation_index=i,
                        operation_type=op_type,
                        field="node_id",
                        message=f"Node '{node_id}' does not exist",
                    )
                )

        elif op_type == "delete_node":
            node_id = op.node_id
            node_exists = (
                node_id in existing_nodes or node_id in pending_nodes
            ) and node_id not in pending_deleted_nodes

            if not node_exists:
                errors.append(
                    ValidationError(
                        operation_index=i,
                        operation_type=op_type,
                        field="node_id",
                        message=f"Node '{node_id}' does not exist",
                    )
                )
            else:
                pending_deleted_nodes.add(node_id)

        elif op_type == "add_edge":
            source = op.edge.source
            target = op.edge.target

            # Check source exists
            source_exists = (
                source in existing_nodes or source in pending_nodes
            ) and source not in pending_deleted_nodes

            if not source_exists:
                errors.append(
                    ValidationError(
                        operation_index=i,
                        operation_type=op_type,
                        field="edge.source",
                        message=f"Source node '{source}' does not exist",
                    )
                )

            # Check target exists
            target_exists = (
                target in existing_nodes or target in pending_nodes
            ) and target not in pending_deleted_nodes

            if not target_exists:
                errors.append(
                    ValidationError(
                        operation_index=i,
                        operation_type=op_type,
                        field="edge.target",
                        message=f"Target node '{target}' does not exist",
                    )
                )

        elif op_type == "update_edge":
            edge_id = op.edge_id
            edge_exists = (
                edge_id in existing_edges and edge_id not in pending_deleted_edges
            )

            if not edge_exists:
                errors.append(
                    ValidationError(
                        operation_index=i,
                        operation_type=op_type,
                        field="edge_id",
                        message=f"Edge '{edge_id}' does not exist",
                    )
                )

        elif op_type == "delete_edge":
            edge_id = op.edge_id
            edge_exists = (
                edge_id in existing_edges and edge_id not in pending_deleted_edges
            )

            if not edge_exists:
                errors.append(
                    ValidationError(
                        operation_index=i,
                        operation_type=op_type,
                        field="edge_id",
                        message=f"Edge '{edge_id}' does not exist",
                    )
                )
            else:
                pending_deleted_edges.add(edge_id)

    return ValidationResult(valid=len(errors) == 0, errors=errors)
