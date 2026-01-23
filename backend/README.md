# Kuramei Backend

Python + FastAPI backend for Kuramei AI Architecture Platform.

## Quick Start

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn src.main:app --reload --port 8000
```

## API Endpoints

All API endpoints are under `/api/v1` prefix.

### Health (root)
- `GET /health` - Health check

### Projects
- `GET /api/v1/projects` - List projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects/{id}` - Get project
- `PUT /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project
- `GET /api/v1/projects/{id}/models` - List models in project
- `POST /api/v1/projects/{id}/models` - Create model in project

### Models
- `GET /api/v1/models` - List models (filter by `?project_id=`)
- `POST /api/v1/models` - Create model
- `GET /api/v1/models/{id}` - Get model
- `PUT /api/v1/models/{id}` - Update model
- `DELETE /api/v1/models/{id}` - Delete model

### Graph (nodes + edges)
- `GET /api/v1/models/{id}/graph` - Get full graph `{nodes, edges, viewport}`
- `PUT /api/v1/models/{id}/graph` - Save full graph `{nodes, edges, viewport}`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./data/kuramei.db` | Database connection URL |
| `DEBUG` | `false` | Enable debug mode (SQL logging) |
| `CORS_ORIGINS` | `["http://localhost:3001"]` | Allowed CORS origins (JSON array) |

**Note**: `CORS_ORIGINS` must be a JSON array, e.g.: `CORS_ORIGINS='["http://localhost:3001","http://localhost:3000"]'`

## Development

```bash
# Install dev dependencies
pip install -r requirements.txt

# Run tests
pytest

# Lint
ruff check .
```
