from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
import pandas as pd
import numpy as np
import joblib
import os

# ── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(title="Overspender Classifier API", version="1.0.0")

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
    message            : str


# ── Feature computation ───────────────────────────────────────────────────────

def compute_features(request: PredictionRequest) -> dict:
    """
    Takes a list of transactions (last 3 months) and computes
    the 31 features the model expects.
    """

    # Parse into DataFrame
    records = [t.dict() for t in request.transactions]
    df      = pd.DataFrame(records)
    df["date"] = pd.to_datetime(df["date"], dayfirst=True)
    df["year_month"] = df["date"].dt.to_period("M")

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
        historical_median = avg_monthly if avg_monthly > 0 else 1.0
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

    return features, top_cat


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
        features, top_cat = compute_features(request)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Feature computation error: {str(e)}")

    # Build input DataFrame in correct column order
    input_df = pd.DataFrame([features])[FEATURE_COLS]

    # Predict
    probability  = float(model.predict_proba(input_df)[0][1])
    is_overspender = probability >= THRESHOLD

    # Risk level
    if probability < 0.30:
        risk_level = "Low"
    elif probability < 0.55:
        risk_level = "Moderate"
    else:
        risk_level = "High"

    # Human-readable message
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
        user_id             = request.user_id,
        is_overspender      = is_overspender,
        probability         = round(probability, 4),
        risk_level          = risk_level,
        window_expense      = features["window_expense"],
        window_income       = features["window_income"],
        top_expense_category= top_cat,
        message             = message,
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
