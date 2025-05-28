# Use specific Python version for reproducibility
FROM python:3.12-slim-bookworm as builder

# Copy uv from the official Docker image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set environment variables for build
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_SYSTEM_PYTHON=1

# Set working directory
WORKDIR /app

# Copy dependency files and README for package building
COPY pyproject.toml uv.lock README.md ./

# Install dependencies using uv
RUN uv sync --frozen --no-dev

# Production stage
FROM python:3.12-slim-bookworm

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH=/app \
    # Security: Don't run as root
    USER=appuser

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r ${USER} && useradd -r -g ${USER} ${USER} \
    && mkdir -p /app \
    && chown -R ${USER}:${USER} /app

# Set working directory
WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder --chown=${USER}:${USER} /app/.venv /app/.venv

# Copy application code
COPY --chown=${USER}:${USER} . .

# Switch to non-root user
USER ${USER}

# Expose the port the app runs on
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 