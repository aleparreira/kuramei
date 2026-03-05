# Kuramei Lens Node Types

This document describes the node types available in the Kuramei Lens metamodel.

## Overview

Kuramei Lens uses a graph-based metamodel to represent various infrastructure and service components. Each node type has specific semantics and use cases.

## Supported Node Types

### 1. Service

**Description**: Represents a microservice, API, or background worker.

**When to Use**:
- REST APIs
- gRPC services
- Message queue consumers
- Serverless functions

**Example**:
```json
{
  "id": "user-service",
  "type": "service",
  "config": {
    "port": 8080,
    "protocol": "http"
  }
}
```

**Icon**: 🔧

---

### 2. Database

**Description**: Represents a data storage system.

**When to Use**:
- Relational databases (PostgreSQL, MySQL)
- NoSQL databases (MongoDB, DynamoDB)
- In-memory stores (Redis)

**Example**:
```json
{
  "id": "users-db",
  "type": "database",
  "config": {
    "engine": "postgresql",
    "version": "14"
  }
}
```

**Icon**: 🗄️

---

### 3. Queue

**Description**: Represents a message queue or event bus.

**When to Use**:
- Message brokers (RabbitMQ, Kafka)
- Task queues (Celery, Bull)
- Event streaming (AWS Kinesis)

**Example**:
```json
{
  "id": "events-queue",
  "type": "queue",
  "config": {
    "broker": "rabbitmq",
    "durable": true
  }
}
```

**Icon**: 📬

---

### 4. Cache

**Description**: Represents a caching layer.

**When to Use**:
- Session storage
- Query result caching
- Rate limiting counters

**Example**:
```json
{
  "id": "session-cache",
  "type": "cache",
  "config": {
    "engine": "redis",
    "ttl": 3600
  }
}
```

**Icon**: ⚡

---

### 5. Gateway

**Description**: Represents an API gateway or load balancer.

**When to Use**:
- API Gateway (Kong, AWS API Gateway)
- Load Balancer (ALB, NGINX)
- Reverse Proxy

**Example**:
```json
{
  "id": "api-gateway",
  "type": "gateway",
  "config": {
    "routes": [
      {
        "path": "/api/v1",
        "target": "user-service:8080"
      }
    ]
  }
}
```

**Icon**: 🚪

---

### 6. Storage

**Description**: Represents object or file storage.

**When to Use**:
- S3-compatible storage
- File systems
- CDNs

**Example**:
```json
{
  "id": "assets-storage",
  "type": "storage",
  "config": {
    "provider": "s3",
    "bucket": "my-assets"
  }
}
```

**Icon**: 📦

---

### 7. External

**Description**: Represents an external service or third-party API.

**When to Use**:
- Payment gateways (Stripe, PayPal)
- Authentication providers (Auth0, Cognito)
- External APIs

**Example**:
```json
{
  "id": "stripe-payments",
  "type": "external",
  "config": {
    "provider": "stripe",
    "apiVersion": "2023-10-16"
  }
}
```

**Icon**: 🌐

---

## Choosing the Right Node Type

| Use Case | Recommended Type |
|----------|------------------|
| Backend API | Service |
| Data storage | Database |
| Async processing | Queue |
| Performance optimization | Cache |
| Request routing | Gateway |
| File handling | Storage |
| Third-party integration | External |

## Extending Node Types

You can create custom node types by extending the base node schema:

```typescript
interface CustomNode extends BaseNode {
  type: 'custom';
  config: CustomConfig;
}
```

---

*For more information, see the main documentation at [AGENTS.md](../AGENTS.md).*
