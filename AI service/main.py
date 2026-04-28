from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
import pandas as pd
import numpy as np
import joblib
import os
import logging

# ── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(title="Overspender Classifier API", version="1.0.0")
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten this in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load model & feature list ─────────────────────────────────────────────────

BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH   = os.path.join(BASE_DIR, "overspender_model.pkl")
FEATURE_PATH = os.path.join(BASE_DIR, "overspender_feature_cols.pkl")

model        = joblib.load(MODEL_PATH)
FEATURE_COLS = joblib.load(FEATURE_PATH)

# Category and payment mode constants — must match training data
EXPENSE_CATEGORIES = [
    "education", "entertainment", "food", "health",
    "misc", "others", "rent", "savings", "travel", "utilities"
]
INCOME_CATEGORIES  = ["salary", "freelance", "investment", "bonus"]
NON_ESSENTIAL_CATS = ["travel", "entertainment", "misc", "others"]
ESSENTIAL_CATS     = ["food", "health", "utilities", "rent", "education"]
PAYMENT_MODES      = ["Online", "Card", "Cash", "Other"]

THRESHOLD = 0.40   # adjust based on your threshold tuning results

# ── Request / Response schemas ────────────────────────────────────────────────

class Transaction(BaseModel):
    date            : str          # "YYYY-MM-DD" or "DD-MM-YY"
    transaction_type: str          # "Expense" or "Income"
    payment_mode    : str          # "Online", "Card", "Cash", "Other"
    amount          : float
    refined_category: str          # e.g. "food", "travel", "salary"
    location        : Optional[str] = "unknown"


class PredictionRequest(BaseModel):
    user_id             : str
    transactions        : List[Transaction]  # last 3 months of transactions
    historical_monthly_median: Optional[float] = None
    # ^ pass the user's long-term monthly expense median for expense_vs_baseline.
    #   If None, it is computed from the provided transactions (less accurate
    #   for new users with little history).


class PredictionResponse(BaseModel):
    user_id            : str
    is_overspender     : bool
    probability        : float
    risk_level         : str       # "Low", "Moderate", "High"
    window_expense     : float
    window_income      : float
    top_expense_category: str
    window_start       : Optional[str] = None
    window_end         : Optional[str] = None
    message            : str


class TrendPoint(BaseModel):
    window_start       : str
    window_end         : str
    probability        : float
    is_overspender     : bool
    risk_level         : str
    top_expense_category: str


class TrendResponse(BaseModel):
    user_id            : str
    trend              : List[TrendPoint]
    trend_available    : bool
    message            : str


# ── Feature computation ───────────────────────────────────────────────────────

def prepare_dataframe(request: PredictionRequest) -> pd.DataFrame:
    records = [t.dict() for t in request.transactions]
    df = pd.DataFrame(records)
    if df.empty:
        return df

    # The Java backend sends ISO dates (yyyy-MM-dd). Parse that format first,
    # then fall back to a legacy parser only for older imported records.
    parsed_dates = pd.to_datetime(df["date"], format="%Y-%m-%d", errors="coerce")
    if parsed_dates.isna().any():
        fallback_dates = pd.to_datetime(df.loc[parsed_dates.isna(), "date"], dayfirst=True, errors="coerce")
        parsed_dates.loc[parsed_dates.isna()] = fallback_dates

    df["date"] = parsed_dates
    invalid_dates = int(df["date"].isna().sum())
    if invalid_dates > 0:
        logger.warning("Dropped %s transactions with invalid dates for user %s", invalid_dates, request.user_id)
        df = df.dropna(subset=["date"]).copy()

    if df.empty:
        return df

    if "location" in df.columns:
        df["location"] = df["location"].fillna("unknown")

    df = df.sort_values("date").reset_index(drop=True)
    df["year_month"] = df["date"].dt.to_period("M")
    return df


def compute_historical_median_from_df(expense_df: pd.DataFrame) -> float:
    if expense_df.empty:
        return 1.0

    monthly_exp = expense_df.groupby("year_month")["amount"].sum()
    if len(monthly_exp) == 0:
        return 1.0

    return float(monthly_exp.median()) if monthly_exp.median() > 0 else 1.0


def compute_features_from_df(request: PredictionRequest, df: pd.DataFrame) -> tuple[dict, str, str, str]:
    """
    Takes a list of transactions (last 3 months) and computes
    the 31 features the model expects.
    """

    # Split income vs expense
    income_mask  = (df["transaction_type"] == "Income") | \
                   (df["refined_category"].isin(INCOME_CATEGORIES))
    expense_mask = (df["transaction_type"] == "Expense") & \
                   (~df["refined_category"].isin(INCOME_CATEGORIES))

    inc_df = df[income_mask]
    exp_df = df[expense_mask]

    total_expense = exp_df["amount"].sum()
    total_income  = inc_df["amount"].sum()

    # Monthly expense breakdown
    monthly_exp = exp_df.groupby("year_month")["amount"].sum()

    avg_monthly  = monthly_exp.mean()  if len(monthly_exp) > 0 else 0.0
    max_monthly  = monthly_exp.max()   if len(monthly_exp) > 0 else 0.0
    min_monthly  = monthly_exp.min()   if len(monthly_exp) > 0 else 0.0
    std_monthly  = monthly_exp.std()   if len(monthly_exp) > 1 else 0.0

    # expense_vs_baseline — compare this window to user's historical median
    historical_median = request.historical_monthly_median
    if historical_median is None or historical_median == 0:
        historical_median = compute_historical_median_from_df(exp_df)
    expense_vs_baseline = avg_monthly / historical_median

    # Category ratios
    cat_totals = exp_df.groupby("refined_category")["amount"].sum()
    cat_ratios = {}
    for cat in EXPENSE_CATEGORIES:
        cat_ratios[f"ratio_{cat}"] = (
            cat_totals.get(cat, 0.0) / total_expense if total_expense > 0 else 0.0
        )

    # Payment mode ratios
    mode_totals = exp_df.groupby("payment_mode")["amount"].sum()
    pay_ratios  = {}
    for mode in PAYMENT_MODES:
        pay_ratios[f"pay_{mode.lower()}"] = (
            mode_totals.get(mode, 0.0) / total_expense if total_expense > 0 else 0.0
        )

    # Top expense category (for response message)
    top_cat = cat_totals.idxmax() if len(cat_totals) > 0 else "unknown"
    window_start = df["date"].min().date().isoformat() if len(df) > 0 else None
    window_end = df["date"].max().date().isoformat() if len(df) > 0 else None

    features = {
        # Income
        "window_income"          : total_income,
        "income_txn_count"       : len(inc_df),
        "has_income"             : int(len(inc_df) > 0),
        # Expense volume
        "window_expense"         : total_expense,
        "expense_txn_count"      : len(exp_df),
        "avg_expense_per_txn"    : exp_df["amount"].mean() if len(exp_df) > 0 else 0.0,
        "max_expense_per_txn"    : exp_df["amount"].max()  if len(exp_df) > 0 else 0.0,
        "std_expense_per_txn"    : exp_df["amount"].std()  if len(exp_df) > 1 else 0.0,
        # Monthly patterns
        "avg_monthly_expense"    : avg_monthly,
        "max_monthly_expense"    : max_monthly,
        "min_monthly_expense"    : min_monthly,
        "std_monthly_expense"    : std_monthly,
        "active_months_in_window": int(monthly_exp.nunique()),
        "net_cashflow"           : total_income - total_expense,
        "expense_vs_baseline"    : expense_vs_baseline,
        # Payment modes
        **pay_ratios,
        # Category ratios
        **cat_ratios,
        # Diversity
        "unique_categories"      : int(exp_df["refined_category"].nunique()),
        "unique_locations"       : int(df["location"].nunique()),
    }

    return features, top_cat, window_start, window_end


def predict_from_df(request: PredictionRequest, df: pd.DataFrame):
    features, top_cat, window_start, window_end = compute_features_from_df(request, df)

    input_df = pd.DataFrame([features])[FEATURE_COLS]
    probability = float(model.predict_proba(input_df)[0][1])
    is_overspender = probability >= THRESHOLD

    if probability < 0.30:
        risk_level = "Low"
    elif probability < 0.55:
        risk_level = "Moderate"
    else:
        risk_level = "High"

    if is_overspender:
        message = (
            f"⚠️ Overspending detected this period. "
            f"Highest spend in '{top_cat}' category. "
            f"Consider reviewing your {top_cat} budget."
        )
    else:
        message = (
            f"✅ Spending looks healthy this period. "
            f"Main expense category: '{top_cat}'."
        )

    return PredictionResponse(
        user_id=request.user_id,
        is_overspender=is_overspender,
        probability=round(probability, 4),
        risk_level=risk_level,
        window_expense=features["window_expense"],
        window_income=features["window_income"],
        top_expense_category=top_cat,
        window_start=window_start,
        window_end=window_end,
        message=message,
    )


def build_trend_points(request: PredictionRequest, df: pd.DataFrame) -> list[TrendPoint]:
    monthly_periods = pd.period_range(df["date"].dt.to_period("M").min(), df["date"].dt.to_period("M").max(), freq="M")
    if len(monthly_periods) < 4:
        return []

    trend = []
    global_historical_median = request.historical_monthly_median
    if global_historical_median is None or global_historical_median == 0:
        expense_df = df[(df["transaction_type"] == "Expense") & (~df["refined_category"].isin(INCOME_CATEGORIES))]
        global_historical_median = compute_historical_median_from_df(expense_df)

    for start_index in range(0, len(monthly_periods) - 2):
        window_start_period = monthly_periods[start_index]
        window_end_period = monthly_periods[start_index + 2]
        window_mask = (df["year_month"] >= window_start_period) & (df["year_month"] <= window_end_period)
        window_df = df[window_mask].copy()
        if window_df.empty:
            continue

        window_request = PredictionRequest(
            user_id=request.user_id,
            transactions=[],
            historical_monthly_median=global_historical_median,
        )
        prediction = predict_from_df(window_request, window_df)
        trend.append(
            TrendPoint(
                window_start=window_start_period.start_time.date().isoformat(),
                window_end=window_end_period.end_time.date().isoformat(),
                probability=prediction.probability,
                is_overspender=prediction.is_overspender,
                risk_level=prediction.risk_level,
                top_expense_category=prediction.top_expense_category,
            )
        )

    return trend


def summarize_trend(trend: list[TrendPoint]) -> str:
    if len(trend) < 2:
        return "Trend analysis available after 3 months of transaction data."

    first = trend[0].probability
    last = trend[-1].probability
    delta = last - first

    if delta > 0.05:
        return f"Your risk has been increasing over the last {len(trend)} windows."
    if delta < -0.05:
        return f"Your spending has improved over the last {len(trend)} windows."
    return f"Your spending risk has stayed fairly steady over the last {len(trend)} windows."


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Overspender Classifier API is running ✅"}


@app.get("/health")
def health():
    return {
        "status"      : "ok",
        "model_loaded": model is not None,
        "features"    : len(FEATURE_COLS),
        "threshold"   : THRESHOLD,
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):

    if len(request.transactions) == 0:
        raise HTTPException(status_code=400, detail="No transactions provided.")

    # Compute features
    try:
        df = prepare_dataframe(request)
        if df.empty:
            raise HTTPException(status_code=400, detail="No valid transactions provided after date parsing.")
        prediction = predict_from_df(request, df)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=422, detail=f"Feature computation error: {str(e)}")
    return prediction


@app.post("/predict/trend", response_model=TrendResponse)
def predict_trend(request: PredictionRequest):
    if len(request.transactions) == 0:
        raise HTTPException(status_code=400, detail="No transactions provided.")

    try:
        df = prepare_dataframe(request)
        if df.empty:
            raise HTTPException(status_code=400, detail="No valid transactions provided after date parsing.")
        trend = build_trend_points(request, df)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=422, detail=f"Trend computation error: {str(e)}")

    return TrendResponse(
        user_id=request.user_id,
        trend=trend,
        trend_available=len(trend) > 0,
        message=summarize_trend(trend),
    )


@app.post("/predict/batch")
def predict_batch(requests: List[PredictionRequest]):
    """
    Run predictions for multiple users at once.
    Useful for scheduled background jobs (e.g. monthly analysis).
    """
    results = []
    for req in requests:
        try:
            result = predict(req)
            results.append(result)
        except HTTPException as e:
            results.append({"user_id": req.user_id, "error": e.detail})
    return results


# ── Run ───────────────────────────────────────────────────────────────────────
# Start with: uvicorn main:app --reload --port 8000

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
