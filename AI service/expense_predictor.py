"""
╔══════════════════════════════════════════════════════════════╗
║         Smart Expense Tracker — ML Prediction Service        ║
║                     FastAPI Microservice                     ║
╚══════════════════════════════════════════════════════════════╝

Architecture:
    React Frontend
         │
         ▼
    Java Backend  ──►  Python ML Service (this file)  ──►  RF Model
         │
         ▼
      Database

Endpoints:
    GET  /health                  Health check
    GET  /categories              List supported expense categories
    POST /predict                 Predict next month for one category
    POST /predict/batch           Predict for multiple categories at once
    POST /predict/future          Predict N months into the future
    GET  /model/info              Model metadata

Run:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Call from Java (OkHttp / RestTemplate):
    POST http://localhost:8000/predict
    Content-Type: application/json
"""

# ── Imports ───────────────────────────────────────────────────────────────────
import os
import json
import logging
import warnings
from datetime import datetime, date
from pathlib import Path
from typing import List, Optional

import joblib
import numpy as np
import pandas as pd
import uvicorn
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator

warnings.filterwarnings("ignore")

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level   = logging.INFO,
    format  = "%(asctime)s | %(levelname)s | %(message)s",
    datefmt = "%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════

# Paths — place model files in same directory as this script
BASE_DIR        = Path(__file__).parent
MODEL_PATH      = BASE_DIR / "random_forest_tuned_best.pkl"
CONFIG_PATH     = BASE_DIR / "tuned_model_config.json"

SUPPORTED_CATEGORIES = [
    "food", "travel", "health", "utilities", "rent",
    "entertainment", "education", "misc", "others",
]

# Minimum months of history required to compute all lag features
MIN_HISTORY_MONTHS = 12


# ══════════════════════════════════════════════════════════════════════════════
#  MODEL LOADING
# ══════════════════════════════════════════════════════════════════════════════

def load_model_and_config():
    """Load the trained model and its configuration at startup."""
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model file not found: {MODEL_PATH}\n"
            "Place 'random_forest_tuned_best.pkl' in the same directory as main.py"
        )
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(
            f"Config file not found: {CONFIG_PATH}\n"
            "Place 'tuned_model_config.json' in the same directory as main.py"
        )

    model  = joblib.load(MODEL_PATH)
    with open(CONFIG_PATH) as f:
        config = json.load(f)

    logger.info("✅ Model loaded: %s", MODEL_PATH.name)
    logger.info("   Features     : %d", len(config["feature_cols"]))
    logger.info("   Log transform: %s", config["use_log_transform"])
    logger.info("   Test MAE     : %s", config["test_mae"])
    return model, config

model, cfg = load_model_and_config()

FEATURE_COLS    = cfg["feature_cols"]
USE_LOG         = cfg["use_log_transform"]
CATEGORY_LABELS = {
    cat: i for i, cat in enumerate(sorted(SUPPORTED_CATEGORIES))
}


# ══════════════════════════════════════════════════════════════════════════════
#  FEATURE ENGINEERING (mirrors the training notebook exactly)
# ══════════════════════════════════════════════════════════════════════════════

def build_features(
    history: List[dict],
    target_year: int,
    target_month: int,
    category: str,
) -> pd.DataFrame:
    """
    Reconstruct the full feature vector for one prediction.

    Parameters
    ----------
    history      : list of dicts, each with keys:
                   'year_month' (str, 'YYYY-MM'), 'total_amount' (float),
                   'transaction_count' (int), 'unique_users' (int, optional)
    target_year  : year of the month to predict
    target_month : month number (1–12) to predict
    category     : expense category string

    Returns
    -------
    pd.DataFrame with one row, columns matching FEATURE_COLS
    """
    # ── Build a time-indexed series from history ──────────────────────────────
    hist_df = pd.DataFrame(history)
    hist_df["date"] = pd.to_datetime(hist_df["year_month"], format="%Y-%m")
    hist_df = hist_df.sort_values("date").reset_index(drop=True)

    amounts = hist_df["total_amount"].values.astype(float)
    counts  = hist_df.get("transaction_count", pd.Series([1]*len(hist_df))).values.astype(float)

    n = len(amounts)  # number of historical months available

    def safe_get(arr, idx):
        """Return arr[idx] if valid, else 0.0."""
        return float(arr[idx]) if 0 <= idx < len(arr) else 0.0

    def rolling_mean(arr, end_idx, window):
        start = max(0, end_idx - window)
        sub   = arr[start:end_idx]
        return float(np.mean(sub)) if len(sub) > 0 else 0.0

    def rolling_std(arr, end_idx, window):
        start = max(0, end_idx - window)
        sub   = arr[start:end_idx]
        return float(np.std(sub)) if len(sub) > 1 else 0.0

    def rolling_max(arr, end_idx, window):
        start = max(0, end_idx - window)
        sub   = arr[start:end_idx]
        return float(np.max(sub)) if len(sub) > 0 else 0.0

    def rolling_min(arr, end_idx, window):
        start = max(0, end_idx - window)
        sub   = arr[start:end_idx]
        return float(np.min(sub)) if len(sub) > 0 else 0.0

    # All indices are relative to the END of history (position n = the target month)
    # So lag_1 = amounts[n-1], lag_2 = amounts[n-2], etc.

    # ── 1. Time features ──────────────────────────────────────────────────────
    time_index_base = (
        (hist_df["date"].iloc[0].year) * 12 + hist_df["date"].iloc[0].month
    )
    time_index = (target_year * 12 + target_month) - time_index_base

    row = {
        # Calendar
        "year"             : target_year,
        "month"            : target_month,
        "quarter"          : (target_month - 1) // 3 + 1,
        # Cyclical
        "month_sin"        : np.sin(2 * np.pi * target_month / 12),
        "month_cos"        : np.cos(2 * np.pi * target_month / 12),
        "quarter_sin"      : np.sin(2 * np.pi * ((target_month - 1) // 3 + 1) / 4),
        "quarter_cos"      : np.cos(2 * np.pi * ((target_month - 1) // 3 + 1) / 4),
        # Trend
        "time_index"       : time_index,
        # Season flags
        "is_year_start"    : int(target_month == 1),
        "is_year_end"      : int(target_month == 12),
        "is_quarter_end"   : int(target_month in [3, 6, 9, 12]),
        "is_summer"        : int(target_month in [4, 5, 6]),
        "is_festive"       : int(target_month in [10, 11]),
        "is_monsoon"       : int(target_month in [7, 8, 9]),
    }

    # ── 2. Lag features ───────────────────────────────────────────────────────
    for lag in [1, 2, 3, 6, 12]:
        row[f"lag_{lag}m"]       = safe_get(amounts, n - lag)
        row[f"lag_{lag}m_count"] = safe_get(counts,  n - lag)

    # ── 3. Rolling window features ────────────────────────────────────────────
    for window in [3, 6, 12]:
        row[f"roll_mean_{window}m"] = rolling_mean(amounts, n, window)
        row[f"roll_std_{window}m"]  = rolling_std(amounts,  n, window)
        row[f"roll_max_{window}m"]  = rolling_max(amounts,  n, window)
        row[f"roll_min_{window}m"]  = rolling_min(amounts,  n, window)

    # ── 4. Change / MoM / YoY features ───────────────────────────────────────
    prev1  = safe_get(amounts, n - 1)
    prev2  = safe_get(amounts, n - 2)
    prev12 = safe_get(amounts, n - 12)
    prev13 = safe_get(amounts, n - 13)
    roll3  = rolling_mean(amounts, n, 3)

    row["mom_change"]      = prev1 - prev2
    row["mom_pct_change"]  = (prev1 - prev2) / (prev2 + 1e-8)
    row["yoy_lag_12m"]     = prev12
    row["yoy_pct_change"]  = (prev12 - prev13) / (prev13 + 1e-8)
    row["ratio_to_3m_avg"] = prev1 / (roll3 + 1e-8)

    # ── 5. Category global stats (computed from history) ──────────────────────
    row["cat_global_mean"]           = float(np.mean(amounts))
    row["cat_global_median"]         = float(np.median(amounts))
    row["cat_global_std"]            = float(np.std(amounts))
    row["cat_global_max"]            = float(np.max(amounts))
    row["cat_global_min"]            = float(np.min(amounts))
    row["cat_cv"]                    = float(np.std(amounts) / (np.mean(amounts) + 1e-8))

    # Same-month historical average (same calendar month across all years in history)
    same_month_mask = [
        hist_df["date"].iloc[i].month == target_month
        for i in range(len(hist_df))
    ]
    same_month_vals = amounts[[i for i, m in enumerate(same_month_mask) if m]]
    row["cat_same_month_hist_avg"]   = float(np.mean(same_month_vals)) if len(same_month_vals) > 0 else row["cat_global_mean"]

    # ── 6. Transaction aggregates ─────────────────────────────────────────────
    row["transaction_count"] = safe_get(counts, n - 1)
    row["unique_users"]      = float(hist_df.get("unique_users", pd.Series([1]*n)).iloc[-1]) if "unique_users" in hist_df.columns else 1.0

    # ── 7. Category encoding ──────────────────────────────────────────────────
    row["category_label"] = CATEGORY_LABELS.get(category, 0)
    for cat in sorted(SUPPORTED_CATEGORIES):
        row[f"cat_{cat}"] = int(cat == category)

    # ── Align to exact FEATURE_COLS order used during training ────────────────
    feat_row = {col: row.get(col, 0.0) for col in FEATURE_COLS}
    return pd.DataFrame([feat_row])


def predict_amount(features_df: pd.DataFrame) -> float:
    """Run prediction and invert log transform if needed."""
    raw = model.predict(features_df)[0]
    return float(np.expm1(raw)) if USE_LOG else float(max(raw, 0.0))


# ══════════════════════════════════════════════════════════════════════════════
#  PYDANTIC SCHEMAS  (request / response models)
# ══════════════════════════════════════════════════════════════════════════════

class MonthlyRecord(BaseModel):
    """One month of aggregated expense data for a category."""
    year_month        : str   = Field(..., example="2024-09",
                                      description="Format: YYYY-MM")
    total_amount      : float = Field(..., ge=0, example=45000.0)
    transaction_count : int   = Field(default=1, ge=0, example=12)
    unique_users      : Optional[int] = Field(default=None, example=5)

    @validator("year_month")
    def validate_year_month(cls, v):
        try:
            datetime.strptime(v, "%Y-%m")
        except ValueError:
            raise ValueError("year_month must be in YYYY-MM format (e.g. '2024-09')")
        return v


class PredictRequest(BaseModel):
    """Request body for /predict."""
    category    : str              = Field(..., example="food",
                                          description="Expense category")
    history     : List[MonthlyRecord] = Field(
        ..., min_items=MIN_HISTORY_MONTHS,
        description=f"At least {MIN_HISTORY_MONTHS} months of historical monthly totals, "
                    "sorted oldest → newest"
    )
    target_year : Optional[int]   = Field(default=None, example=2025,
                                          description="Year to predict (defaults to next month)")
    target_month: Optional[int]   = Field(default=None, ge=1, le=12, example=1,
                                          description="Month to predict (1–12)")

    @validator("category")
    def validate_category(cls, v):
        v = v.lower().strip()
        if v not in SUPPORTED_CATEGORIES:
            raise ValueError(
                f"Unsupported category '{v}'. "
                f"Supported: {SUPPORTED_CATEGORIES}"
            )
        return v


class PredictionResult(BaseModel):
    category          : str
    target_year_month : str
    predicted_amount  : float
    confidence_note   : str


class BatchPredictRequest(BaseModel):
    """Request body for /predict/batch — multiple categories at once."""
    predictions: List[PredictRequest]


class FuturePredictRequest(BaseModel):
    """Predict N months into the future for one category."""
    category      : str
    history       : List[MonthlyRecord]
    months_ahead  : int = Field(default=3, ge=1, le=12,
                                description="How many future months to predict (1–12)")

    @validator("category")
    def validate_category(cls, v):
        v = v.lower().strip()
        if v not in SUPPORTED_CATEGORIES:
            raise ValueError(f"Unsupported category '{v}'")
        return v


# ══════════════════════════════════════════════════════════════════════════════
#  FASTAPI APP
# ══════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title       = "Smart Expense Tracker — ML Prediction API",
    description = (
        "Predicts monthly expense totals per category using a trained "
        "Random Forest model. Called by the Java backend to power "
        "budget forecasting in the React frontend."
    ),
    version     = "1.0.0",
    docs_url    = "/docs",       # Swagger UI at http://localhost:8000/docs
    redoc_url   = "/redoc",
)

# ── CORS — allow Java backend and React frontend to call this service ─────────
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],   # Restrict to your actual domains in production
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/health", tags=["System"])
def health_check():
    """
    Health check endpoint.
    Java backend should ping this on startup to verify the service is up.
    """
    return {
        "status"     : "ok",
        "model"      : "Random Forest (tuned)",
        "test_mae"   : cfg.get("test_mae"),
        "test_r2"    : cfg.get("test_r2"),
        "categories" : SUPPORTED_CATEGORIES,
        "timestamp"  : datetime.utcnow().isoformat(),
    }


@app.get("/categories", tags=["System"])
def get_categories():
    """Return the list of expense categories the model supports."""
    return {
        "categories"          : SUPPORTED_CATEGORIES,
        "min_history_months"  : MIN_HISTORY_MONTHS,
    }


@app.get("/model/info", tags=["System"])
def model_info():
    """Return model metadata and training configuration."""
    return {
        "model_type"         : "RandomForestRegressor",
        "best_tuning_method" : cfg.get("best_tuning_method"),
        "best_params"        : cfg.get("best_params"),
        "n_features"         : len(FEATURE_COLS),
        "use_log_transform"  : USE_LOG,
        "test_mae"           : cfg.get("test_mae"),
        "test_rmse"          : cfg.get("test_rmse"),
        "test_r2"            : cfg.get("test_r2"),
        "test_mape_pct"      : cfg.get("test_mape_pct"),
        "mae_improvement_pct": cfg.get("mae_improvement_pct"),
    }


@app.post(
    "/predict",
    response_model = PredictionResult,
    tags           = ["Prediction"],
    summary        = "Predict next month's expense for one category",
)
def predict(req: PredictRequest):
    """
    Predict the total monthly expense for a given category.

    **How to call from Java (Spring Boot example):**
    ```java
    RestTemplate restTemplate = new RestTemplate();
    String url = "http://localhost:8000/predict";
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);

    String body = objectMapper.writeValueAsString(requestPayload);
    HttpEntity<String> entity = new HttpEntity<>(body, headers);
    ResponseEntity<PredictionResult> response =
        restTemplate.postForEntity(url, entity, PredictionResult.class);
    ```

    **Request body example:**
    ```json
    {
      "category": "food",
      "history": [
        {"year_month": "2023-01", "total_amount": 42000, "transaction_count": 18},
        ...  (at least 12 months)
      ],
      "target_year": 2025,
      "target_month": 1
    }
    ```
    """
    try:
        # Determine target year/month
        if req.target_year and req.target_month:
            t_year, t_month = req.target_year, req.target_month
        else:
            # Default: predict the month after the last history entry
            last_dt = datetime.strptime(req.history[-1].year_month, "%Y-%m")
            if last_dt.month == 12:
                t_year, t_month = last_dt.year + 1, 1
            else:
                t_year, t_month = last_dt.year, last_dt.month + 1

        history_dicts = [h.dict() for h in req.history]
        features      = build_features(history_dicts, t_year, t_month, req.category)
        prediction    = predict_amount(features)

        target_ym = f"{t_year}-{str(t_month).zfill(2)}"
        logger.info("Predicted  category=%-15s  period=%s  amount=%.0f",
                    req.category, target_ym, prediction)

        return PredictionResult(
            category          = req.category,
            target_year_month = target_ym,
            predicted_amount  = round(prediction, 2),
            confidence_note   = (
                f"Based on {len(req.history)} months of history. "
                f"Model Test MAE ≈ {cfg.get('test_mae', 'N/A'):,}"
            ),
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=str(e))
    except Exception as e:
        logger.error("Prediction error: %s", str(e), exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Prediction failed: {str(e)}")


@app.post(
    "/predict/batch",
    tags    = ["Prediction"],
    summary = "Predict for multiple categories in one call",
)
def predict_batch(req: BatchPredictRequest):
    """
    Predict monthly expenses for multiple categories in a single request.
    Useful for loading the full budget forecast dashboard in React.

    Returns a list of prediction results, one per category.
    """
    results = []
    errors  = []

    for single_req in req.predictions:
        try:
            result = predict(single_req)
            results.append(result.dict())
        except HTTPException as e:
            errors.append({
                "category": single_req.category,
                "error"   : e.detail,
            })

    return {
        "predictions" : results,
        "errors"      : errors,
        "total"       : len(results),
        "failed"      : len(errors),
    }


@app.post(
    "/predict/future",
    tags    = ["Prediction"],
    summary = "Predict N months into the future for one category",
)
def predict_future(req: FuturePredictRequest):
    """
    Iteratively predict multiple future months for one category.

    Each predicted month is appended to history before predicting the next,
    so predictions chain forward (rolling forecast).

    **Example use case:** Show a 3-month budget forecast chart in React.
    """
    try:
        history_dicts = [h.dict() for h in req.history]
        rolling_amounts = [h["total_amount"] for h in history_dicts]
        rolling_counts  = [h.get("transaction_count", 1) for h in history_dicts]

        # Determine start month
        last_dt    = datetime.strptime(req.history[-1].year_month, "%Y-%m")
        curr_year  = last_dt.year
        curr_month = last_dt.month

        future_predictions = []

        for step in range(req.months_ahead):
            # Advance one month
            if curr_month == 12:
                curr_year  += 1
                curr_month  = 1
            else:
                curr_month += 1

            # Build temp history list for this step
            temp_history = []
            start_dt = datetime.strptime(req.history[0].year_month, "%Y-%m")
            for i, (amt, cnt) in enumerate(zip(rolling_amounts, rolling_counts)):
                m = start_dt.month + i
                y = start_dt.year + (m - 1) // 12
                m = ((m - 1) % 12) + 1
                temp_history.append({
                    "year_month"       : f"{y}-{str(m).zfill(2)}",
                    "total_amount"     : amt,
                    "transaction_count": cnt,
                })

            features   = build_features(temp_history, curr_year, curr_month, req.category)
            prediction = predict_amount(features)

            target_ym = f"{curr_year}-{str(curr_month).zfill(2)}"
            future_predictions.append({
                "year_month"      : target_ym,
                "predicted_amount": round(prediction, 2),
                "step"            : step + 1,
            })
            logger.info("Future step %d  category=%-12s  period=%s  amount=%.0f",
                        step + 1, req.category, target_ym, prediction)

            # Append prediction to rolling history for next step
            rolling_amounts.append(prediction)
            rolling_counts.append(rolling_counts[-1])  # assume similar transaction count

        return {
            "category"   : req.category,
            "predictions": future_predictions,
            "months_ahead": req.months_ahead,
            "note"       : "Each month's prediction uses the previous predicted value as lag input.",
        }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=str(e))
    except Exception as e:
        logger.error("Future prediction error: %s", str(e), exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Future prediction failed: {str(e)}")


# ══════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    uvicorn.run(
        "expense_predictor:app",
        host    = "0.0.0.0",
        port    = 8000,
        reload  = True,
        workers = 1,    # Keep at 1 — model is loaded once into memory
    )
