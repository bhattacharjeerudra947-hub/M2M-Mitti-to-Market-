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
from sklearn.ensemble import GradientBoostingRegressor

from sklearn.compose import ColumnTransformer
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
COMPARISON_FILE = MODEL_DIR / "model_comparison.json"


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

    g0 = df.groupby("commodity_name")["avg_modal_price"]

    # Previous price
    df["previous_price"] = g0.shift(1)

    # Two months ago
    df["price_lag_2"] = g0.shift(2)

    # Three months ago
    df["price_lag_3"] = g0.shift(3)

    # Rolling 3-month average
    df["rolling_3_month"] = g0.transform(
        lambda x: x.shift(1).rolling(3).mean()
    )

    # Rolling 6-month average (longer-term trend reference)
    df["rolling_6_month"] = g0.transform(
        lambda x: x.shift(1).rolling(6).mean()
    )

    # --- NEW: mean-reversion signal ---
    # How far the current price sits from its recent trend.
    # Values far from zero suggest the price may revert;
    # values near zero suggest "no strong signal" -> favors
    # predicting little/no change.
    df["deviation_from_trend"] = (
        (df["previous_price"] - df["rolling_3_month"])
        / df["rolling_3_month"]
    )

    # --- NEW: recent volatility signal ---
    # Rolling std-dev of past month-over-month % changes.
    # High volatility -> harder to predict, model can learn
    # to shrink its predictions toward zero for these rows.
    pct_change = g0.transform(lambda x: x.pct_change())
    df["recent_volatility"] = (
        pct_change.groupby(df["commodity_name"])
        .transform(lambda x: x.shift(1).rolling(3).std())
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

    # Group once so all target operations are commodity-specific.
    g = df.groupby("commodity_name")

    # TARGET: next available price for the same commodity.
    df["target_price"] = (
        g["avg_modal_price"].shift(-1)
    )

    # Date of the price being predicted.
    df["target_month"] = (
        g["month"].shift(-1)
    )

    # ML target: percentage change from the current price
    # to the next available price.
    #
    # Example:
    # current = 3000, next = 3150
    # target_change = +0.05 (5%)
    df["target_change"] = (
        (df["target_price"] - df["avg_modal_price"])
        / df["avg_modal_price"]
    )
    # Remove rows where historical features
    # or target cannot be calculated
    df = df.dropna(
        subset=[
            "previous_price",
            "price_lag_2",
            "price_lag_3",
            "rolling_3_month",
            "rolling_6_month",
            "deviation_from_trend",
            "recent_volatility",
            "target_price",
            "target_month",
            "target_change"
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
        "rolling_6_month",
        "deviation_from_trend",
        "recent_volatility",
        "price_range",
        "month_sin",
        "month_cos",
    ]

    # IMPORTANT:
    # Split by the date of the value being predicted, not by row number.
    # This creates a genuine future holdout.
    cutoff = pd.Timestamp("2024-01-01")
    # Validation split carved out of the training period, used only
    # to tune the blending weight below (never touches the true
    # 2024+ test holdout).
    val_cutoff = pd.Timestamp("2023-01-01")

    df = df.sort_values("target_month").reset_index(drop=True)

    train_df = df[df["target_month"] < val_cutoff].copy()
    val_df = df[
        (df["target_month"] >= val_cutoff)
        & (df["target_month"] < cutoff)
    ].copy()
    test_df = df[df["target_month"] >= cutoff].copy()

    X_train = train_df[features]
    X_val = val_df[features]
    X_test = test_df[features]

    # IMPORTANT:
    # We now predict percentage price movement rather than raw price.
    y_train = train_df["target_change"]
    y_val = val_df["target_change"]
    y_test = test_df["target_change"]

    print("\n[CHECK] FUTURE VALIDATION")
    print("--------------------------------------")
    print(
        "Training target period:",
        train_df["target_month"].min(),
        "to",
        train_df["target_month"].max()
    )
    print(
        "Validation target period:",
        val_df["target_month"].min(),
        "to",
        val_df["target_month"].max()
    )
    print(
        "Testing target period:",
        test_df["target_month"].min(),
        "to",
        test_df["target_month"].max()
    )

    print(f"[OK] Training rows:   {len(X_train)}")
    print(f"[OK] Validation rows: {len(X_val)}")
    print(f"[OK] Testing rows:    {len(X_test)}")

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
        "rolling_6_month",
        "deviation_from_trend",
        "recent_volatility",
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

    # Gradient Boosting Regression is used for the continuous
    # percentage-change target.
    #
    # NOTE: capacity reduced and regularization increased vs the
    # original config (fewer/shallower trees, larger leaf size,
    # subsampling) because per-commodity sample sizes are small
    # and month-over-month % change is close to a random walk --
    # the old settings were overfitting training noise.
    model = GradientBoostingRegressor(
        n_estimators=120,
        learning_rate=0.02,
        max_depth=2,
        min_samples_leaf=15,
        subsample=0.7,
        loss="huber",
        random_state=42
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", model)
        ]
    )

    print("\n[5] Training Gradient Boosting Regression...")
    pipeline.fit(X_train, y_train)
    print("[OK] Model training completed.")

    # -----------------------------------------------------
    # TUNE BASELINE-BLEND WEIGHT ON VALIDATION SET
    # -----------------------------------------------------
    #
    # Month-over-month commodity prices behave close to a
    # random walk, so "no change" (the persistence baseline)
    # is a strong prior. Rather than trusting the raw ML
    # prediction, we blend it toward zero-change by a weight
    # alpha, chosen to minimize MAE on a validation slice that
    # is NOT the final test holdout.

    print("\n[5b] Tuning baseline-blend weight (alpha) on validation set...")

    best_alpha = 1.0
    best_val_mae = None

    if len(X_val) > 0:
        val_pred_change = pipeline.predict(X_val)
        val_actual_prices = val_df["target_price"].to_numpy()
        val_current_prices = val_df["avg_modal_price"].to_numpy()

        for alpha in np.arange(0.0, 1.01, 0.05):
            blended = alpha * val_pred_change
            blended_prices = np.maximum(
                val_current_prices * (1.0 + blended), 0
            )
            mae_alpha = mean_absolute_error(
                val_actual_prices, blended_prices
            )
            if best_val_mae is None or mae_alpha < best_val_mae:
                best_val_mae = mae_alpha
                best_alpha = alpha

        print(
            f"[OK] Best alpha: {best_alpha:.2f} "
            f"(validation MAE: {best_val_mae:.2f})"
        )
    else:
        print("[WARNING] No validation rows available; alpha=1.0 (no blending).")

    # -----------------------------------------------------
    # EVALUATION
    # -----------------------------------------------------

    print("\n[6] Evaluating model...")

    raw_predicted_change = pipeline.predict(X_test)

    # Apply the tuned blend toward "no change".
    predicted_change = best_alpha * raw_predicted_change

    # Convert predicted percentage change back to rupee price.
    predicted_prices = (
        test_df["avg_modal_price"].to_numpy()
        * (1.0 + predicted_change)
    )

    predicted_prices = np.maximum(
        predicted_prices,
        0
    )

    actual_prices = test_df["target_price"].to_numpy()

    # Naive baseline:
    # next price = current price.
    baseline_prices = test_df["avg_modal_price"].to_numpy()

    # ML metrics in actual rupee prices.
    mae = mean_absolute_error(
        actual_prices,
        predicted_prices
    )

    rmse = np.sqrt(
        mean_squared_error(
            actual_prices,
            predicted_prices
        )
    )

    r2 = r2_score(
        actual_prices,
        predicted_prices
    )

    baseline_mae = mean_absolute_error(
        actual_prices,
        baseline_prices
    )

    baseline_rmse = np.sqrt(
        mean_squared_error(
            actual_prices,
            baseline_prices
        )
    )

    baseline_r2 = r2_score(
        actual_prices,
        baseline_prices
    )

    # Positive = ML is better.
    mae_improvement = (
        (baseline_mae - mae) / baseline_mae * 100
        if baseline_mae != 0
        else 0
    )

    # Save predictions for the unseen future period.
    future_results = test_df[
        [
            "commodity_name",
            "month",
            "target_month",
            "avg_modal_price",
            "target_price"
        ]
    ].copy()

    future_results["predicted_change_percent"] = (
        predicted_change * 100
    )

    future_results["predicted_price"] = predicted_prices

    future_results["baseline_price"] = baseline_prices

    future_results["absolute_error"] = (
        future_results["target_price"]
        - future_results["predicted_price"]
    ).abs()

    future_results["baseline_absolute_error"] = (
        future_results["target_price"]
        - future_results["baseline_price"]
    ).abs()

    future_results.to_csv(
        MODEL_DIR / "future_predictions.csv",
        index=False
    )

    comparison = {
        "baseline": "previous_price",
        "baseline_rule": "next price = current price",
        "ml_model": "GradientBoostingRegressor",
        "blend_alpha": round(float(best_alpha), 2),
        "validation_type": "chronological_future_holdout",
        "cutoff_date": "2024-01-01",
        "testing_rows": int(len(X_test)),
        "baseline_MAE": round(float(baseline_mae), 2),
        "baseline_RMSE": round(float(baseline_rmse), 2),
        "baseline_R2": round(float(baseline_r2), 4),
        "ml_MAE": round(float(mae), 2),
        "ml_RMSE": round(float(rmse), 2),
        "ml_R2": round(float(r2), 4),
        "ml_MAE_improvement_percent": round(
            float(mae_improvement),
            2
        )
    }

    metrics = {
        "model": "GradientBoostingRegressor",
        "blend_alpha": round(float(best_alpha), 2),
        "target": "next_month_percentage_change",
        "validation_type": "chronological_future_holdout",
        "cutoff_date": "2024-01-01",
        "training_rows": int(len(X_train)),
        "validation_rows": int(len(X_val)),
        "testing_rows": int(len(X_test)),
        "training_target_start": str(
            train_df["target_month"].min().date()
        ),
        "training_target_end": str(
            train_df["target_month"].max().date()
        ),
        "testing_target_start": str(
            test_df["target_month"].min().date()
        ),
        "testing_target_end": str(
            test_df["target_month"].max().date()
        ),
        "MAE": round(float(mae), 2),
        "RMSE": round(float(rmse), 2),
        "R2": round(float(r2), 4),
        "baseline_MAE": round(float(baseline_mae), 2),
        "baseline_RMSE": round(float(baseline_rmse), 2),
        "baseline_R2": round(float(baseline_r2), 4),
        "MAE_improvement_percent": round(
            float(mae_improvement),
            2
        )
    }

    print("\n======================================")
    print("ML MODEL RESULTS")
    print("======================================")

    print(f"Blend alpha (0=pure baseline, 1=pure ML): {best_alpha:.2f}")
    print(f"MAE  : ₹{mae:.2f}")
    print(f"RMSE : ₹{rmse:.2f}")
    print(f"R²   : {r2:.4f}")

    print("\n[BASELINE] PREVIOUS PRICE")
    print("--------------------------------------")
    print("Baseline rule: next price = current price")
    print(f"MAE  : ₹{baseline_mae:.2f}")
    print(f"RMSE : ₹{baseline_rmse:.2f}")
    print(f"R²   : {baseline_r2:.4f}")

    print("\n[COMPARISON]")
    print("--------------------------------------")

    if mae_improvement > 0:
        print(
            f"[OK] ML model improves MAE by "
            f"{mae_improvement:.2f}% over the baseline."
        )
    else:
        print(
            f"[WARNING] ML model is "
            f"{abs(mae_improvement):.2f}% worse in MAE "
            f"than the baseline."
        )

    print("\n[EXAMPLES] ACTUAL VS PREDICTED")
    print("--------------------------------------")
    print(
        future_results[
            [
                "commodity_name",
                "target_month",
                "avg_modal_price",
                "target_price",
                "predicted_price",
                "baseline_price",
                "absolute_error"
            ]
        ].head(10).to_string(index=False)
    )

    print(
        f"\n[OK] Future predictions saved:\n"
        f"{MODEL_DIR / 'future_predictions.csv'}"
    )

    # Save comparison separately so the result can be inspected
    # by the backend/demo without parsing console output.
    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(
        COMPARISON_FILE,
        "w",
        encoding="utf-8"
    ) as f:
        json.dump(
            comparison,
            f,
            indent=4
        )

    print(
        f"\n[OK] Model comparison saved:\n"
        f"{COMPARISON_FILE}"
    )

    # Stash the tuned alpha on the pipeline object so it travels
    # with the saved model file and can be reused at inference time.
    pipeline.blend_alpha_ = float(best_alpha)

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
        "\nYour AI price-movement model is ready."
    )


if __name__ == "__main__":
    main()