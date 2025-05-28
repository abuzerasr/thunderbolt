# Thunderbolt Backend

This repository contains the backend service for the Thunderbolt project. It is built using FastAPI and provides a unified proxy interface for accessing various APIs including OpenAI-compatible language models.

## Features

- Exposes OpenAI-compatible proxy endpoints at `/openai/*` for language model interactions
- Generic proxy system for external APIs with authentication handling
- Support for streaming responses (SSE) for chat completions
- CORS support for frontend integration
- Production-ready Docker deployment

## Installation

### Local Development

1. Install dependencies using uv:

```bash
uv sync
```

2. Create a `.env` file with your API keys:

```bash
DEEPINFRA_API_KEY=your_deepinfra_api_key
WEATHER_API_KEY=your_weather_api_key  # Optional
```

### Docker Deployment

#### Prerequisites

- Docker Engine 20.10+ or Docker Desktop
- Docker Compose (optional, for easier deployment)

#### Quick Start with Docker Compose

1. Clone the repository and navigate to the backend directory:

```bash
cd backend
```

2. Create a `.env` file with your API keys:

```bash
cp .env.example .env
# Edit .env with your actual API keys
```

3. Build and run with Docker Compose:

```bash
docker-compose up -d
```

The service will be available at `http://localhost:8000`.

#### Manual Docker Deployment

1. Build the Docker image:

```bash
docker build -t thunderbolt-backend:latest .
```

2. Run the container:

```bash
docker run -d \
  --name thunderbolt-backend \
  -p 8000:8000 \
  -e DEEPINFRA_API_KEY=your_deepinfra_api_key \
  -e WEATHER_API_KEY=your_weather_api_key \
  --restart unless-stopped \
  thunderbolt-backend:latest
```

#### Production Deployment Best Practices

1. **Use environment variables or secrets management**:

   - Never hardcode API keys in the Dockerfile
   - Use Docker secrets or environment variables from your orchestration platform

2. **Cloud-Native Deployment**:

   - **AWS Fargate**: Use Application Load Balancer (ALB) for SSL termination and load balancing
   - **Render.com**: Built-in SSL and load balancing included
   - **Other platforms**: Most cloud providers handle SSL/TLS and load balancing at the platform level

   Your application is already production-ready with Gunicorn + UvicornWorker - no additional reverse proxy needed!

3. **Resource limits**:

   - Adjust the resource limits in `docker-compose.yml` based on your needs
   - Monitor memory and CPU usage in production

4. **Logging**:

   ```bash
   # View logs
   docker logs thunderbolt-backend

   # Follow logs
   docker logs -f thunderbolt-backend
   ```

5. **Health monitoring**:
   - The container includes a health check endpoint at `/health`
   - Use monitoring tools to track the health status

## Running the Server

### Development Server

Start the development server:

```bash
uv run uvicorn backend.main:app --reload
```

### Production Server (without Docker)

For production without Docker, use multiple workers:

```bash
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4
```

The server will be available at `http://localhost:8000`.

## API Endpoints

1. **Health Check**: `GET /health`
2. **OpenAI-Compatible Proxy**: `/openai/*` - Proxies requests to DeepInfra's OpenAI-compatible API
3. **Generic Proxy**: `/proxy/*` - Configurable proxy for other external APIs

## OpenAI Proxy Usage

The OpenAI proxy at `/openai/*` provides transparent access to DeepInfra's language models using the OpenAI API format:

- `POST /openai/chat/completions` - Chat completions (supports streaming)
- `GET /openai/models` - List available models
- `POST /openai/completions` - Text completions
- `POST /openai/embeddings` - Generate embeddings

See `OPENAI_PROXY_README.md` for detailed usage examples.

## Docker Image Details

The Docker image is built using a multi-stage build process for optimal size and security:

- **Base image**: Python 3.12-slim-bookworm
- **Package manager**: uv (installed from official Docker image)
- **Security**: Runs as non-root user (appuser)
- **Health check**: Built-in health check endpoint
- **Size**: Optimized using multi-stage build
- **Production server**: Gunicorn with UvicornWorker for async support

### Building for Different Architectures

To build for ARM64 (e.g., Apple Silicon, AWS Graviton):

```bash
docker buildx build --platform linux/arm64 -t thunderbolt-backend:latest .
```

To build for multiple architectures:

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t thunderbolt-backend:latest .
```

## Troubleshooting

### Container won't start

1. Check logs: `docker logs thunderbolt-backend`
2. Verify environment variables are set correctly
3. Ensure port 8000 is not already in use

### Connection refused

1. Verify the container is running: `docker ps`
2. Check the health status: `docker inspect thunderbolt-backend | grep -A 5 Health`
3. Ensure you're connecting to the correct port

### Performance issues

1. Increase resource limits in `docker-compose.yml`
2. Add more workers by modifying the CMD in Dockerfile
3. Use a production ASGI server like gunicorn with uvicorn workers
