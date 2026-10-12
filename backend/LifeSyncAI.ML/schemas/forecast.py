from typing import List
from pydantic import BaseModel

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
