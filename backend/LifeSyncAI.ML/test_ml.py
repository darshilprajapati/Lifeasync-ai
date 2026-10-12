import os
import sys
import unittest
import warnings
from datetime import datetime, timezone, timedelta
import jwt

# Suppress deprecation warnings from starlette / libraries during testing
warnings.filterwarnings("ignore")

# Ensure script directory is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from core.config import SECRET_KEY, ALGORITHM, ISSUER, AUDIENCE
from schemas.forecast import DailyFeature, TargetInput, ForecastRequest, ForecastResponse
from services.forecasting import evaluate_and_forecast_wellness
from starlette.testclient import TestClient


class TestLifeSyncAIML(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.valid_token = jwt.encode(
            {
                "nameid": "42",
                "iss": ISSUER,
                "aud": AUDIENCE,
                "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
            },
            SECRET_KEY,
            algorithm=ALGORITHM,
        )

    # 1. Python application imports
    def test_01_application_imports(self):
        """Verify that all core components and schemas import correctly without error"""
        import main
        import core.config
        import api.routes
        import schemas.forecast
        import services.forecasting
        self.assertIsNotNone(main.app)
        self.assertIsNotNone(core.config.SECRET_KEY)

    # 2. Application startup
    def test_02_application_startup(self):
        """Verify that the FastAPI application instance is properly configured"""
        self.assertEqual(app.title, "LifeSync AI ML Service")
        self.assertEqual(app.version, "1.0.0")

    # 3. Health endpoint
    def test_03_health_endpoint(self):
        """Verify the liveness probe endpoint returns 200 Healthy"""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "Healthy")
        self.assertIn("service", data)

    # 4. Successful valid prediction
    def test_04_valid_forecast_prediction(self):
        """Verify RandomForestRegressor training and prediction pipeline with valid 30-day data"""
        historical_data = []
        for i in range(15):
            historical_data.append(
                DailyFeature(
                    water_ratio=0.8,
                    optimal_sleep=1.0 if i % 2 == 0 else 0.0,
                    workout_active=1.0,
                    no_tasks=0.0,
                    pending_tasks=2.0,
                    score=75.0 + (i % 5),
                )
            )

        payload = ForecastRequest(
            historical_data=historical_data,
            target_input=TargetInput(
                water_intake=2200.0,
                sleep_hours=8.0,
                workout_minutes=45.0,
                steps_count=8500.0,
                pending_tasks=1.0,
            ),
        )

        response = self.client.post(
            "/api/ml/forecast",
            json=payload.model_dump(),
            headers={"Authorization": f"Bearer {self.valid_token}"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("forecastedLifeScore", data)
        self.assertIn("modelAccuracy", data)
        self.assertIn("healthRecommendation", data)
        self.assertGreaterEqual(data["forecastedLifeScore"], 0.0)
        self.assertLessEqual(data["forecastedLifeScore"], 100.0)

    # 5. Missing required fields in payload
    def test_05_missing_required_fields(self):
        """Verify 422 Unprocessable Entity when required fields are missing"""
        incomplete_payload = {
            "historical_data": []
            # target_input is omitted
        }
        response = self.client.post(
            "/api/ml/forecast",
            json=incomplete_payload,
            headers={"Authorization": f"Bearer {self.valid_token}"},
        )
        self.assertEqual(response.status_code, 422)

    # 6. Invalid data types
    def test_06_invalid_data_types(self):
        """Verify 422 Unprocessable Entity on schema type mismatch"""
        response = self.client.post(
            "/api/ml/forecast",
            json={"historical_data": "invalid_string", "target_input": 123},
            headers={"Authorization": f"Bearer {self.valid_token}"},
        )
        self.assertEqual(response.status_code, 422)

    # 7. Invalid or out-of-range feature values
    def test_07_extreme_feature_values(self):
        """Verify model handles extreme or boundary feature values smoothly without crashing"""
        historical_data = []
        for i in range(10):
            historical_data.append(
                DailyFeature(
                    water_ratio=0.3,
                    optimal_sleep=0.0,
                    workout_active=0.0,
                    no_tasks=0.0,
                    pending_tasks=8.0,
                    score=45.0 + (i % 5),
                )
            )

        payload = ForecastRequest(
            historical_data=historical_data,
            target_input=TargetInput(
                water_intake=800.0,    # poor hydration
                sleep_hours=4.0,       # severe sleep deprivation
                workout_minutes=0.0,   # sedentary
                steps_count=1200.0,
                pending_tasks=10.0,    # heavy task backlog
            ),
        )

        response = self.client.post(
            "/api/ml/forecast",
            json=payload.model_dump(),
            headers={"Authorization": f"Bearer {self.valid_token}"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(data["forecastedLifeScore"], 0.0)
        self.assertLessEqual(data["forecastedLifeScore"], 100.0)
        self.assertIn("Forecast Warning", data["healthRecommendation"])

    # 8. Empty input
    def test_08_empty_input(self):
        """Verify 422 Unprocessable Entity on empty body"""
        response = self.client.post(
            "/api/ml/forecast",
            json={},
            headers={"Authorization": f"Bearer {self.valid_token}"},
        )
        self.assertEqual(response.status_code, 422)

    # 9. Invalid authentication token
    def test_09_invalid_auth_token(self):
        """Verify endpoint rejects invalid JWT signature with 401"""
        fake_token = jwt.encode({"nameid": "1"}, "WrongSecretKey12345678901234567890", algorithm="HS256")
        response = self.client.post(
            "/api/ml/forecast",
            json={},
            headers={"Authorization": f"Bearer {fake_token}"},
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn("Invalid credentials token", response.json()["detail"])

    # 10. Missing authentication header
    def test_10_missing_auth_header(self):
        """Verify endpoint denies access with 401 when Authorization header is omitted"""
        response = self.client.post("/api/ml/forecast", json={})
        self.assertEqual(response.status_code, 401)
        self.assertIn("Missing or invalid Authorization header", response.json()["detail"])

    # 11. Unexpected inference errors / non-finite inputs
    def test_11_non_finite_input_handling(self):
        """Verify clean error handling when non-finite values are submitted to the forecasting service"""
        historical_data = [
            DailyFeature(
                water_ratio=float("nan"),
                optimal_sleep=1.0,
                workout_active=1.0,
                no_tasks=0.0,
                pending_tasks=1.0,
                score=80.0,
            )
        ] * 6
        target_input = TargetInput(
            water_intake=1500.0,
            sleep_hours=6.0,
            workout_minutes=20.0,
            steps_count=5000.0,
            pending_tasks=2.0,
        )
        req = ForecastRequest(historical_data=historical_data, target_input=target_input)
        with self.assertRaises(ValueError) as ctx:
            evaluate_and_forecast_wellness(req)
        self.assertIn("Historical health records contain missing or non-finite values", str(ctx.exception))

    # 12. Missing / insufficient historical data records
    def test_12_forecast_insufficient_data(self):
        """Verify endpoint returns 400 Bad Request when historical data < 5 records"""
        payload = {
            "historical_data": [
                {
                    "water_ratio": 0.5,
                    "optimal_sleep": 1.0,
                    "workout_active": 1.0,
                    "no_tasks": 0.0,
                    "pending_tasks": 1.0,
                    "score": 80.0,
                }
            ],
            "target_input": {
                "water_intake": 1500.0,
                "sleep_hours": 6.0,
                "workout_minutes": 20.0,
                "steps_count": 5000.0,
                "pending_tasks": 2.0,
            },
        }

        response = self.client.post(
            "/api/ml/forecast",
            json=payload,
            headers={"Authorization": f"Bearer {self.valid_token}"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Insufficient historical records", response.json()["detail"])

    # 13. Response schema validation
    def test_13_response_schema_validation(self):
        """Verify response conforms strictly to ForecastResponse schema"""
        historical_data = [
            DailyFeature(
                water_ratio=1.0,
                optimal_sleep=1.0,
                workout_active=1.0,
                no_tasks=1.0,
                pending_tasks=0.0,
                score=90.0,
            ) for _ in range(6)
        ]
        req = ForecastRequest(
            historical_data=historical_data,
            target_input=TargetInput(
                water_intake=2000.0,
                sleep_hours=8.0,
                workout_minutes=30.0,
                steps_count=8000.0,
                pending_tasks=0.0,
            ),
        )
        res = evaluate_and_forecast_wellness(req)
        self.assertIsInstance(res, ForecastResponse)
        self.assertIsInstance(res.forecastedLifeScore, float)
        self.assertIsInstance(res.modelAccuracy, str)
        self.assertIsInstance(res.healthRecommendation, str)

    # 14. Configuration errors / expired token & claims mismatch
    def test_14_expired_auth_token_and_claim_mismatch(self):
        """Verify endpoint rejects expired JWT signature and missing user ID claim with 401"""
        expired_token = jwt.encode(
            {
                "nameid": "42",
                "iss": ISSUER,
                "aud": AUDIENCE,
                "exp": datetime.now(timezone.utc) - timedelta(minutes=5),
            },
            SECRET_KEY,
            algorithm=ALGORITHM,
        )
        response = self.client.post(
            "/api/ml/forecast",
            json={},
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn("Session expired", response.json()["detail"])

        # Token without nameid
        no_nameid_token = jwt.encode(
            {
                "iss": ISSUER,
                "aud": AUDIENCE,
                "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
            },
            SECRET_KEY,
            algorithm=ALGORITHM,
        )
        res_no_nameid = self.client.post(
            "/api/ml/forecast",
            json={},
            headers={"Authorization": f"Bearer {no_nameid_token}"},
        )
        self.assertEqual(res_no_nameid.status_code, 401)
        self.assertIn("missing required user identifier", res_no_nameid.json()["detail"])

    # 15. CORS behavior
    def test_15_cors_behavior(self):
        """Verify CORS headers are present on API responses for cross-origin requests"""
        response = self.client.options(
            "/api/ml/forecast",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access-control-allow-origin", response.headers)
        self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:5173")


if __name__ == "__main__":
    unittest.main()
