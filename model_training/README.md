# Model Training & Dataset Module

This module contains the machine learning training pipeline, dataset generation scripts, and exploration notebooks for the Building Energy Management System (BEMS).

---

## 1. Input Features & Target

The machine learning model predicts 1-hour energy consumption (kWh) across building zones based on 9 environmental and electrical parameters:

| Feature | Type | Range / Values | Description |
|---|---|---|---|
| **Occupancy** | Numerical | 0 – 100 people | Real-time presence in the zone |
| **Temperature** | Numerical | 18.0°C – 35.0°C | Ambient indoor temperature |
| **Humidity** | Numerical | 30% – 80% | Relative humidity level |
| **Zone Type** | Categorical | `Office`, `Meeting Hall`, `Corridor`, `Floor` | Type of zone |
| **Weekend** | Categorical | `Yes`, `No` | Day of week indicator |
| **Day/Night** | Categorical | `Day`, `Night` | Time of day cycle |
| **HVAC Status** | Categorical | `ON`, `OFF` | Air conditioning compressor state |
| **Fan Status** | Categorical | `ON`, `OFF` | Ventilation fan state |
| **Lighting Status** | Categorical | `ON`, `OFF` | Overhead lighting circuit state |

**Target**: `Energy Consumption` (kWh per hour)

---

## 2. Generating Datasets

To regenerate the synthetic telemetry dataset:

```bash
python model_training/dataset_generation.py
```

This generates `energy_consumption_dataset.csv` with 2,000 calibrated samples.

---

## 3. Training the SVR Model

To train the Support Vector Regression (SVR) model with RBF kernel and generate the serialized pipeline artifact:

```bash
python model_training/train_svr_model.py
```

**Evaluation Results**:
- $R^2$ Score: $> 0.94$ ($94.5\%$ variance explained)
- Mean Absolute Error (MAE): $< 2.4\text{ kWh}$
- Root Mean Squared Error (RMSE): $< 3.1\text{ kWh}$
- Saved artifact: `energy_svr_model.pkl`
