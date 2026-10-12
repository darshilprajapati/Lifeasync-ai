import jwt
from fastapi import APIRouter, Header, HTTPException, Depends, status

try:
    from core.config import SECRET_KEY, ALGORITHM, ISSUER, AUDIENCE
    from schemas.forecast import ForecastRequest, ForecastResponse
    from services.forecasting import evaluate_and_forecast_wellness
except ImportError:
    from ..core.config import SECRET_KEY, ALGORITHM, ISSUER, AUDIENCE
    from ..schemas.forecast import ForecastRequest, ForecastResponse
    from ..services.forecasting import evaluate_and_forecast_wellness

router = APIRouter()

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

@router.post("/api/ml/forecast", response_model=ForecastResponse, dependencies=[Depends(verify_jwt_token)])
async def forecast_wellness(payload: ForecastRequest):
    try:
        return evaluate_and_forecast_wellness(payload)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Machine Learning evaluation error: {str(e)}"
        )
