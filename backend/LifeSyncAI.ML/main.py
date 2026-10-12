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

# Setup CORS for development flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Liveness probe endpoint
@app.get("/health")
def health_check():
    return {"status": "Healthy", "service": "LifeSync AI ML Service"}

# Register modular API routes
app.include_router(router)
