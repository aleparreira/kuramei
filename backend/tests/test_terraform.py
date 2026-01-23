"""Tests for Terraform generation service."""

from src.terraform.mappings import get_template_for_type, has_terraform_resource
from src.terraform.schemas import TerraformEdge, TerraformNode
from src.terraform.service import TerraformGenerator


class TestSanitizeName:
    """Tests for the name sanitization function."""

    def test_simple_name(self):
        """Test simple name sanitization."""
        generator = TerraformGenerator()
        assert generator._sanitize_name("Order Service") == "order_service"

    def test_name_with_special_chars(self):
        """Test name with special characters."""
        generator = TerraformGenerator()
        assert generator._sanitize_name("My-API-Gateway!") == "my_api_gateway"

    def test_name_starting_with_number(self):
        """Test name starting with a number."""
        generator = TerraformGenerator()
        assert generator._sanitize_name("3tier-app") == "_3tier_app"

    def test_empty_name(self):
        """Test empty name."""
        generator = TerraformGenerator()
        assert generator._sanitize_name("") == "unnamed"

    def test_only_special_chars(self):
        """Test name with only special characters."""
        generator = TerraformGenerator()
        assert generator._sanitize_name("!@#$%") == "unnamed"


class TestMappings:
    """Tests for node type mappings."""

    def test_vpc_has_template(self):
        """Test VPC has a template."""
        assert get_template_for_type("vpc") == "vpc.tf.j2"

    def test_service_has_template(self):
        """Test service has a template."""
        assert get_template_for_type("service") == "ecs_service.tf.j2"

    def test_external_system_no_template(self):
        """Test external_system has no template."""
        assert get_template_for_type("external_system") is None

    def test_unknown_type_no_template(self):
        """Test unknown type has no template."""
        assert get_template_for_type("unknown_type") is None

    def test_has_terraform_resource_true(self):
        """Test has_terraform_resource returns True for valid types."""
        assert has_terraform_resource("vpc") is True
        assert has_terraform_resource("service") is True
        assert has_terraform_resource("database") is True

    def test_has_terraform_resource_false(self):
        """Test has_terraform_resource returns False for invalid types."""
        assert has_terraform_resource("external_system") is False
        assert has_terraform_resource("system") is False


class TestTerraformGenerator:
    """Tests for the TerraformGenerator service."""

    def test_generate_provider(self):
        """Test provider.tf generation."""
        generator = TerraformGenerator()
        result = generator.generate(nodes=[], region="us-west-2")

        # Should have provider.tf
        provider_file = next(
            (f for f in result.files if f.filename == "provider.tf"),
            None
        )
        assert provider_file is not None
        assert 'region = "us-west-2"' in provider_file.content
        assert "hashicorp/aws" in provider_file.content

    def test_generate_vpc(self):
        """Test VPC resource generation."""
        generator = TerraformGenerator()
        node = TerraformNode(
            id="vpc-1",
            name="Main VPC",
            type="vpc",
            description="Main VPC for the application",
            properties={"cidr_block": "10.0.0.0/16"},
        )
        result = generator.generate(nodes=[node])

        vpc_file = next(
            (f for f in result.files if f.filename == "main_vpc.tf"),
            None
        )
        assert vpc_file is not None
        assert "aws_vpc" in vpc_file.content
        assert "10.0.0.0/16" in vpc_file.content
        assert "Main VPC" in vpc_file.content

    def test_generate_service(self):
        """Test ECS service generation."""
        generator = TerraformGenerator()
        node = TerraformNode(
            id="svc-1",
            name="Order Service",
            type="service",
            description="Handles order processing",
            properties={
                "cpu": 512,
                "memory": 1024,
                "container_port": 8080,
            },
        )
        result = generator.generate(nodes=[node])

        svc_file = next(
            (f for f in result.files if f.filename == "order_service.tf"),
            None
        )
        assert svc_file is not None
        assert "aws_ecs_service" in svc_file.content
        assert "aws_ecs_task_definition" in svc_file.content
        assert "512" in svc_file.content  # CPU
        assert "1024" in svc_file.content  # Memory

    def test_generate_database(self):
        """Test RDS database generation."""
        generator = TerraformGenerator()
        node = TerraformNode(
            id="db-1",
            name="Orders DB",
            type="database",
            properties={
                "engine": "postgres",
                "engine_version": "15",
                "instance_class": "db.t3.small",
            },
        )
        result = generator.generate(nodes=[node])

        db_file = next(
            (f for f in result.files if f.filename == "orders_db.tf"),
            None
        )
        assert db_file is not None
        assert "aws_db_instance" in db_file.content
        assert "postgres" in db_file.content
        assert "db.t3.small" in db_file.content

    def test_generate_queue(self):
        """Test SQS queue generation."""
        generator = TerraformGenerator()
        node = TerraformNode(
            id="queue-1",
            name="Order Queue",
            type="queue",
            properties={"fifo": True},
        )
        result = generator.generate(nodes=[node])

        queue_file = next(
            (f for f in result.files if f.filename == "order_queue.tf"),
            None
        )
        assert queue_file is not None
        assert "aws_sqs_queue" in queue_file.content
        assert ".fifo" in queue_file.content

    def test_generate_bucket(self):
        """Test S3 bucket generation."""
        generator = TerraformGenerator()
        node = TerraformNode(
            id="bucket-1",
            name="Assets Bucket",
            type="bucket",
            properties={"versioning": True},
        )
        result = generator.generate(nodes=[node])

        bucket_file = next(
            (f for f in result.files if f.filename == "assets_bucket.tf"),
            None
        )
        assert bucket_file is not None
        assert "aws_s3_bucket" in bucket_file.content
        assert "aws_s3_bucket_versioning" in bucket_file.content

    def test_generate_function(self):
        """Test Lambda function generation."""
        generator = TerraformGenerator()
        node = TerraformNode(
            id="func-1",
            name="Process Order",
            type="function",
            properties={
                "runtime": "python3.11",
                "memory_size": 512,
            },
        )
        result = generator.generate(nodes=[node])

        func_file = next(
            (f for f in result.files if f.filename == "process_order.tf"),
            None
        )
        assert func_file is not None
        assert "aws_lambda_function" in func_file.content
        assert "python3.11" in func_file.content
        assert "512" in func_file.content

    def test_generate_gateway(self):
        """Test ALB generation."""
        generator = TerraformGenerator()
        node = TerraformNode(
            id="gw-1",
            name="API Gateway",
            type="gateway",
        )
        result = generator.generate(nodes=[node])

        gw_file = next(
            (f for f in result.files if f.filename == "api_gateway.tf"),
            None
        )
        assert gw_file is not None
        assert "aws_lb" in gw_file.content
        assert "aws_lb_listener" in gw_file.content
        assert 'load_balancer_type = "application"' in gw_file.content

    def test_generate_external_system(self):
        """Test external system generates a comment placeholder."""
        generator = TerraformGenerator()
        node = TerraformNode(
            id="ext-1",
            name="Payment Gateway",
            type="external_system",
        )
        result = generator.generate(nodes=[node])

        ext_file = next(
            (f for f in result.files if f.filename == "payment_gateway_external.tf"),
            None
        )
        assert ext_file is not None
        assert "External System" in ext_file.content
        assert "Payment Gateway" in ext_file.content

    def test_generate_unknown_type_warning(self):
        """Test unknown node type generates a warning."""
        generator = TerraformGenerator()
        node = TerraformNode(
            id="unknown-1",
            name="Unknown Thing",
            type="system",  # No template for 'system'
        )
        result = generator.generate(nodes=[node])

        assert len(result.warnings) > 0
        assert "Unknown Thing" in result.warnings[0]
        assert "system" in result.warnings[0]

    def test_generate_outputs(self):
        """Test outputs.tf generation."""
        generator = TerraformGenerator()
        nodes = [
            TerraformNode(id="vpc-1", name="Main VPC", type="vpc"),
            TerraformNode(id="db-1", name="Orders DB", type="database"),
        ]
        result = generator.generate(nodes=nodes)

        outputs_file = next(
            (f for f in result.files if f.filename == "outputs.tf"),
            None
        )
        assert outputs_file is not None
        assert "main_vpc_vpc_id" in outputs_file.content
        assert "orders_db_endpoint" in outputs_file.content

    def test_generate_multiple_nodes(self):
        """Test generating multiple nodes of different types."""
        generator = TerraformGenerator()
        nodes = [
            TerraformNode(id="vpc-1", name="Main VPC", type="vpc"),
            TerraformNode(id="subnet-1", name="Public Subnet", type="subnet"),
            TerraformNode(id="svc-1", name="API Service", type="service"),
            TerraformNode(id="db-1", name="Main Database", type="database"),
            TerraformNode(id="queue-1", name="Events Queue", type="queue"),
        ]
        result = generator.generate(nodes=nodes)

        # Should have: provider.tf, outputs.tf, + 5 resource files
        assert len(result.files) == 7
        assert len(result.warnings) == 0

        filenames = [f.filename for f in result.files]
        assert "provider.tf" in filenames
        assert "outputs.tf" in filenames
        assert "main_vpc.tf" in filenames
        assert "public_subnet.tf" in filenames
        assert "api_service.tf" in filenames
        assert "main_database.tf" in filenames
        assert "events_queue.tf" in filenames

    def test_generate_with_edges(self):
        """Test generation with edges (edges are passed but templates handle them)."""
        generator = TerraformGenerator()
        nodes = [
            TerraformNode(id="svc-1", name="Service A", type="service"),
            TerraformNode(id="db-1", name="Database", type="database"),
        ]
        edges = [
            TerraformEdge(
                id="edge-1",
                type="reads",
                source_node_id="svc-1",
                target_node_id="db-1",
            ),
        ]
        result = generator.generate(nodes=nodes, edges=edges)

        # Should generate without errors
        assert len(result.warnings) == 0
        assert any(f.filename == "service_a.tf" for f in result.files)
        assert any(f.filename == "database.tf" for f in result.files)


class TestHCLValidity:
    """Tests for HCL syntax validity."""

    def test_valid_hcl_structure(self):
        """Test that generated HCL has valid structure."""
        generator = TerraformGenerator()
        node = TerraformNode(
            id="vpc-1",
            name="Test VPC",
            type="vpc",
        )
        result = generator.generate(nodes=[node])

        vpc_file = next(
            (f for f in result.files if f.filename == "test_vpc.tf"),
            None
        )
        content = vpc_file.content

        # Basic HCL structure checks
        assert content.count("{") == content.count("}")
        assert "resource" in content
        assert '"aws_vpc"' in content

    def test_no_duplicate_data_sources(self):
        """Test that shared data sources are handled correctly.

        Note: Currently each template may include its own data sources.
        This is acceptable for independent files but may need deduplication
        if files are combined.
        """
        generator = TerraformGenerator()
        nodes = [
            TerraformNode(id="s1", name="Service One", type="service"),
            TerraformNode(id="s2", name="Service Two", type="service"),
        ]
        result = generator.generate(nodes=nodes)

        # Both files will have data.aws_region, which is fine for separate files
        assert len(result.files) == 4  # provider, outputs, 2 services
