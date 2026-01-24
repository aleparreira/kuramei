# Backend Dockerfile for development
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (curl for healthcheck)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install uv for faster dependency installation
RUN pip install uv

# Copy dependency files
COPY requirements.txt ./

# Install dependencies
RUN uv pip install --system -r requirements.txt

# Copy source code (will be overridden by volume in dev)
COPY . .

# Create data directory for SQLite
RUN mkdir -p data

# Expose port
EXPOSE 8000

# Run migrations and start server
CMD ["sh", "-c", "alembic upgrade head && uvicorn src.main:app --reload --host 0.0.0.0 --port 8000"]
