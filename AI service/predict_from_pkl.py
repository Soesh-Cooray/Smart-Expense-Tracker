"""
predict_from_pkl.py

Use this file to test the trained budget time-series model.
Required files in same folder:
1. budget_time_series_model.pkl
2. expenses_feature_engineered_full.csv
"""

import pickle
import math
import pandas as pd
import numpy as np


PKL_PATH = "budget_time_series_model.pkl"
CSV_PATH = "expenses_feature_engineered_full.csv"


def month_features(year: int, month: int):
    quarter = ((month - 1) // 3) + 1
    return {
        "year": year,
        "month": month,
        "quarter": quarter,
        "month_sin": math.sin(2 * math.pi * month / 12),
        "month_cos": math.cos(2 * math.pi * month / 12),
        "quarter_sin": math.sin(2 * math.pi * quarter / 4),
        "quarter_cos": math.cos(2 * math.pi * quarter / 4),
        "is_year_start": 1 if month == 1 else 0,
        "is_year_end": 1 if month == 12 else 0,
        "is_quarter_end": 1 if month in [3, 6, 9, 12] else 0,
        "is_summer": 1 if month in [4, 5, 6] else 0,
        "is_festive": 1 if month in [11, 12] else 0,
        "is_monsoon": 1 if month in [5, 6, 9, 10] else 0,
    }


def safe_pct(numerator, denominator):
    if denominator == 0:
        return 0
    return numerator / denominator


def create_next_month_features(df: pd.DataFrame, feature_columns):
    df = df.copy()
    df = df.sort_values(["year", "month", "refined_category"])

    latest_year = int(df["year"].max())
    latest_month = int(df[df["year"] == latest_year]["month"].max())

    if latest_month == 12:
        next_year = latest_year + 1
        next_month = 1
    else:
        next_year = latest_year
        next_month = latest_month + 1

    next_period = f"{next_year}-{next_month:02d}"
    rows = []

    for category in sorted(df["refined_category"].unique()):
        cat_df = df[df["refined_category"] == category].sort_values(["year", "month"]).copy()
        latest = cat_df.iloc[-1].copy()

        amounts = cat_df["total_amount"].astype(float).tolist()
        counts = cat_df["transaction_count"].astype(float).tolist()

        row = latest.to_dict()
        row.update(month_features(next_year, next_month))

        # advance time index by 1 from latest row
        row["time_index"] = int(latest.get("time_index", 0)) + 1

        # transaction_count and unique_users for future month are unknown, so use recent average
        row["transaction_count"] = float(np.mean(counts[-3:])) if counts else 0
        row["unique_users"] = float(latest.get("unique_users", 0))

        # lag features
        for lag in [1, 2, 3, 6, 12]:
            row[f"lag_{lag}m"] = amounts[-lag] if len(amounts) >= lag else 0
            row[f"lag_{lag}m_count"] = counts[-lag] if len(counts) >= lag else 0

        # rolling features
        for window in [3, 6, 12]:
            recent = amounts[-window:] if len(amounts) >= 1 else [0]
            row[f"roll_mean_{window}m"] = float(np.mean(recent))
            row[f"roll_std_{window}m"] = float(np.std(recent))
            row[f"roll_max_{window}m"] = float(np.max(recent))
            row[f"roll_min_{window}m"] = float(np.min(recent))

        last = amounts[-1] if len(amounts) >= 1 else 0
        prev = amounts[-2] if len(amounts) >= 2 else 0
        yoy = amounts[-12] if len(amounts) >= 12 else 0
        roll3 = row["roll_mean_3m"]

        row["mom_change"] = last - prev
        row["mom_pct_change"] = safe_pct(last - prev, prev)
        row["yoy_lag_12m"] = yoy
        row["yoy_pct_change"] = safe_pct(last - yoy, yoy)
        row["ratio_to_3m_avg"] = safe_pct(last, roll3)

        # one-hot category columns
        for col in feature_columns:
            if col.startswith("cat_"):
                expected_cat = col.replace("cat_", "")
                row[col] = 1 if str(category).lower() == expected_cat.lower() else 0

        # only model features in correct order
        feature_row = {col: row.get(col, 0) for col in feature_columns}
        rows.append({"category": category, **feature_row})

    feature_df = pd.DataFrame(rows)
    return next_period, feature_df


def forecast_next_month(budget_limit: float):
    with open(PKL_PATH, "rb") as file:
        bundle = pickle.load(file)

    model = bundle["model"]
    feature_columns = bundle["feature_columns"]

    df = pd.read_csv(CSV_PATH)
    next_period, feature_df = create_next_month_features(df, feature_columns)

    X_next = feature_df[feature_columns].replace([np.inf, -np.inf], np.nan).fillna(0)
    predictions = model.predict(X_next)

    category_breakdown = []
    for category, amount in zip(feature_df["category"], predictions):
        category_breakdown.append({
            "category": category,
            "predictedAmount": round(float(amount), 2)
        })

    predicted_total = round(float(np.sum(predictions)), 2)
    overspend_percent = round(((predicted_total - budget_limit) / budget_limit) * 100, 2) if budget_limit > 0 else 0

    if predicted_total > budget_limit * 1.10:
        risk_level = "HIGH"
        recommendation = "High risk: reduce flexible spending categories and review subscriptions."
    elif predicted_total > budget_limit:
        risk_level = "MEDIUM"
        recommendation = "Medium risk: monitor spending closely and reduce non-essential expenses."
    else:
        risk_level = "LOW"
        recommendation = "Low risk: spending is within the selected budget limit."

    return {
        "period": next_period,
        "budgetLimit": float(budget_limit),
        "predictedTotalExpense": predicted_total,
        "riskLevel": risk_level,
        "overspendPercent": overspend_percent,
        "recommendation": recommendation,
        "categoryBreakdown": category_breakdown,
        "modelMetrics": bundle["metrics"],
        "note": "This is an estimate based on historical monthly category patterns, lag features, and rolling averages."
    }


if __name__ == "__main__":
    result = forecast_next_month(100000)
    print(result)
