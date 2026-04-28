"""ASGI entrypoint that exposes both AI models in one process.

Routes:
    - Expense predictor: existing root routes (e.g. /predict, /predict/future)
    - Overspender model: /overspend/* (e.g. /overspend/predict)

Run with:
    uvicorn main:app --reload --port 8000
"""

from expense_predictor import app as expense_app
from overspendor import app as overspendor_app
from fastapi import APIRouter

# Keep existing expense predictor endpoints unchanged for backend compatibility.
app = expense_app

# Mount overspender endpoints under a dedicated namespace.
app.mount("/overspend", overspendor_app)

router = APIRouter()


@router.get("/", tags=["System"])
def service_map():
    return {
        "service": "Smart Expense Tracker AI Gateway",
        "modules": {
            "expense_predictor": {
                "base_path": "/",
                "health": "/health",
                "endpoints": [
                    "/predict",
                    "/predict/batch",
                    "/predict/future",
                    "/categories",
                    "/model/info",
                ],
            },
            "overspendor": {
                "base_path": "/overspend",
                "health": "/overspend/health",
                "endpoints": [
                    "/overspend/predict",
                    "/overspend/predict/trend",
                    "/overspend/predict/batch",
                ],
            },
        },
    }


app.include_router(router)
