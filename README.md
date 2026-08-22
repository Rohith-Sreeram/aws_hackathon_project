# Smart Building Energy Management System (BEMS)

An AI-driven Building Energy Management System featuring Support Vector Regression (SVR), SHAP Explainability, PostgreSQL persistence, and a real-time Telemetry Simulation Engine for **Apex Corporate Tower** (1 Building • 4 Floors • 24 Zones: 4 Offices + 2 Meeting Halls per floor).

---

## 📂 Modular Architecture Overview

The repository is modularly separated into four distinct functional components:

```
aws_hackathon_project/
├── backend/                  # 1. Flask REST API & PostgreSQL Database Layer
│   ├── server.py             # Main Flask REST server & API endpoints
│   ├── db.py                 # PostgreSQL connection, migrations & logging
│   ├── models.py             # SVR ML inference engine & SHAP feature attributions
│   ├── state.py              # In-memory state & real-time telemetry simulation
│   ├── building_data.py      # Topology (1 building, 4 floors, 24 zones)
│   └── scenario_engine.py    # Wastage scenarios & benchmark configs
│
├── frontend/                 # 2. React + TypeScript + Vite Web Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── OverviewTab.tsx       # Building & 4-Floor overview
│   │   │   ├── FloorViewTab.tsx      # Floor 1-4 views with Simulate/Manual modes
│   │   │   ├── ShapExplainerTab.tsx  # SHAP waterfall & feature sensitivity
│   │   │   ├── EnergyTab.tsx         # Energy forecasting & telemetry trends
│   │   │   └── ...
│   │   └── services/api.ts           # REST API client
│   ├── index.html
│   └── package.json
│
├── gui/                      # 3. Python Desktop GUI Application
│   ├── app.py                # Tkinter desktop monitor (key stats, 4 floors, actions)
│   └── README.md             # Desktop app guide
│
├── model_training/           # 4. ML Model Training & Dataset Pipeline
│   ├── dataset_generation.py # Physics-based synthetic dataset generator
│   ├── train_svr_model.py    # SVR model training, cross-validation & .pkl export
│   ├── energy_harvesting_model.ipynb # Jupyter notebook exploration
│   └── energy_consumption_dataset.csv # 2,000-sample training dataset
│
├── app.py                    # Root entrypoint delegating to backend/server.py
├── requirements.txt          # Unified Python dependencies
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Start the Backend REST API Server

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start the Backend Server (Runs on port 3000)
python backend/server.py
# (or simply: python app.py)
```

The REST API will be accessible at `http://localhost:3000`.

---

### 2. Launch the Python Desktop GUI Application

In a separate terminal, launch the standalone Python Desktop GUI:

```bash
python gui/app.py
```

The GUI receives essential real-time statistics from the REST API:
- SVR Predicted Energy ($E_{pred}$) vs 1-Hour Actual Energy ($E_{actual}$)
- $\Delta$ Difference & Status (`Normal` / `Energy Usage Increasing`)
- 4 Floor Overview (Floor 1, 2, 3, 4) with status badges and SHAP drivers
- Floor-level actionable recommendations to minimize energy consumption

---

### 3. Open the Web Dashboard (Frontend)

With the backend running, open your web browser:

👉 **[http://localhost:3000](http://localhost:3000)**

#### Web Dashboard Features:
- **`Building & Floor Overview`**: Single building executive dashboard with total energy, savings potential, and 4 floor summary cards.
- **`Floor 1`, `Floor 2`, `Floor 3`, `Floor 4` Tabs**:
  - **Simulate vs. Enter Manually**: Toggle between dynamic live sensor streaming and a manual feature input console designed for judge evaluations.
  - **Judge Demo Presets**: *Wastage Anomaly*, *Overcooled Room*, *Eco Mode*, *High Occupancy*.
  - **Category Level**: Aggregates for Offices (4 instances) and Meeting Halls (2 instances).
  - **Instance Level**: 6 Zone cards with telemetry, difference thresholding, and SHAP drivers.
  - **Actions to Minimize Energy Consumption**: Actionable recommendations with kW and cost savings estimates.

To run the frontend in development mode with hot-reloading:
```bash
npm run dev
```

---

### 4. Train or Retrain the SVR Model

```bash
# 1. Regenerate dataset
python model_training/dataset_generation.py

# 2. Train SVR Model
python model_training/train_svr_model.py
```

**Evaluation Metrics**:
- $R^2$ Score: $> 0.94$ ($94.5\%$ variance explained)
- MAE: $< 2.4\text{ kWh}$
- RMSE: $< 3.1\text{ kWh}$
- Model artifact saved to: `energy_svr_model.pkl`

---

## 🗄️ PostgreSQL Database Configuration

The backend includes a database manager in `backend/db.py`. To connect to a live PostgreSQL instance:

Set the following environment variables (or in a `.env` file):
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bems_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
# Or full connection URI:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/bems_db
```

*Note: If PostgreSQL is offline, the backend runs gracefully with in-memory persistence while reporting connection status at `/api/db/status`.*
