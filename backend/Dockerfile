FROM python:3.12-slim

WORKDIR /app

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies into .venv as root, then fix ownership
RUN uv sync --frozen --no-dev && chown -R nobody:nogroup /app

# Copy application code
COPY --chown=nobody:nogroup . .

# Expose port
EXPOSE 8000

# Run as non-root for security
USER nobody

# Call uvicorn directly from the venv — avoids uv re-syncing at runtime
CMD ["/app/.venv/bin/uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
