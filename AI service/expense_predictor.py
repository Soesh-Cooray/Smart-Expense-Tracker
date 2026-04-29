"""
╔══════════════════════════════════════════════════════════════╗
║         Smart Expense Tracker — ML Prediction Service        ║
║                     FastAPI Microservice                     ║
╚══════════════════════════════════════════════════════════════╝

FIX v2 — Personal Scale Correction
────────────────────────────────────
The model was trained on POPULATION-level aggregated monthly totals
(sum of all users per month), so its raw output is in the 50k–80k range.
Individual users spend in the 2k–10k range.

The fix uses a "relative prediction" approach:
  1. Ask the model what % change it expects vs the population baseline
  2. Apply that same % change to the user's own personal baseline
  → Preserves seasonal patterns & trend direction, anchored to user's scale

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
    uvicorn expense_predictor:app --host 0.0.0.0 --port 8000 --reload
"""

# ── Imports ───────────────────────────────────────────────────────────────────
import json
import logging
import warnings
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import joblib
import numpy as np
import pandas as pd
import uvicorn
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
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

BASE_DIR   = Path(__file__).parent
MODEL_PATH = BASE_DIR / "random_forest_tuned_best.pkl"
CONFIG_PATH= BASE_DIR / "tuned_model_config.json"

SUPPORTED_CATEGORIES = [
    "food", "travel", "health", "utilities", "rent",
    "entertainment", "education", "misc", "others",
]

MIN_HISTORY_MONTHS = 12

# ── Population-level monthly means from training data ─────────────────────────
# Extracted from:
#   monthly.groupby('refined_category')['total_amount'].mean()
# These are the actual mean monthly totals the model was trained on (all users aggregated).
POPULATION_CATEGORY_MEANS = {
    "food"         : 1754168.00,
    "travel"       :  1176381.81,
    "health"       :  1291446.19,
    "utilities"    :   929630.88,
    "rent"         :  1109215.40,
    "entertainment":   570588.42,
    "education"    :   469532.77,
    "misc"         :   226424.71,
    "others"       :   127744.54,
}


# ══════════════════════════════════════════════════════════════════════════════
#  MODEL LOADING
# ══════════════════════════════════════════════════════════════════════════════

def load_model_and_config():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model file not found: {MODEL_PATH}\n"
            "Place 'random_forest_tuned_best.pkl' in the same directory."
        )
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(
            f"Config file not found: {CONFIG_PATH}\n"
            "Place 'tuned_model_config.json' in the same directory."
        )
    model = joblib.load(MODEL_PATH)
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
#  PERSONAL SCALE CORRECTION
# ══════════════════════════════════════════════════════════════════════════════

def apply_personal_scale(
    raw_model_prediction: float,
    user_amounts: np.ndarray,
    category: str,
) -> float:
    """
    Correct the model's population-scale prediction down to the user's
    personal spending scale.

    Strategy — Relative Prediction:
    ─────────────────────────────────
    1. Compute what % change the model predicts vs the population baseline
       pct_change = (model_prediction - population_mean) / population_mean

    2. Apply that same % change to the user's own personal baseline
       personal_prediction = user_mean * (1 + pct_change)

    3. Soft-clamp: don't let the result go below 50% or above 200% of
       the user's own observed range — protects against extreme outliers.

    This preserves the model's learned seasonal patterns and trend direction
    while keeping the output anchored to the user's actual spending level.
    """
    population_mean = POPULATION_CATEGORY_MEANS.get(category, 50000.0)
    user_mean       = float(np.mean(user_amounts))

    # Step 1 — what % change does the model expect?
    pct_change = (raw_model_prediction - population_mean) / (population_mean + 1e-8)
    logger.debug("  population_mean=%.0f  raw_pred=%.0f  pct_change=%.3f",
                 population_mean, raw_model_prediction, pct_change)

    # Step 2 — apply that % change to the user's own mean
    personal_prediction = user_mean * (1.0 + pct_change)

    # Step 3 — soft-clamp to a reasonable range around user's history
    user_min   = float(np.min(user_amounts))
    user_max   = float(np.max(user_amounts))
    lower_bound = user_min * 0.5   # at most 50% below their lowest month
    upper_bound = user_max * 2.0   # at most 2× their highest month

    clamped = float(np.clip(personal_prediction, lower_bound, upper_bound))

    logger.info(
        "  Scale correction: raw=%.0f → personal=%.0f → clamped=%.0f  "
        "(user_mean=%.0f  pct_change=%+.1f%%)",
        raw_model_prediction, personal_prediction, clamped,
        user_mean, pct_change * 100,
    )
    return clamped


# ══════════════════════════════════════════════════════════════════════════════
#  FEATURE ENGINEERING  (mirrors the training notebook exactly)
# ══════════════════════════════════════════════════════════════════════════════

def build_features(
    history: List[dict],
    target_year: int,
    target_month: int,
    category: str,
) -> pd.DataFrame:
    """
    Build the full feature vector for one prediction row.

    Parameters
    ----------
    history      : list of dicts — keys: year_month (YYYY-MM), total_amount,
                   transaction_count (optional), unique_users (optional)
    target_year  : year of month to predict
    target_month : month number (1–12) to predict
    category     : expense category string

    Returns
    -------
    pd.DataFrame with one row matching FEATURE_COLS order
    """
    hist_df = pd.DataFrame(history)
    hist_df["date"] = pd.to_datetime(hist_df["year_month"], format="%Y-%m")
    hist_df = hist_df.sort_values("date").reset_index(drop=True)

    amounts = hist_df["total_amount"].values.astype(float)
    counts  = (
        hist_df["transaction_count"].values.astype(float)
        if "transaction_count" in hist_df.columns
        else np.ones(len(hist_df))
    )
    n = len(amounts)

    # ── Helper lambdas ────────────────────────────────────────────────────────
    def safe_get(arr, idx):
        return float(arr[idx]) if 0 <= idx < len(arr) else 0.0

    def roll_mean(arr, end, w):
        sub = arr[max(0, end - w):end]
        return float(np.mean(sub)) if len(sub) > 0 else 0.0

    def roll_std(arr, end, w):
        sub = arr[max(0, end - w):end]
        return float(np.std(sub)) if len(sub) > 1 else 0.0

    def roll_max(arr, end, w):
        sub = arr[max(0, end - w):end]
        return float(np.max(sub)) if len(sub) > 0 else 0.0

    def roll_min(arr, end, w):
        sub = arr[max(0, end - w):end]
        return float(np.min(sub)) if len(sub) > 0 else 0.0

    # ── 1. Time features ──────────────────────────────────────────────────────
    base_idx   = hist_df["date"].iloc[0].year * 12 + hist_df["date"].iloc[0].month
    time_index = (target_year * 12 + target_month) - base_idx
    quarter    = (target_month - 1) // 3 + 1

    row = {
        "year"           : target_year,
        "month"          : target_month,
        "quarter"        : quarter,
        "month_sin"      : np.sin(2 * np.pi * target_month / 12),
        "month_cos"      : np.cos(2 * np.pi * target_month / 12),
        "quarter_sin"    : np.sin(2 * np.pi * quarter / 4),
        "quarter_cos"    : np.cos(2 * np.pi * quarter / 4),
        "time_index"     : time_index,
        "is_year_start"  : int(target_month == 1),
        "is_year_end"    : int(target_month == 12),
        "is_quarter_end" : int(target_month in [3, 6, 9, 12]),
        "is_summer"      : int(target_month in [4, 5, 6]),
        "is_festive"     : int(target_month in [10, 11]),
        "is_monsoon"     : int(target_month in [7, 8, 9]),
    }

    # ── 2. Lag features ───────────────────────────────────────────────────────
    for lag in [1, 2, 3, 6, 12]:
        row[f"lag_{lag}m"]       = safe_get(amounts, n - lag)
        row[f"lag_{lag}m_count"] = safe_get(counts,  n - lag)

    # ── 3. Rolling window features ────────────────────────────────────────────
    for w in [3, 6, 12]:
        row[f"roll_mean_{w}m"] = roll_mean(amounts, n, w)
        row[f"roll_std_{w}m"]  = roll_std(amounts,  n, w)
        row[f"roll_max_{w}m"]  = roll_max(amounts,  n, w)
        row[f"roll_min_{w}m"]  = roll_min(amounts,  n, w)

    # ── 4. Change / MoM / YoY features ───────────────────────────────────────
    prev1, prev2   = safe_get(amounts, n - 1),  safe_get(amounts, n - 2)
    prev12, prev13 = safe_get(amounts, n - 12), safe_get(amounts, n - 13)
    r3             = roll_mean(amounts, n, 3)

    row["mom_change"]      = prev1 - prev2
    row["mom_pct_change"]  = (prev1 - prev2) / (prev2 + 1e-8)
    row["yoy_lag_12m"]     = prev12
    row["yoy_pct_change"]  = (prev12 - prev13) / (prev13 + 1e-8)
    row["ratio_to_3m_avg"] = prev1 / (r3 + 1e-8)

    # ── 5. Category global stats — from USER history (not population) ─────────
    # NOTE: These are intentionally left as user-level stats.
    #       The scale correction in apply_personal_scale() handles the offset.
    row["cat_global_mean"]        = float(np.mean(amounts))
    row["cat_global_median"]      = float(np.median(amounts))
    row["cat_global_std"]         = float(np.std(amounts))
    row["cat_global_max"]         = float(np.max(amounts))
    row["cat_global_min"]         = float(np.min(amounts))
    row["cat_cv"]                 = float(np.std(amounts) / (np.mean(amounts) + 1e-8))

    same_month_vals = amounts[
        [i for i in range(n) if hist_df["date"].iloc[i].month == target_month]
    ]
    row["cat_same_month_hist_avg"] = (
        float(np.mean(same_month_vals)) if len(same_month_vals) > 0
        else row["cat_global_mean"]
    )

    # ── 6. Transaction aggregates ─────────────────────────────────────────────
    row["transaction_count"] = safe_get(counts, n - 1)
    row["unique_users"]      = (
        float(hist_df["unique_users"].iloc[-1])
        if "unique_users" in hist_df.columns else 1.0
    )

    # ── 7. Category encoding ──────────────────────────────────────────────────
    row["category_label"] = CATEGORY_LABELS.get(category, 0)
    for cat in sorted(SUPPORTED_CATEGORIES):
        row[f"cat_{cat}"] = int(cat == category)

    # ── Align columns to exact training order ─────────────────────────────────
    return pd.DataFrame([{col: row.get(col, 0.0) for col in FEATURE_COLS}])


def predict_amount(
    features_df: pd.DataFrame,
    user_amounts: np.ndarray,
    category: str,
) -> float:
    """
    Run model prediction, invert log transform, then apply personal
    scale correction to bring output into the user's actual spending range.
    """
    raw = model.predict(features_df)[0]

    # Invert log transform (applied during training if skewness > 1.0)
    population_pred = float(np.expm1(raw)) if USE_LOG else float(max(raw, 0.0))

    # Correct from population scale → user's personal scale
    return apply_personal_scale(population_pred, user_amounts, category)


# ══════════════════════════════════════════════════════════════════════════════
#  PYDANTIC SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class MonthlyRecord(BaseModel):
    """One month of expense data for a category."""
    year_month        : str   = Field(..., example="2024-09",
                                      description="Format: YYYY-MM")
    total_amount      : float = Field(..., ge=0, example=6500.0)
    transaction_count : int   = Field(default=1, ge=0, example=4)
    unique_users      : Optional[int] = Field(default=None, example=1)

    @validator("year_month")
    def validate_year_month(cls, v):
        try:
            datetime.strptime(v, "%Y-%m")
        except ValueError:
            raise ValueError("year_month must be in YYYY-MM format (e.g. '2024-09')")
        return v


class PredictRequest(BaseModel):
    """Request body for /predict."""
    category     : str
    history      : List[MonthlyRecord] = Field(
        ..., min_items=MIN_HISTORY_MONTHS,
        description=f"At least {MIN_HISTORY_MONTHS} months of history, oldest → newest"
    )
    target_year  : Optional[int]  = Field(default=None, example=2025)
    target_month : Optional[int]  = Field(default=None, ge=1, le=12, example=1)

    @validator("category")
    def validate_category(cls, v):
        v = v.lower().strip()
        if v not in SUPPORTED_CATEGORIES:
            raise ValueError(
                f"Unsupported category '{v}'. Supported: {SUPPORTED_CATEGORIES}"
            )
        return v


class PredictionResult(BaseModel):
    category          : str
    target_year_month : str
    predicted_amount  : float
    confidence_note   : str


class BatchPredictRequest(BaseModel):
    predictions: List[PredictRequest]


class FuturePredictRequest(BaseModel):
    category     : str
    history      : List[MonthlyRecord]
    months_ahead : int = Field(default=3, ge=1, le=12)

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
        "Random Forest model with personal scale correction."
    ),
    version  = "2.0.0",
    docs_url = "/docs",
    redoc_url= "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],   # Restrict to your domain in production
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status"     : "ok",
        "version"    : "2.0.0 (personal scale correction enabled)",
        "model"      : "Random Forest",
        "test_mae"   : cfg.get("test_mae"),
        "test_r2"    : cfg.get("test_r2"),
        "categories" : SUPPORTED_CATEGORIES,
        "timestamp"  : datetime.utcnow().isoformat(),
    }


@app.get("/categories", tags=["System"])
def get_categories():
    return {
        "categories"         : SUPPORTED_CATEGORIES,
        "min_history_months" : MIN_HISTORY_MONTHS,
    }


@app.get("/model/info", tags=["System"])
def model_info():
    return {
        "model_type"                : "RandomForestRegressor",
        "version"                   : "2.0.0",
        "scale_correction"          : "personal (relative % change applied to user baseline)",
        "population_category_means" : POPULATION_CATEGORY_MEANS,
        "best_tuning_method"        : cfg.get("best_tuning_method"),
        "best_params"               : cfg.get("best_params"),
        "n_features"                : len(FEATURE_COLS),
        "use_log_transform"         : USE_LOG,
        "test_mae"                  : cfg.get("test_mae"),
        "test_rmse"                 : cfg.get("test_rmse"),
        "test_r2"                   : cfg.get("test_r2"),
        "test_mape_pct"             : cfg.get("test_mape_pct"),
    }


@app.post("/predict", response_model=PredictionResult, tags=["Prediction"],
          summary="Predict next month's expense for one category")
def predict(req: PredictRequest):
    """
    Predict the total expense for one category for a specific month.
    Automatically applies personal scale correction so predictions
    match the individual user's spending range.

    Request body example:
    {
      "category": "utilities",
      "history": [
        {"year_month": "2024-01", "total_amount": 4500, "transaction_count": 2},
        {"year_month": "2024-02", "total_amount": 3800, "transaction_count": 2},
        ... (at least 12 months total)
      ]
    }
    """
    try:
        # Determine target month
        if req.target_year and req.target_month:
            t_year, t_month = req.target_year, req.target_month
        else:
            last_dt = datetime.strptime(req.history[-1].year_month, "%Y-%m")
            t_year  = last_dt.year + (1 if last_dt.month == 12 else 0)
            t_month = 1 if last_dt.month == 12 else last_dt.month + 1

        history_dicts = [h.dict() for h in req.history]
        user_amounts  = np.array([h["total_amount"] for h in history_dicts])

        features   = build_features(history_dicts, t_year, t_month, req.category)
        prediction = predict_amount(features, user_amounts, req.category)

        target_ym = f"{t_year}-{str(t_month).zfill(2)}"
        logger.info("Predicted  category=%-15s  period=%s  amount=%.0f",
                    req.category, target_ym, prediction)

        return PredictionResult(
            category          = req.category,
            target_year_month = target_ym,
            predicted_amount  = round(prediction, 2),
            confidence_note   = (
                f"Based on {len(req.history)} months of personal history. "
                f"User mean: {float(np.mean(user_amounts)):,.0f}. "
                f"Personal scale correction applied."
            ),
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=str(e))
    except Exception as e:
        logger.error("Prediction error: %s", str(e), exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Prediction failed: {str(e)}")


@app.post("/predict/batch", tags=["Prediction"],
          summary="Predict for multiple categories in one call")
def predict_batch(req: BatchPredictRequest):
    """
    Predict for multiple categories in a single request.
    Personal scale correction is applied per-category independently.
    """
    results, errors = [], []
    for single_req in req.predictions:
        try:
            result = predict(single_req)
            results.append(result.dict())
        except HTTPException as e:
            errors.append({"category": single_req.category, "error": e.detail})

    return {
        "predictions": results,
        "errors"     : errors,
        "total"      : len(results),
        "failed"     : len(errors),
    }


@app.post("/predict/future", tags=["Prediction"],
          summary="Predict N months into the future for one category")
def predict_future(req: FuturePredictRequest):
    """
    Rolling forecast for 1–12 future months.
    Each predicted value is appended to history before predicting the next.
    Personal scale correction is applied at every step.
    """
    try:
        history_dicts   = [h.dict() for h in req.history]
        rolling_amounts = [h["total_amount"] for h in history_dicts]
        rolling_counts  = [h.get("transaction_count", 1) for h in history_dicts]

        last_dt    = datetime.strptime(req.history[-1].year_month, "%Y-%m")
        curr_year  = last_dt.year
        curr_month = last_dt.month

        # Keep original user amounts for scale reference (don't drift with predictions)
        original_user_amounts = np.array(rolling_amounts.copy())

        future_predictions = []

        for step in range(req.months_ahead):
            # Advance one month
            curr_year, curr_month = (
                (curr_year + 1, 1) if curr_month == 12
                else (curr_year, curr_month + 1)
            )

            # Reconstruct temp history with correct year_month strings
            start_dt     = datetime.strptime(req.history[0].year_month, "%Y-%m")
            temp_history = []
            for i, (amt, cnt) in enumerate(zip(rolling_amounts, rolling_counts)):
                raw_m = start_dt.month + i
                y     = start_dt.year + (raw_m - 1) // 12
                m     = ((raw_m - 1) % 12) + 1
                temp_history.append({
                    "year_month"       : f"{y}-{str(m).zfill(2)}",
                    "total_amount"     : amt,
                    "transaction_count": cnt,
                })

            features   = build_features(temp_history, curr_year, curr_month, req.category)

            # Always scale against original user amounts — prevents drift
            prediction = predict_amount(features, original_user_amounts, req.category)

            target_ym = f"{curr_year}-{str(curr_month).zfill(2)}"
            future_predictions.append({
                "year_month"      : target_ym,
                "predicted_amount": round(prediction, 2),
                "step"            : step + 1,
            })
            logger.info("Future step %d  category=%-12s  period=%s  amount=%.0f",
                        step + 1, req.category, target_ym, prediction)

            # Append predicted value for next step's lag features
            rolling_amounts.append(prediction)
            rolling_counts.append(rolling_counts[-1])

        return {
            "category"    : req.category,
            "predictions" : future_predictions,
            "months_ahead": req.months_ahead,
            "user_mean"   : round(float(np.mean(original_user_amounts)), 2),
            "note"        : (
                "Personal scale correction applied at every step. "
                "Predictions reflect seasonal/trend patterns anchored "
                "to this user's own spending history."
            ),
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
        workers = 1,
    )
