import os

SECRET_KEY = os.getenv("SECRET_KEY", "SuperSecretKeyEnsureThisIsAtLeast32BytesLongForSecurityPurposes!!!")
ALGORITHM = "HS256"
ISSUER = "LifeSyncAI_API"
AUDIENCE = "LifeSyncAI_Client"
