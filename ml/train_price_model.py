"""
Mitti2Market — Crop Price Prediction Pipeline
==============================================

Trains crop price prediction models on the Kaggle dataset:
    himanshu9648/crop-price-prediction-dataset-in-india

Usage (requires Python 3.10+ with pandas, scikit-learn, kagglehub):
    pip install kagglehub pandas scikit-learn numpy
    python ml/train_price_model.py

Outputs:
    backend/data/crop_price_model.json
        - per-(crop, state, month) median/modal price statistics
        - model metadata (dataset version, trained-at, coverage, metrics)
    backend/data/crop_price_metrics.json
        - MAE / RMSE / R² for the tested model variants

The Spring Boot backend (DatasetPriceService) loads crop_price_model.json
at startup and serves predictions from it. When the model file is absent the
backend falls back to the live data.gov.in mandi API and labels the source
accordingly — it NEVER invents numbers.

Dataset columns are INSPECTED at runtime (we do not hardcode column names);
the loader maps whatever columns exist onto a canonical schema.
"""

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

MODEL_OUT = Path(__file__).resolve().parent.parent / "backend" / "data" / "crop_price_model.json"
METRICS_OUT = Path(__file__).resolve().parent.parent / "backend" / "data" / "crop_price_metrics.json"

DATASET = "himanshu9648/crop-price-prediction-dataset-in-india"

CANONICAL_CANDIDATES = {
    "crop": ["crop", "commodity", "crop_name", "produce", "item"],
    "state": ["state", "state_name"],
    "district": ["district", "district_name"],
    "market": ["market", "market_name", "mandi", "apmc"],
    "date": ["date", "price_date", "arrival_date", "report_date"],
    "month": ["month"],
    "year": ["year"],
    "min_price": ["min_price", "minimum_price", "min", "lower_price"],
    "max_price": ["max_price", "maximum_price", "max", "upper_price"],
    "modal_price": ["modal_price", "mode_price", "average_price", "avg_price", "mean_price", "price"],
}


def load_dataset():
    """Load via kagglehub; print the actual columns so the mapping is transparent."""
    try:
        import kagglehub
        from kagglehub import KaggleDatasetAdapter
    except ImportError:
        sys.exit("kagglehub not installed — run: pip install kagglehub pandas scikit-learn numpy")

    files = ["crop_price_prediction_dataset.csv", "Crop_Price_Prediction_Dataset.csv",
             "crop_prices.csv", "data.csv"]
    last_err = None
    for f in files:
        try:
            df = kagglehub.load_dataset(KaggleDatasetAdapter.PANDAS, DATASET, f)
            print(f"[load] file={f} rows={len(df)}")
            print(f"[load] columns={list(df.columns)}")
            print(df.head(3))
            return df
        except Exception as e:  # noqa: BLE001
            last_err = e
            continue
    sys.exit(f"Could not load dataset file (tried {files}): {last_err}")


def canonicalize(df: pd.DataFrame) -> pd.DataFrame:
    """Map the dataset's actual columns onto the canonical schema."""
    cols = {c.lower().strip(): c for c in df.columns}
    out = pd.DataFrame()
    for canon, candidates in CANONICAL_CANDIDATES.items():
        found = None
        for cand in candidates:
            if cand in cols:
                found = cols[cand]
                break
        if found is not None:
            out[canon] = df[found]
        else:
            out[canon] = np.nan

    # Derive month/year from date when absent
    if out["date"].notna().any():
        dates = pd.to_datetime(out["date"], errors="coerce")
        if out["month"].isna().all():
            out["month"] = dates.dt.month
        if out["year"].isna().all():
            out["year"] = dates.dt.year

    # Prefer modal price; fall back to mean of min/max
    price = out["modal_price"]
    fallback = (pd.to_numeric(out["min_price"], errors="coerce")
                + pd.to_numeric(out["max_price"], errors="coerce")) / 2
    out["price"] = pd.to_numeric(price, errors="coerce").fillna(fallback)

    keep = ["crop", "state", "district", "market", "month", "year", "price"]
    out = out[keep].copy()
    out["crop"] = out["crop"].astype(str).str.lower().str.strip()
    out["state"] = out["state"].astype(str).str.lower().str.strip()
    out = out.replace({"nan": np.nan, "none": np.nan})
    out = out.dropna(subset=["crop", "price"])
    out = out[out["price"] > 0]
    # Trim outliers at the 1st/99th percentile per crop (winsorize, not delete)
    out["price"] = out.groupby("crop")["price"].transform(
        lambda s: s.clip(s.quantile(0.01), s.quantile(0.99)))
    return out


def evaluate(df: pd.DataFrame) -> dict:
    """Time-aware validation for 3 baseline regressors on month-level stats."""
    from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
    from sklearn.linear_model import LinearRegression
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    from sklearn.model_selection import train_test_split

    work = df.dropna(subset=["month"]).copy()
    if work["year"].isna().all():
        work["year"] = 2024
    work["month"] = work["month"].astype(int)
    work["year"] = work["year"].astype(int)

    # Feature matrix: one-hot crop/state + month/year
    feats = pd.get_dummies(work[["crop", "state"]], prefix=["c", "s"], dummy_na=True)
    feats["month_sin"] = np.sin(2 * np.pi * work["month"] / 12)
    feats["month_cos"] = np.cos(2 * np.pi * work["month"] / 12)
    feats["year"] = work["year"]
    y = work["price"]

    # Sort by time; take the LAST 20% as validation (time-aware split)
    order = work.sort_values(["year", "month"]).index
    feats = feats.loc[order]
    y = y.loc[order]
    split = int(len(feats) * 0.8)
    X_tr, X_va, y_tr, y_va = feats.iloc[:split], feats.iloc[split:], y.iloc[:split], y.iloc[split:]
    if len(X_va) == 0:
        return {"error": "not enough data for time-aware split"}

    models = {
        "linear_regression": LinearRegression(),
        "random_forest": RandomForestRegressor(n_estimators=120, min_samples_leaf=5, n_jobs=-1, random_state=42),
        "gradient_boosting": GradientBoostingRegressor(n_estimators=200, learning_rate=0.08, max_depth=5, random_state=42),
    }

    results = {}
    for name, model in models.items():
        model.fit(X_tr, y_tr)
        pred = np.maximum(model.predict(X_va), 0)
        results[name] = {
            "MAE": round(float(mean_absolute_error(y_va, pred)), 3),
            "RMSE": round(float(np.sqrt(mean_squared_error(y_va, pred))), 3),
            "R2": round(float(r2_score(y_va, pred)), 4),
        }
        print(f"[eval] {name}: {results[name]}")
    return results


def build_lookup(df: pd.DataFrame) -> dict:
    """Aggregate price stats per (crop, state, month) — the shipped 'model'."""
    grp = df.groupby(["crop", "state", "month"], dropna=True)["price"]
    lookup = {}
    for (crop, state, month), prices in grp:
        key = f"{crop}|{state}|{int(month)}"
        lookup[key] = {
            "median": round(float(prices.median()), 2),
            "p25": round(float(prices.quantile(0.25)), 2),
            "p75": round(float(prices.quantile(0.75)), 2),
            "samples": int(len(prices)),
        }
    # Crop-level fallback for (crop, month) and crop overall
    for (crop, month), prices in df.groupby(["crop", "month"])["price"]:
        lookup[f"{crop}||{int(month)}"] = {
            "median": round(float(prices.median()), 2),
            "p25": round(float(prices.quantile(0.25)), 2),
            "p75": round(float(prices.quantile(0.75)), 2),
            "samples": int(len(prices)),
        }
    for crop, prices in df.groupby("crop")["price"]:
        lookup[f"{crop}||"] = {
            "median": round(float(prices.median()), 2),
            "p25": round(float(prices.quantile(0.25)), 2),
            "p75": round(float(prices.quantile(0.75)), 2),
            "samples": int(len(prices)),
        }
    return lookup


def main():
    print("== Mitti2Market crop price pipeline ==")
    raw = load_dataset()
    df = canonicalize(raw)
    print(f"[clean] usable rows: {len(df)}  crops: {df['crop'].nunique()}  states: {df['state'].nunique()}")

    metrics = evaluate(df)
    lookup = build_lookup(df)

    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
    model = {
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "dataset": DATASET,
        "rows": len(df),
        "crops": sorted(df["crop"].dropna().unique().tolist()),
        "states": sorted(df["state"].dropna().unique().tolist()),
        "lookup": lookup,
    }
    MODEL_OUT.write_text(json.dumps(model))
    METRICS_OUT.write_text(json.dumps(metrics, indent=2))
    print(f"[done] model  -> {MODEL_OUT} ({MODEL_OUT.stat().st_size / 1e6:.1f} MB, {len(lookup)} keys)")
    print(f"[done] metrics -> {METRICS_OUT}")


if __name__ == "__main__":
    main()
