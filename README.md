# 🧬 LifeSync AI

LifeSync AI is a premium, real-time wellness, finance, and productivity dashboard built with a modern multi-tier architecture. It integrates habit tracking, daily task schedules, finance ledger analytics, file vaults, and automated machine learning-based wellness health recommendations.

---

## 🏗️ Architecture Overview

The system consists of three core layers:

1.  **Frontend**: React (Vite + TypeScript + Material UI)
    *   State management, dynamic theme transitions (premium light & HSL dark modes), and modular snapping navigation menu bar.
2.  **Backend API**: .NET Core 10 Web API
    *   Exposes secure endpoints, maps SQL Server schemas via Entity Framework Core, handles JWT auth tokens via HttpOnly cookies, and runs background hosted services for PDF report generations.
3.  **ML Service**: Python (FastAPI + Statsmodels)
    *   Analyzes sleep, steps, and activity metrics to calculate dynamic forecasts and habit recommendations.

---

## 🔒 Security & Local Configuration

To prevent security leaks, all sensitive credentials (like database connection strings, JWT keys, and SMTP email credentials) are excluded from Git version control.

### 1. Pre-configured `.gitignore`
A master `.gitignore` is set up in the root directory. It automatically ignores:
*   Local settings: `appsettings.Development.json`, `appsettings.local.json`, `.env`
*   Build files: `bin/`, `obj/`, `dist/`, `node_modules/`
*   Virtual Environments: `backend/LifeSyncAI.ML/.venv/`

### 2. Local Setup
When you clone or download the repository, copy the placeholder `appsettings.json` and configure your credentials locally inside:
📁 `backend/LifeSyncAI.API/appsettings.Development.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=LifeSyncAI_DB;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"
  },
  "JwtSettings": {
    "Secret": "YourLocalSecretKeyForJWTTokensEnsureItIsAtLeast32Bytes",
    "Issuer": "LifeSyncAI_API",
    "Audience": "LifeSyncAI_Client"
  },
  "SmtpSettings": {
    "Host": "smtp.gmail.com",
    "Port": "587",
    "Username": "your.email@gmail.com",
    "Password": "your_app_password",
    "EnableSsl": "true",
    "SenderEmail": "your.email@gmail.com",
    "SenderName": "LifeSync AI Support"
  }
}
```

---

## 🚀 How to Run Locally

### 1. Start backend API
Navigate to the `backend/` directory:
```bash
dotnet restore
dotnet build
dotnet run --project LifeSyncAI.API/LifeSyncAI.API.csproj
```

### 2. Start ML Forecast Service
Navigate to `backend/LifeSyncAI.ML/` directory:
```bash
# Activate your virtual env
.venv\Scripts\activate

# Run FastAPI app
python -m uvicorn main:app --port 8010
```

### 3. Start Frontend
Navigate to `frontend/` directory:
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.
