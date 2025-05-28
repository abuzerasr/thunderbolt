from contextlib import asynccontextmanager
from functools import lru_cache
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import Settings
from proxy import ProxyConfig, ProxyService, get_proxy_service


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> Any:
    """Application lifespan manager for startup and shutdown events."""
    # Startup
    settings = get_settings()
    proxy_service = await get_proxy_service()

    # Register proxy configurations
    # Weather API proxy - only register if API key is provided
    if settings.weather_api_key:
        proxy_service.register_proxy(
            "/proxy/weather",
            ProxyConfig(
                target_url="https://api.weatherapi.com/v1",
                api_key=settings.weather_api_key,
                api_key_as_query_param=True,  # Use API key as query parameter
                api_key_query_param_name="key",  # WeatherAPI uses 'key' as the param name
                require_auth=True,
            ),
        )

    # DeepInfra OpenAI-compatible proxy
    if settings.deepinfra_api_key:
        proxy_service.register_proxy(
            "/openai",
            ProxyConfig(
                target_url="https://api.deepinfra.com/v1/openai",
                api_key=settings.deepinfra_api_key,
                api_key_header="Authorization",
                api_key_as_query_param=False,
                require_auth=False,  # Frontend doesn't need to authenticate
                supports_streaming=True,  # Enable streaming support
            ),
        )

    # Add more proxy configurations as needed
    # proxy_service.register_proxy("/proxy/another-api", ProxyConfig(...))

    yield

    # Shutdown
    await proxy_service.close()


# Create FastAPI app instance
app = FastAPI(
    title="Thunderbolt Backend",
    description="A FastAPI backend with proxy capabilities",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=dict[str, str])
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}


# OpenAI-compatible endpoints
@app.api_route(
    "/openai/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    include_in_schema=False,  # Hide from OpenAPI schema as it's a proxy
)
async def openai_proxy_endpoint(
    path: str,
    request: Request,
    proxy_service: ProxyService = Depends(get_proxy_service),
) -> Any:
    """OpenAI-compatible proxy endpoint."""
    # Handle OPTIONS preflight requests
    if request.method == "OPTIONS":
        return JSONResponse({"status": "ok"})

    # Get the configuration for this path
    config = proxy_service.get_config("/openai")
    if not config:
        raise HTTPException(status_code=404, detail="OpenAI proxy not configured")

    # No auth required for this endpoint - it's handled by the proxy
    # Proxy the request
    return await proxy_service.proxy_request(request, path, config)


@app.api_route(
    "/proxy/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    include_in_schema=False,  # Hide from OpenAPI schema as it's a proxy
)
async def proxy_endpoint(
    path: str,
    request: Request,
    proxy_service: ProxyService = Depends(get_proxy_service),
) -> Any:
    """Generic proxy endpoint that routes based on path."""
    # Handle OPTIONS preflight requests
    if request.method == "OPTIONS":
        return JSONResponse({"status": "ok"})

    # Get the configuration for this path
    config = proxy_service.get_config(f"/proxy/{path}")
    if not config:
        raise HTTPException(status_code=404, detail="Proxy path not configured")

    # Verify authentication if required
    if config.require_auth and not await proxy_service.verify_auth(request):
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Remove the proxy prefix from the path
    # Extract the actual path after the service name
    service_prefix = None
    for prefix in proxy_service.configs:
        if f"/proxy/{path}".startswith(prefix):
            service_prefix = prefix
            break

    if service_prefix:
        actual_path = path[len(service_prefix.replace("/proxy/", "")) :]
        actual_path = actual_path.lstrip("/")
    else:
        actual_path = path

    # Proxy the request
    return await proxy_service.proxy_request(request, actual_path, config)
