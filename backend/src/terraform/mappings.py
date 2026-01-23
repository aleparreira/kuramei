"""Node type to AWS resource mappings for Terraform generation."""

# Node type -> Template filename mapping
NODE_TYPE_TEMPLATES: dict[str, str | None] = {
    "vpc": "vpc.tf.j2",
    "subnet": "subnet.tf.j2",
    "service": "ecs_service.tf.j2",
    "database": "rds.tf.j2",
    "queue": "sqs.tf.j2",
    "bucket": "s3.tf.j2",
    "function": "lambda.tf.j2",
    "gateway": "alb.tf.j2",
    # external_system is a placeholder (comment only)
    "external_system": None,
    # These types don't map directly to Terraform resources
    "system": None,
    "job": None,  # Could be ECS scheduled task, but deferred
    "ui": None,  # Frontend, not infrastructure
    "identity": None,  # IAM is complex, deferred
    "secret": None,  # Secrets Manager, deferred
}

# AWS resource type descriptions
AWS_RESOURCE_DESCRIPTIONS: dict[str, str] = {
    "vpc": "aws_vpc",
    "subnet": "aws_subnet",
    "service": "aws_ecs_service + aws_ecs_task_definition",
    "database": "aws_db_instance",
    "queue": "aws_sqs_queue",
    "bucket": "aws_s3_bucket",
    "function": "aws_lambda_function",
    "gateway": "aws_lb + aws_lb_listener",
}


def get_template_for_type(node_type: str) -> str | None:
    """Get the template filename for a node type.

    Args:
        node_type: The node type (e.g., 'vpc', 'service').

    Returns:
        Template filename or None if no template exists.
    """
    return NODE_TYPE_TEMPLATES.get(node_type)


def has_terraform_resource(node_type: str) -> bool:
    """Check if a node type has a corresponding Terraform resource.

    Args:
        node_type: The node type to check.

    Returns:
        True if the node type maps to a Terraform resource.
    """
    template = NODE_TYPE_TEMPLATES.get(node_type)
    return template is not None
