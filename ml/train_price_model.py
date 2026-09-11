"""
Mitti2Market - AI Crop Price Advisor
------------------------------------

Uses the local Kaggle historical crop-price dataset to train
a machine-learning model for next-month price movement.

Input:
    ml/data/crop_price_dataset.csv

Output:
    ml/models/price_model.pkl
    ml/models/model_metrics.json
"""

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


# ---------------------------------------------------------
# PATHS
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

DATA_FILE = BASE_DIR / "data" / "crop_price_dataset.csv"
MODEL_DIR = BASE_DIR / "models"

MODEL_FILE = MODEL_DIR / "price_model.pkl"
METRICS_FILE = MODEL_DIR / "model_metrics.json"


# ---------------------------------------------------------
# LOAD DATA
# ---------------------------------------------------------

def load_data():

    print("\n======================================")
    print("Mitti2Market AI Price Advisor")
    print("======================================")

    print(f"\n[1] Loading dataset:")
    print(DATA_FILE)

    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"\nDataset not found:\n{DATA_FILE}\n"
            "Make sure crop_price_dataset.csv is inside ml/data/"
        )

    df = pd.read_csv(DATA_FILE)

    print(f"[OK] Rows: {len(df)}")
    print(f"[OK] Columns: {list(df.columns)}")

    return df


# ---------------------------------------------------------
# CLEAN DATA
# ---------------------------------------------------------

def clean_data(df):

    print("\n[2] Cleaning dataset...")

    # Standardize column names
    df.columns = (
        df.columns
        .str.strip()
        .str.lower()
    )

    required = [
        "month",
        "commodity_name",
        "avg_modal_price",
        "avg_min_price",
        "avg_max_price",
    ]

    for column in required:
        if column not in df.columns:
            raise ValueError(
                f"Required column missing: {column}"
            )

    # Convert prices to numeric
    price_columns = [
        "avg_modal_price",
        "avg_min_price",
        "avg_max_price",
    ]

    for column in price_columns:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce"
        )

    # Convert month from YYYY-MM-DD to datetime
    df["month"] = pd.to_datetime(
        df["month"],
        errors="coerce"
    )

    # Extract month number for seasonality
    df["month_number"] = df["month"].dt.month

    # Extract year
    df["year"] = df["month"].dt.year

    # Remove invalid rows
    df = df.dropna(
        subset=[
            "commodity_name",
            "month",
            "avg_modal_price"
        ]
    )

    # Remove impossible prices
    df = df[df["avg_modal_price"] > 0]

    # Standardize crop names
    df["commodity_name"] = (
        df["commodity_name"]
        .astype(str)
        .str.strip()
        .str.lower()
    )

    print(f"[OK] Usable rows: {len(df)}")
    print(
        f"[OK] Commodities: "
        f"{df['commodity_name'].nunique()}"
    )

    return df


# ---------------------------------------------------------
# CREATE ML FEATURES
# ---------------------------------------------------------

def create_features(df):

    print("\n[3] Creating historical price features...")

    # Sort by commodity and month
    df = df.sort_values(
        ["commodity_name", "month"]
    ).copy()

    # Previous price
    df["previous_price"] = (
        df.groupby("commodity_name")
        ["avg_modal_price"]
        .shift(1)
    )

    # Two months ago
    df["price_lag_2"] = (
        df.groupby("commodity_name")
        ["avg_modal_price"]
        .shift(2)
    )

    # Three months ago
    df["price_lag_3"] = (
        df.groupby("commodity_name")
        ["avg_modal_price"]
        .shift(3)
    )

    # Rolling 3-month average
    df["rolling_3_month"] = (
        df.groupby("commodity_name")
        ["avg_modal_price"]
        .transform(
            lambda x: x.shift(1)
            .rolling(3)
            .mean()
        )
    )

    # Price range
    df["price_range"] = (
        df["avg_max_price"]
        - df["avg_min_price"]
    )

    # Month seasonality
    df["month_sin"] = np.sin(
        2 * np.pi * df["month_number"] / 12
    )

    df["month_cos"] = np.cos(
        2 * np.pi * df["month_number"] / 12
    )

    # TARGET:
    # Next available price
    df["target_price"] = (
        df.groupby("commodity_name")
        ["avg_modal_price"]
        .shift(-1)
    )

    # Remove rows where historical features
    # or target cannot be calculated
    df = df.dropna(
        subset=[
            "previous_price",
            "price_lag_2",
            "price_lag_3",
            "rolling_3_month",
            "target_price"
        ]
    )

    print(
        f"[OK] ML rows after feature engineering: "
        f"{len(df)}"
    )

    return df


# ---------------------------------------------------------
# TRAIN MODEL
# ---------------------------------------------------------

def train_model(df):

    print("\n[4] Preparing training data...")

    features = [
        "commodity_name",
        "month_number",
        "previous_price",
        "price_lag_2",
        "price_lag_3",
        "rolling_3_month",
        "price_range",
        "month_sin",
        "month_cos",
    ]

    X = df[features]
    y = df["target_price"]

    # Chronological split
    split_index = int(len(df) * 0.8)

    X_train = X.iloc[:split_index]
    X_test = X.iloc[split_index:]

    y_train = y.iloc[:split_index]
    y_test = y.iloc[split_index:]

    print(f"[OK] Training rows: {len(X_train)}")
    print(f"[OK] Testing rows:  {len(X_test)}")

    # Categorical feature
    categorical_features = [
        "commodity_name"
    ]

    numerical_features = [
        "month_number",
        "previous_price",
        "price_lag_2",
        "price_lag_3",
        "rolling_3_month",
        "price_range",
        "month_sin",
        "month_cos",
    ]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "commodity",
                OneHotEncoder(
                    handle_unknown="ignore"
                ),
                categorical_features,
            )
        ],
        remainder="passthrough"
    )

    model = RandomForestRegressor(
        n_estimators=300,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", model)
        ]
    )

    print("\n[5] Training Random Forest...")

    pipeline.fit(X_train, y_train)

    print("[OK] Model training completed.")

    # -----------------------------------------------------
    # EVALUATION
    # -----------------------------------------------------

    print("\n[6] Evaluating model...")

    predictions = pipeline.predict(X_test)

    predictions = np.maximum(
        predictions,
        0
    )

    mae = mean_absolute_error(
        y_test,
        predictions
    )

    rmse = np.sqrt(
        mean_squared_error(
            y_test,
            predictions
        )
    )

    r2 = r2_score(
        y_test,
        predictions
    )

    metrics = {
        "model": "RandomForestRegressor",
        "training_rows": int(len(X_train)),
        "testing_rows": int(len(X_test)),
        "MAE": round(float(mae), 2),
        "RMSE": round(float(rmse), 2),
        "R2": round(float(r2), 4),
    }

    print("\n======================================")
    print("MODEL RESULTS")
    print("======================================")

    print(f"MAE  : ₹{mae:.2f}")
    print(f"RMSE : ₹{rmse:.2f}")
    print(f"R²   : {r2:.4f}")

    return pipeline, metrics


# ---------------------------------------------------------
# SAVE MODEL
# ---------------------------------------------------------

def save_model(model, metrics):

    print("\n[7] Saving model...")

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    joblib.dump(
        model,
        MODEL_FILE
    )

    with open(
        METRICS_FILE,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            metrics,
            f,
            indent=4
        )

    print(
        f"[OK] Model saved:\n{MODEL_FILE}"
    )

    print(
        f"[OK] Metrics saved:\n{METRICS_FILE}"
    )


# ---------------------------------------------------------
# MAIN
# ---------------------------------------------------------

def main():

    df = load_data()

    df = clean_data(df)

    df = create_features(df)

    model, metrics = train_model(df)

    save_model(
        model,
        metrics
    )

    print("\n======================================")
    print("SUCCESS")
    print("======================================")

    print(
        "\nYour AI price model is ready."
    )


if __name__ == "__main__":
    main()