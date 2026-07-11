import jwt
import numpy as np
import pandas as pd
from typing import List
from pydantic import BaseModel
from fastapi import FastAPI, Header, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_absolute_error

SECRET_KEY = "SuperSecretKeyEnsureThisIsAtLeast32BytesLongForSecurityPurposes!!!"
ALGORITHM = "HS256"
ISSUER = "LifeSyncAI_API"
AUDIENCE = "LifeSyncAI_Client"

app = FastAPI(title="LifeSync AI ML Service", version="1.0.0")

# Setup CORS for development flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication dependency using PyJWT
def verify_jwt_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access denied. Missing or invalid Authorization header."
        )
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            audience=AUDIENCE,
            issuer=ISSUER
        )
        user_id = payload.get("nameid")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is missing required user identifier claims."
            )
        return int(user_id)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again."
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid credentials token: {str(e)}"
        )

# DTO schemas for request / response
class DailyFeature(BaseModel):
    water_ratio: float
    optimal_sleep: float
    workout_active: float
    no_tasks: float
    pending_tasks: float
    score: float

class TargetInput(BaseModel):
    water_intake: float
    sleep_hours: float
    workout_minutes: float
    steps_count: float
    pending_tasks: float

class ForecastRequest(BaseModel):
    historical_data: List[DailyFeature]
    target_input: TargetInput

class ForecastResponse(BaseModel):
    forecastedLifeScore: float
    modelAccuracy: str
    healthRecommendation: str

@app.post("/api/ml/forecast", response_model=ForecastResponse, dependencies=[Depends(verify_jwt_token)])
async def forecast_wellness(payload: ForecastRequest):
    try:
        # Convert incoming historical data to pandas DataFrame
        records = [item.model_dump() for item in payload.historical_data]
        df = pd.DataFrame(records)

        if df.empty or len(df) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient historical records to train high-accuracy regressor."
            )

        X = df[['water_ratio', 'optimal_sleep', 'workout_active', 'no_tasks', 'pending_tasks']]
        y = df['score']

        # Train a Random Forest Regressor to capture non-linear relationships
        # Standard configuration for fast training and low variance
        model = RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)
        model.fit(X, y)

        # Compute regression quality stats
        y_pred = model.predict(X)
        r2 = r2_score(y, y_pred)
        mae = mean_absolute_error(y, y_pred)

        # If R2 is negative due to small dataset size or constant values, clamp it nicely
        r2_pct = max(0.0, r2 * 100.0)

        # Compile the target feature array
        ti = payload.target_input
        target_features = np.array([[
            min(1.0, ti.water_intake / 2000.0),
            1.0 if (7.0 <= ti.sleep_hours <= 9.0) else 0.0,
            1.0 if (ti.workout_minutes > 0.0) else 0.0,
            1.0 if (ti.pending_tasks == 0.0) else 0.0,
            float(ti.pending_tasks)
        ]])

        # Execute Random Forest prediction
        predicted_score = float(model.predict(target_features)[0])
        final_score = max(0.0, min(100.0, predicted_score))

        # Generate user-friendly advice
        recommendation = "Your predicted score looks strong! Keep up your routines."
        if final_score < 70:
            if ti.sleep_hours < 7:
                recommendation = "Forecast Warning: Short sleep is predicted to drag down your cognitive energy. Prioritize getting 7+ hours of sleep tonight."
            elif ti.water_intake < 2000:
                recommendation = "Forecast Warning: Low hydration levels will cause brain fog. Try to increase water intake by carrying a bottle today."
            elif ti.pending_tasks > 4:
                recommendation = "Forecast Warning: A high backlog of tasks is creating mental overload. Break them down and tackle the easiest task first."

        accuracy_text = f"Random Forest Regressor (R-Squared: {r2_pct:.1f}%, Mean Error: {mae:.2f})"

        return ForecastResponse(
            forecastedLifeScore=round(final_score, 1),
            modelAccuracy=accuracy_text,
            healthRecommendation=recommendation
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Machine Learning evaluation error: {str(e)}"
        )
