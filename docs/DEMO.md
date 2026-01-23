# Kuramei Demo Guide

This guide walks you through testing the Kuramei AI Architecture Platform using a pre-configured demo project.

## Quick Start

```bash
# 1. Seed demo data (run from project root)
cd backend && source .venv/bin/activate && python scripts/seed_demo.py

# 2. Start backend (keep terminal open)
uvicorn src.main:app --reload

# 3. Start frontend (new terminal, from project root)
cd frontend && pnpm dev
```

Open http://localhost:5173 in your browser to see the demo.

## What You'll See

The demo creates a "SaaS Startup Architecture" project with 5 nodes and 4 edges representing a typical microservices setup:

```
API Gateway ──calls──> Order Service
                            │
                      ┌─────┴─────┐
                      │           │
                reads/writes   publishes
                      │           │
                      v           v
                PostgreSQL    RabbitMQ
                      │
                 reads│
                      v
                Redis Cache
```

### Demo Components

| Node | Type | Description |
|------|------|-------------|
| API Gateway | gateway | Entry point for all client requests |
| Order Service | service | Handles order creation, updates, queries |
| PostgreSQL | database | Primary data persistence |
| RabbitMQ | queue | Message broker for async events |
| Redis Cache | database | In-memory cache for fast lookups |

## Testing the Chat

When the chat panel is empty, you'll see **4 clickable prompt suggestions**. Click any of them to fill the input field, then press Enter or click Send.

### Suggested Prompts

| Prompt | What It Tests | Expected Result |
|--------|---------------|-----------------|
| "Adicione um servico de autenticacao" | add_node | New Auth Service node appears on canvas |
| "Conecte o Redis Cache ao API Gateway" | add_edge | New edge connecting Redis to API Gateway |
| "Qual e o ponto unico de falha?" | analysis | AI explains that API Gateway is SPOF |
| "Adicione um load balancer" | add_node | New Load Balancer node appears |

### Additional Test Prompts

Try these prompts to test other operations:

| Prompt | Operation | Expected Result |
|--------|-----------|-----------------|
| "Renomeie Order Service para Orders API" | update_node | Node label changes to "Orders API" |
| "Remova o RabbitMQ" | delete_node | RabbitMQ node and its edges are removed |
| "Adicione conexao do PostgreSQL para Redis" | add_edge | New edge from PostgreSQL to Redis Cache |
| "Qual servico tem mais conexoes?" | analysis | AI analyzes the graph and identifies Order Service |
| "Mude o tipo do Redis para cache" | update_node | Node type property updates |

## Features Demonstrated

- [x] **Project creation** - Demo project with description, cloud config (AWS), IaC tool (Terraform)
- [x] **Model management** - Versioned model with viewport state
- [x] **Node types** - gateway, service, database, queue
- [x] **Edge types** - calls, reads, publishes
- [x] **Node positioning** - Logical layout on canvas
- [x] **Node properties** - Custom metadata (protocol, runtime, replicas, etc.)
- [x] **Chat interface** - Full-width panel with prompt suggestions
- [x] **AI operations** - add_node, update_node, delete_node, add_edge, delete_edge
- [x] **Streaming responses** - Real-time AI response display

## Troubleshooting

### "Demo project already exists"

The seed script is idempotent. If you see this message, the demo was already created. You can:

1. Continue using the existing demo
2. Reset the database: `rm backend/kuramei.db` and re-run seed

### Backend connection errors

Check that:
- Backend is running on port 8000
- `.env` file exists in `backend/` with required variables
- Virtual environment is activated

### Frontend not loading

Check that:
- Frontend dev server is running on port 5173
- `pnpm install` was run in `frontend/`

## Resetting the Demo

To start fresh:

```bash
# Remove database
rm backend/kuramei.db

# Re-seed
cd backend && source .venv/bin/activate && python scripts/seed_demo.py
```

The seed script uses deterministic UUIDs, so re-seeding always creates identical data.
