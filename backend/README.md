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

- `GET /health` - Health check
- `GET /projects` - List projects
- `POST /projects` - Create project
- `GET /projects/{id}` - Get project
- `PUT /projects/{id}` - Update project
- `DELETE /projects/{id}` - Delete project
- `GET /models` - List models (filter by `?project_id=`)
- `POST /models` - Create model
- `GET /models/{id}` - Get model
- `PUT /models/{id}` - Update model
- `DELETE /models/{id}` - Delete model

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
