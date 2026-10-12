import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_absolute_error

try:
    from schemas.forecast import ForecastRequest, ForecastResponse
except ImportError:
    from ..schemas.forecast import ForecastRequest, ForecastResponse

def evaluate_and_forecast_wellness(payload: ForecastRequest) -> ForecastResponse:
    # Convert incoming historical data to pandas DataFrame
    records = [item.model_dump() for item in payload.historical_data]
    df = pd.DataFrame(records)

    if df.empty or len(df) < 5:
        raise ValueError("Insufficient historical records to train high-accuracy regressor.")

    X = df[['water_ratio', 'optimal_sleep', 'workout_active', 'no_tasks', 'pending_tasks']]
    y = df['score']

    # Validate that features contain valid, finite numeric values
    if X.isna().any().any() or y.isna().any():
        raise ValueError("Historical health records contain missing or non-finite values.")

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

    # Compile the target feature DataFrame preserving exact feature names and ordering
    ti = payload.target_input
    feature_names = ['water_ratio', 'optimal_sleep', 'workout_active', 'no_tasks', 'pending_tasks']
    target_features = pd.DataFrame([[
        min(1.0, max(0.0, ti.water_intake / 2000.0)),
        1.0 if (7.0 <= ti.sleep_hours <= 9.0) else 0.0,
        1.0 if (ti.workout_minutes > 0.0) else 0.0,
        1.0 if (ti.pending_tasks == 0.0) else 0.0,
        float(max(0.0, ti.pending_tasks))
    ]], columns=feature_names)

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
