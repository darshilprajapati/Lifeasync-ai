import sys
from pathlib import Path

# Ensure ML service root directory is on sys.path for direct uvicorn / script execution
current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from api.routes import router
    from schemas.forecast import DailyFeature, TargetInput, ForecastRequest, ForecastResponse
    from services.forecasting import evaluate_and_forecast_wellness
    from core.config import SECRET_KEY, ALGORITHM, ISSUER, AUDIENCE
except ImportError:
    from .api.routes import router
    from .schemas.forecast import DailyFeature, TargetInput, ForecastRequest, ForecastResponse
    from .services.forecasting import evaluate_and_forecast_wellness
    from .core.config import SECRET_KEY, ALGORITHM, ISSUER, AUDIENCE

app = FastAPI(title="LifeSync AI ML Service", version="1.0.0")

import os

# Explicit and configurable CORS origins for local dev and deployment environments
DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5048",
    "https://localhost:7048",
]
configured_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
allowed_origins = configured_origins if configured_origins else DEFAULT_ALLOWED_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Liveness probe endpoint
@app.get("/health")
def health_check():
    return {"status": "Healthy", "service": "LifeSync AI ML Service"}

# Register modular API routes
app.include_router(router)
