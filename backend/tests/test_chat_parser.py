"""Tests for chat operations parser and validator."""


from src.chat import (
    AddEdgeOp,
    AddNodeOp,
    DeleteEdgeOp,
    DeleteNodeOp,
    EdgeSpec,
    NodeSpec,
    UpdateEdgeOp,
    UpdateNodeOp,
)
from src.chat.parser import extract_json_block, parse_operations, validate_operations


class TestExtractJsonBlock:
    """Tests for extract_json_block function."""

    def test_extracts_json_from_markdown_block(self):
        """Should extract JSON from markdown code block."""
        text = '''Here's the plan:

```json
{"operations": [{"op": "add_node", "node": {"type": "service", "name": "API"}}]}
```

That's it!'''
        result = extract_json_block(text)
        assert result is not None
        assert '"operations"' in result
        assert '"add_node"' in result

    def test_extracts_json_from_bare_markdown_block(self):
        """Should extract JSON from bare code block (no language specifier)."""
        text = '''Here's the plan:

```
{"operations": []}
```'''
        result = extract_json_block(text)
        assert result == '{"operations": []}'

    def test_extracts_raw_json(self):
        """Should extract raw JSON when no code block present."""
        text = '{"operations": [{"op": "add_node", "node": {"type": "service", "name": "API"}}]}'
        result = extract_json_block(text)
        assert result is not None
        assert '"operations"' in result

    def test_extracts_raw_json_with_leading_text(self):
        """Should extract raw JSON after explanation text."""
        text = '''I'll add a service.
{"operations": [{"op": "add_node", "node": {"type": "service", "name": "API"}}]}'''
        result = extract_json_block(text)
        assert result is not None
        assert '"operations"' in result

    def test_returns_none_for_no_json(self):
        """Should return None when no JSON found."""
        text = "This is just a plain explanation with no JSON."
        result = extract_json_block(text)
        assert result is None

    def test_returns_none_for_empty_text(self):
        """Should return None for empty string."""
        assert extract_json_block("") is None
        assert extract_json_block(None) is None  # type: ignore

    def test_handles_nested_braces(self):
        """Should handle nested braces in JSON correctly."""
        text = '{"operations": [{"op": "add_node", "node": {"type": "service", "name": "API", "properties": {"config": {"key": "value"}}}}]}'
        result = extract_json_block(text)
        assert result is not None
        # Verify it parses as valid JSON
        import json

        parsed = json.loads(result)
        assert "operations" in parsed

    def test_handles_strings_with_braces(self):
        """Should handle strings containing braces."""
        text = '{"message": "Use { and } for templates"}'
        result = extract_json_block(text)
        assert result is not None
        import json

        parsed = json.loads(result)
        assert parsed["message"] == "Use { and } for templates"


class TestParseOperations:
    """Tests for parse_operations function."""

    def test_parses_add_node_operation(self):
        """Should parse add_node operation correctly."""
        response = '''I'll add an API Gateway service.

```json
{
  "operations": [
    {"op": "add_node", "node": {"type": "service", "name": "API Gateway"}}
  ]
}
```'''
        explanation, ops = parse_operations(response)

        assert "API Gateway" in explanation
        assert len(ops) == 1
        assert isinstance(ops[0], AddNodeOp)
        assert ops[0].node.type == "service"
        assert ops[0].node.name == "API Gateway"

    def test_parses_add_edge_operation(self):
        """Should parse add_edge operation correctly."""
        response = '''```json
{
  "operations": [
    {"op": "add_edge", "edge": {"source": "API", "target": "DB", "type": "reads", "label": "queries"}}
  ]
}
```'''
        explanation, ops = parse_operations(response)

        assert len(ops) == 1
        assert isinstance(ops[0], AddEdgeOp)
        assert ops[0].edge.source == "API"
        assert ops[0].edge.target == "DB"
        assert ops[0].edge.type == "reads"
        assert ops[0].edge.label == "queries"

    def test_parses_update_node_operation(self):
        """Should parse update_node operation correctly."""
        response = '''```json
{
  "operations": [
    {"op": "update_node", "node_id": "api-123", "updates": {"name": "New API", "description": "Updated"}}
  ]
}
```'''
        _, ops = parse_operations(response)

        assert len(ops) == 1
        assert isinstance(ops[0], UpdateNodeOp)
        assert ops[0].node_id == "api-123"
        assert ops[0].updates["name"] == "New API"

    def test_parses_delete_node_operation(self):
        """Should parse delete_node operation correctly."""
        response = '''```json
{
  "operations": [
    {"op": "delete_node", "node_id": "api-123"}
  ]
}
```'''
        _, ops = parse_operations(response)

        assert len(ops) == 1
        assert isinstance(ops[0], DeleteNodeOp)
        assert ops[0].node_id == "api-123"

    def test_parses_update_edge_operation(self):
        """Should parse update_edge operation correctly."""
        response = '''```json
{
  "operations": [
    {"op": "update_edge", "edge_id": "edge-123", "updates": {"label": "new label"}}
  ]
}
```'''
        _, ops = parse_operations(response)

        assert len(ops) == 1
        assert isinstance(ops[0], UpdateEdgeOp)
        assert ops[0].edge_id == "edge-123"

    def test_parses_delete_edge_operation(self):
        """Should parse delete_edge operation correctly."""
        response = '''```json
{
  "operations": [
    {"op": "delete_edge", "edge_id": "edge-123"}
  ]
}
```'''
        _, ops = parse_operations(response)

        assert len(ops) == 1
        assert isinstance(ops[0], DeleteEdgeOp)
        assert ops[0].edge_id == "edge-123"

    def test_parses_multiple_operations(self):
        """Should parse multiple operations in order."""
        response = '''```json
{
  "operations": [
    {"op": "add_node", "node": {"type": "service", "name": "API"}},
    {"op": "add_node", "node": {"type": "database", "name": "DB"}},
    {"op": "add_edge", "edge": {"source": "API", "target": "DB"}}
  ]
}
```'''
        _, ops = parse_operations(response)

        assert len(ops) == 3
        assert isinstance(ops[0], AddNodeOp)
        assert isinstance(ops[1], AddNodeOp)
        assert isinstance(ops[2], AddEdgeOp)

    def test_returns_empty_list_for_no_operations(self):
        """Should return empty list when no operations present."""
        response = "This is just an explanation with no changes needed."
        explanation, ops = parse_operations(response)

        assert explanation == response
        assert ops == []

    def test_returns_empty_list_for_empty_response(self):
        """Should return empty list for empty response."""
        explanation, ops = parse_operations("")

        assert explanation == ""
        assert ops == []

    def test_returns_empty_list_for_invalid_json(self):
        """Should return empty list when JSON is invalid."""
        response = '''```json
{this is not valid json}
```'''
        explanation, ops = parse_operations(response)

        assert ops == []
        # Explanation should be the full original text
        assert len(explanation) > 0

    def test_returns_empty_list_for_invalid_operations(self):
        """Should return empty list when operations don't match schema."""
        response = '''```json
{
  "operations": [
    {"op": "invalid_op", "data": "something"}
  ]
}
```'''
        _, ops = parse_operations(response)

        assert ops == []

    def test_extracts_explanation_before_json_block(self):
        """Should extract explanation text before JSON block."""
        response = '''I'll create a new service and connect it to the database.

```json
{
  "operations": [
    {"op": "add_node", "node": {"type": "service", "name": "API"}}
  ]
}
```'''
        explanation, _ = parse_operations(response)

        assert "I'll create a new service" in explanation
        assert "```" not in explanation
        assert "operations" not in explanation


class TestValidateOperations:
    """Tests for validate_operations function."""

    def test_valid_add_node_to_empty_graph(self):
        """Should validate adding node to empty graph."""
        ops = [AddNodeOp(op="add_node", node=NodeSpec(type="service", name="API"))]
        result = validate_operations(ops, {}, {})

        assert result.valid is True
        assert result.errors == []

    def test_invalid_add_duplicate_node(self):
        """Should reject adding node with existing name."""
        ops = [AddNodeOp(op="add_node", node=NodeSpec(type="service", name="API"))]
        existing_nodes = {"API": "node-123"}

        result = validate_operations(ops, existing_nodes, {})

        assert result.valid is False
        assert len(result.errors) == 1
        assert result.errors[0].field == "node.name"
        assert "already exists" in result.errors[0].message

    def test_invalid_add_duplicate_node_in_same_batch(self):
        """Should reject adding same node twice in one batch."""
        ops = [
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="API")),
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="API")),
        ]

        result = validate_operations(ops, {}, {})

        assert result.valid is False
        assert len(result.errors) == 1
        assert result.errors[0].operation_index == 1

    def test_valid_add_edge_between_existing_nodes(self):
        """Should validate adding edge between existing nodes."""
        ops = [
            AddEdgeOp(
                op="add_edge",
                edge=EdgeSpec(source="API", target="DB"),
            )
        ]
        existing_nodes = {"API": "node-1", "DB": "node-2"}

        result = validate_operations(ops, existing_nodes, {})

        assert result.valid is True

    def test_valid_add_edge_between_pending_nodes(self):
        """Should validate adding edge between nodes being added in same batch."""
        ops = [
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="API")),
            AddNodeOp(op="add_node", node=NodeSpec(type="database", name="DB")),
            AddEdgeOp(op="add_edge", edge=EdgeSpec(source="API", target="DB")),
        ]

        result = validate_operations(ops, {}, {})

        assert result.valid is True

    def test_invalid_add_edge_missing_source(self):
        """Should reject adding edge with non-existent source."""
        ops = [
            AddEdgeOp(op="add_edge", edge=EdgeSpec(source="API", target="DB")),
        ]
        existing_nodes = {"DB": "node-2"}

        result = validate_operations(ops, existing_nodes, {})

        assert result.valid is False
        assert any("source" in e.field.lower() for e in result.errors)

    def test_invalid_add_edge_missing_target(self):
        """Should reject adding edge with non-existent target."""
        ops = [
            AddEdgeOp(op="add_edge", edge=EdgeSpec(source="API", target="DB")),
        ]
        existing_nodes = {"API": "node-1"}

        result = validate_operations(ops, existing_nodes, {})

        assert result.valid is False
        assert any("target" in e.field.lower() for e in result.errors)

    def test_valid_update_existing_node(self):
        """Should validate updating existing node."""
        ops = [
            UpdateNodeOp(
                op="update_node", node_id="API", updates={"description": "New desc"}
            )
        ]
        existing_nodes = {"API": "node-1"}

        result = validate_operations(ops, existing_nodes, {})

        assert result.valid is True

    def test_invalid_update_nonexistent_node(self):
        """Should reject updating non-existent node."""
        ops = [
            UpdateNodeOp(
                op="update_node", node_id="API", updates={"description": "New desc"}
            )
        ]

        result = validate_operations(ops, {}, {})

        assert result.valid is False
        assert result.errors[0].field == "node_id"

    def test_valid_delete_existing_node(self):
        """Should validate deleting existing node."""
        ops = [DeleteNodeOp(op="delete_node", node_id="API")]
        existing_nodes = {"API": "node-1"}

        result = validate_operations(ops, existing_nodes, {})

        assert result.valid is True

    def test_invalid_delete_nonexistent_node(self):
        """Should reject deleting non-existent node."""
        ops = [DeleteNodeOp(op="delete_node", node_id="API")]

        result = validate_operations(ops, {}, {})

        assert result.valid is False

    def test_invalid_add_edge_to_deleted_node(self):
        """Should reject adding edge to node being deleted in same batch."""
        ops = [
            DeleteNodeOp(op="delete_node", node_id="API"),
            AddEdgeOp(op="add_edge", edge=EdgeSpec(source="API", target="DB")),
        ]
        existing_nodes = {"API": "node-1", "DB": "node-2"}

        result = validate_operations(ops, existing_nodes, {})

        assert result.valid is False
        assert any("source" in e.field.lower() for e in result.errors)

    def test_valid_update_existing_edge(self):
        """Should validate updating existing edge."""
        ops = [
            UpdateEdgeOp(op="update_edge", edge_id="edge-1", updates={"label": "new"})
        ]
        existing_edges = {"edge-1": ("node-1", "node-2")}

        result = validate_operations(ops, {}, existing_edges)

        assert result.valid is True

    def test_invalid_update_nonexistent_edge(self):
        """Should reject updating non-existent edge."""
        ops = [
            UpdateEdgeOp(op="update_edge", edge_id="edge-1", updates={"label": "new"})
        ]

        result = validate_operations(ops, {}, {})

        assert result.valid is False

    def test_valid_delete_existing_edge(self):
        """Should validate deleting existing edge."""
        ops = [DeleteEdgeOp(op="delete_edge", edge_id="edge-1")]
        existing_edges = {"edge-1": ("node-1", "node-2")}

        result = validate_operations(ops, {}, existing_edges)

        assert result.valid is True

    def test_invalid_delete_nonexistent_edge(self):
        """Should reject deleting non-existent edge."""
        ops = [DeleteEdgeOp(op="delete_edge", edge_id="edge-1")]

        result = validate_operations(ops, {}, {})

        assert result.valid is False

    def test_invalid_update_deleted_edge(self):
        """Should reject updating edge being deleted in same batch."""
        ops = [
            DeleteEdgeOp(op="delete_edge", edge_id="edge-1"),
            UpdateEdgeOp(op="update_edge", edge_id="edge-1", updates={"label": "new"}),
        ]
        existing_edges = {"edge-1": ("node-1", "node-2")}

        result = validate_operations(ops, {}, existing_edges)

        assert result.valid is False
        assert result.errors[0].operation_index == 1

    def test_multiple_errors_collected(self):
        """Should collect all errors, not stop at first."""
        ops = [
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="API")),
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="API")),
            AddEdgeOp(
                op="add_edge", edge=EdgeSpec(source="NonExistent", target="API")
            ),
            DeleteNodeOp(op="delete_node", node_id="AlsoNonExistent"),
        ]

        result = validate_operations(ops, {}, {})

        assert result.valid is False
        # Should have errors for: duplicate node, missing source, missing node_id
        assert len(result.errors) >= 3

    def test_can_add_node_after_deleting_same_name(self):
        """Should allow adding node with name that was just deleted."""
        ops = [
            DeleteNodeOp(op="delete_node", node_id="API"),
            AddNodeOp(op="add_node", node=NodeSpec(type="service", name="API")),
        ]
        existing_nodes = {"API": "node-1"}

        result = validate_operations(ops, existing_nodes, {})

        assert result.valid is True
