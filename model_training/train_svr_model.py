"""
BEMS Support Vector Regression (SVR) Model Training Pipeline.
Trains an SVR model with RBF kernel and OneHotEncoder + StandardScaler preprocessor.
Evaluates R2, MAE, RMSE and saves energy_svr_model.pkl for backend inference.
"""
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.svm import SVR
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

FEATURE_COLS = [
    "Occupancy", "Temperature", "Humidity",
    "Zone Type", "Weekend", "Day/Night",
    "HVAC Status", "Fan Status", "Lighting Status"
]

CAT_COLS = ["Zone Type", "Weekend", "Day/Night", "HVAC Status", "Fan Status", "Lighting Status"]
NUM_COLS = ["Occupancy", "Temperature", "Humidity"]
TARGET_COL = "Energy Consumption"

def train_model(dataset_csv: str, output_model_pkl: str):
    print(f"Loading training dataset from: {dataset_csv}")
    df = pd.read_csv(dataset_csv)

    X = df[FEATURE_COLS]
    y = df[TARGET_COL]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Preprocessing Pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUM_COLS),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CAT_COLS)
        ]
    )

    # SVR Model Pipeline
    svr_pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("model", SVR(kernel="rbf", C=50.0, epsilon=0.1, gamma="scale"))
    ])

    print("Training SVR Model with RBF Kernel...")
    svr_pipeline.fit(X_train, y_train)

    # Evaluate
    y_pred = svr_pipeline.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))

    print("=== MODEL EVALUATION METRICS ===")
    print(f"R² Score:  {r2:.4f} ({r2*100:.2f}% variance explained)")
    print(f"MAE:       {mae:.2f} kWh")
    print(f"RMSE:      {rmse:.2f} kWh")

    # Save artifact
    os.makedirs(os.path.dirname(os.path.abspath(output_model_pkl)), exist_ok=True)
    joblib.dump(svr_pipeline, output_model_pkl)
    print(f"Model successfully saved to: {output_model_pkl}")

    return svr_pipeline

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(base_dir)
    
    data_path = os.path.join(base_dir, "energy_consumption_dataset.csv")
    if not os.path.exists(data_path):
        data_path = os.path.join(root_dir, "energy_consumption_dataset.csv")

    model_out = os.path.join(root_dir, "energy_svr_model.pkl")
    train_model(data_path, model_out)
