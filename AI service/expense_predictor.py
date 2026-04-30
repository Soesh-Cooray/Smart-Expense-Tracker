"""
╔══════════════════════════════════════════════════════════════╗
║         Smart Expense Tracker — ML Prediction Service        ║
║                     FastAPI Microservice                     ║
║                    v3 — Full Scale Fix                       ║
╚══════════════════════════════════════════════════════════════╝

FIX v3 — Full Input + Output Scale Correction
──────────────────────────────────────────────
Root cause: The model was trained on POPULATION-level aggregated monthly
totals (sum of ALL users per month = 100k–2M range). Individual users
spend far less (2k–10k). This causes two problems:

  Problem 1 — Input features out of range:
    lag_1m, roll_mean etc. are 2k–10k for the user.
    During training these were always 100k–2M.
    Random Forest cannot extrapolate → outputs garbage (~150–200).

  Problem 2 — Output in wrong scale:
    Even fixing only the output leaves the input broken,
    so the raw prediction is already meaningless.

  Fix — Scale in BOTH directions:
    1. Multiply all amount-based input features by (population_mean / user_mean)
       → Model now sees inputs in its expected training range
    2. Run model → get a sensible population-scale prediction
    3. Divide prediction by the same factor
       → Result is back in the user's personal spending range

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

BASE_DIR    = Path(__file__).parent
MODEL_PATH  = BASE_DIR / "random_forest_tuned_best.pkl"
CONFIG_PATH = BASE_DIR / "tuned_model_config.json"

SUPPORTED_CATEGORIES = [
    "food", "travel", "health", "utilities", "rent",
    "entertainment", "education", "misc", "others",
]

MIN_HISTORY_MONTHS = 12

# ── Actual population-level monthly means from training data ──────────────────
# Source: monthly.groupby('refined_category')['total_amount'].mean()
# These are the exact values the model learned to predict at.
POPULATION_CATEGORY_MEANS = {
    "food"         : 1754168.00,
    "travel"       : 1176381.81,
    "health"       : 1291446.19,
    "utilities"    :  929630.88,
    "rent"         : 1109215.40,
    "entertainment":  570588.42,
    "education"    :  469532.77,
    "misc"         :  226424.71,
    "others"       :  127744.54,
}

# Feature column prefixes that contain amount values and must be scaled
AMOUNT_FEATURE_PREFIXES = (
    "lag_",
    "roll_mean_",
    "roll_std_",
    "roll_max_",
    "roll_min_",
    "cat_global_mean",
    "cat_global_median",
    "cat_global_std",
    "cat_global_max",
    "cat_global_min",
    "cat_same_month_hist_avg",
    "mom_change",
    "yoy_lag_",
)


# ══════════════════════════════════════════════════════════════════════════════
#  MODEL LOADING
# ══════════════════════════════════════════════════════════════════════════════

def load_model_and_config():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model file not found: {MODEL_PATH}\n"
            "Place 'random_forest_tuned_best.pkl' in the same directory as this file."
        )
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(
            f"Config file not found: {CONFIG_PATH}\n"
            "Place 'tuned_model_config.json' in the same directory as this file."
        )
    m = joblib.load(MODEL_PATH)
    with open(CONFIG_PATH) as f:
        c = json.load(f)
    logger.info(
        "✅ Model loaded  |  features=%d  |  log_transform=%s  |  test_mae=%s",
        len(c["feature_cols"]), c["use_log_transform"], c["test_mae"]
    )
    return m, c

model, cfg   = load_model_and_config()
FEATURE_COLS    = cfg["feature_cols"]
USE_LOG         = cfg["use_log_transform"]
CATEGORY_LABELS = {cat: i for i, cat in enumerate(sorted(SUPPORTED_CATEGORIES))}


# ══════════════════════════════════════════════════════════════════════════════
#  FEATURE ENGINEERING  (mirrors training notebook exactly)
# ══════════════════════════════════════════════════════════════════════════════

def build_features(
    history: List[dict],
    target_year: int,
    target_month: int,
    category: str,
) -> pd.DataFrame:
    """
    Build the full feature vector for one prediction row.
    Raw user amounts are passed here — scaling is handled separately
    in predict_amount() before the model sees them.

    Parameters
    ----------
    history      : list of dicts with keys:
                   year_month (YYYY-MM), total_amount,
                   transaction_count (optional), unique_users (optional)
    target_year  : year of the month to predict
    target_month : month number 1–12 to predict
    category     : expense category string

    Returns
    -------
    pd.DataFrame — one row, columns matching FEATURE_COLS
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

    # ── 5. Category global stats ──────────────────────────────────────────────
    row["cat_global_mean"]         = float(np.mean(amounts))
    row["cat_global_median"]       = float(np.median(amounts))
    row["cat_global_std"]          = float(np.std(amounts))
    row["cat_global_max"]          = float(np.max(amounts))
    row["cat_global_min"]          = float(np.min(amounts))
    row["cat_cv"]                  = float(np.std(amounts) / (np.mean(amounts) + 1e-8))

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

    return pd.DataFrame([{col: row.get(col, 0.0) for col in FEATURE_COLS}])


# ══════════════════════════════════════════════════════════════════════════════
#  PREDICTION WITH FULL INPUT + OUTPUT SCALE CORRECTION
# ══════════════════════════════════════════════════════════════════════════════

def predict_amount(
    features_df: pd.DataFrame,
    user_amounts: np.ndarray,
    category: str,
) -> float:
    """
    Run model prediction with full input + output scale correction.

    Why this is needed
    ──────────────────
    The model was trained on population-level data where monthly totals
    were in the 100k–2M range. An individual user's data is 2k–10k.
    Feeding small numbers into a Random Forest that only knows large
    numbers produces garbage output (150–200 in our case).

    The fix
    ───────
    1. scale_factor = population_mean / user_mean
       e.g. 929,630 / 6,000 = 154.9  (for utilities)

    2. Multiply all amount-based input features by scale_factor
       e.g. lag_1m: 5000 → 774,500  (now in model's expected range)

    3. Run model → population-scale prediction
       e.g. model outputs ~900,000

    4. Divide by scale_factor → personal prediction
       e.g. 900,000 / 154.9 = 5,810  ✅ realistic for this user

    5. Soft-clamp to 50%–200% of user's observed min/max
       Prevents extreme outliers on edge months
    """
    user_mean       = float(np.mean(user_amounts))
    population_mean = POPULATION_CATEGORY_MEANS.get(category, 1000000.0)
    scale_factor    = population_mean / (user_mean + 1e-8)

    logger.info(
        "  [%s] user_mean=%.0f  pop_mean=%.0f  scale_factor=%.1fx",
        category, user_mean, population_mean, scale_factor,
    )

    # ── Step 1: Scale amount-based inputs UP to population range ──────────────
    scaled_df = features_df.copy()
    for col in scaled_df.columns:
        if any(col.startswith(p) or col == p for p in AMOUNT_FEATURE_PREFIXES):
            scaled_df[col] = scaled_df[col] * scale_factor

    # ── Step 2: Run model on population-scale inputs ──────────────────────────
    raw             = model.predict(scaled_df)[0]
    population_pred = float(np.expm1(raw)) if USE_LOG else float(max(raw, 0.0))

    # ── Step 3: Scale prediction back DOWN to user's personal range ───────────
    personal_pred = population_pred / scale_factor

    # ── Step 4: Soft-clamp to a sane range around user's history ─────────────
    lower = float(np.min(user_amounts)) * 0.5
    upper = float(np.max(user_amounts)) * 2.0
    final = float(np.clip(personal_pred, lower, upper))

    logger.info(
        "  [%s] pop_pred=%.0f → personal=%.0f → clamped=%.0f",
        category, population_pred, personal_pred, final,
    )
    return final


# ══════════════════════════════════════════════════════════════════════════════
#  PYDANTIC SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class MonthlyRecord(BaseModel):
    """One month of aggregated expense data for a category."""
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
            raise ValueError("year_month must be in YYYY-MM format e.g. '2024-09'")
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
    """Request body for /predict/future."""
    category     : str
    history      : List[MonthlyRecord]
    months_ahead : int = Field(default=3, ge=1, le=12,
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
        "Random Forest model with full input+output scale correction (v3)."
    ),
    version  = "3.0.0",
    docs_url = "/docs",
    redoc_url= "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],   # Restrict to your actual domain in production
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/health", tags=["System"])
def health_check():
    """Health check. Java backend should ping this on startup."""
    return {
        "status"    : "ok",
        "version"   : "3.0.0 (full input+output scale correction)",
        "model"     : "Random Forest",
        "test_mae"  : cfg.get("test_mae"),
        "test_r2"   : cfg.get("test_r2"),
        "categories": SUPPORTED_CATEGORIES,
        "timestamp" : datetime.utcnow().isoformat(),
    }


@app.get("/categories", tags=["System"])
def get_categories():
    """Return the list of supported expense categories."""
    return {
        "categories"         : SUPPORTED_CATEGORIES,
        "min_history_months" : MIN_HISTORY_MONTHS,
    }


@app.get("/model/info", tags=["System"])
def model_info():
    """Return model metadata and training configuration."""
    return {
        "model_type"                : "RandomForestRegressor",
        "version"                   : "3.0.0",
        "scale_correction"          : "full input + output (v3)",
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


@app.post(
    "/predict",
    response_model = PredictionResult,
    tags           = ["Prediction"],
    summary        = "Predict next month's expense for one category",
)
def predict(req: PredictRequest):
    """
    Predict the total monthly expense for a single category.
    Full input+output scale correction is applied automatically
    so predictions match the individual user's spending range.

    Minimum 12 months of history required.

    Example request:
    {
      "category": "utilities",
      "history": [
        {"year_month": "2024-01", "total_amount": 4500, "transaction_count": 2},
        {"year_month": "2024-02", "total_amount": 3800, "transaction_count": 2},
        ... at least 12 months total, sorted oldest to newest
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
        logger.info("✅ Predicted  category=%-15s  period=%s  amount=%.0f",
                    req.category, target_ym, prediction)

        return PredictionResult(
            category          = req.category,
            target_year_month = target_ym,
            predicted_amount  = round(prediction, 2),
            confidence_note   = (
                f"Based on {len(req.history)} months of personal history. "
                f"User mean: {float(np.mean(user_amounts)):,.0f}. "
                f"Full scale correction applied (v3)."
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
    Predict for multiple categories in a single request.
    Scale correction is applied per-category independently.
    Useful for loading the full budget dashboard in React.
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


@app.post(
    "/predict/future",
    tags    = ["Prediction"],
    summary = "Predict N months into the future for one category",
)
def predict_future(req: FuturePredictRequest):
    """
    Rolling forecast for 1–12 future months.

    Each predicted value feeds into the next step as a lag feature.
    Scale correction is anchored to the ORIGINAL user history at every
    step to prevent the predictions from drifting over time.

    Use this to power a forecast chart in React.
    """
    try:
        history_dicts         = [h.dict() for h in req.history]
        rolling_amounts       = [h["total_amount"] for h in history_dicts]
        rolling_counts        = [h.get("transaction_count", 1) for h in history_dicts]

        # Keep original amounts as the scale anchor — never update this
        original_user_amounts = np.array(rolling_amounts.copy())

        last_dt    = datetime.strptime(req.history[-1].year_month, "%Y-%m")
        curr_year  = last_dt.year
        curr_month = last_dt.month

        future_predictions = []

        for step in range(req.months_ahead):
            # Advance one month
            curr_year, curr_month = (
                (curr_year + 1, 1) if curr_month == 12
                else (curr_year, curr_month + 1)
            )

            # Rebuild temp history with correct year_month strings
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

            features = build_features(
                temp_history, curr_year, curr_month, req.category
            )

            # Always scale against ORIGINAL user history — prevents drift
            prediction = predict_amount(
                features, original_user_amounts, req.category
            )

            target_ym = f"{curr_year}-{str(curr_month).zfill(2)}"
            future_predictions.append({
                "year_month"      : target_ym,
                "predicted_amount": round(prediction, 2),
                "step"            : step + 1,
            })
            logger.info("  Future step %d  category=%-12s  period=%s  amount=%.0f",
                        step + 1, req.category, target_ym, prediction)

            # Append prediction so next step has it as lag_1m
            rolling_amounts.append(prediction)
            rolling_counts.append(rolling_counts[-1])

        return {
            "category"    : req.category,
            "predictions" : future_predictions,
            "months_ahead": req.months_ahead,
            "user_mean"   : round(float(np.mean(original_user_amounts)), 2),
            "note"        : (
                "Full input+output scale correction applied at every step. "
                "Predictions reflect seasonal patterns anchored to this "
                "user's own spending history."
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
        workers = 1,   # Keep at 1 — model is loaded once into memory
    )
