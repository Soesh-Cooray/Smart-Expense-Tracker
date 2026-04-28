"""
fastapi_pkl_service.py

FastAPI service that loads the final PKL model and exposes prediction APIs.
Run:
    python -m uvicorn fastapi_pkl_service:app --reload --port 8001
"""

import pickle
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from predict_from_pkl import forecast_next_month

PKL_PATH = "budget_time_series_model.pkl"

app = FastAPI(title="Budget Time Series Forecasting API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    with open(PKL_PATH, "rb") as file:
        bundle = pickle.load(file)

    return {
        "status": "AI service running",
        "model": bundle["model_name"],
        "metrics": bundle["metrics"],
        "categories": bundle["categories"],
    }


@app.get("/forecast/next-month")
def next_month_forecast(budget_limit: float = Query(100000, ge=1)):
    return forecast_next_month(budget_limit)
