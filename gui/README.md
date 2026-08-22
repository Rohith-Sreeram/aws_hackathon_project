# BEMS Python Desktop GUI Application

A lightweight Python Desktop GUI Monitor for the Building Energy Management System (BEMS).

---

## Features
- **Key Metrics KPI Bar**: Live SVR Predicted Energy ($E_{pred}$), 1-Hour Actual Energy ($E_{actual}$), Difference ($\Delta$), and Building Energy Status (`Normal` / `Energy Usage Increasing`).
- **4 Floors Live Monitor**: Dedicated cards for Floor 1 to 4 with status badges, power draws, difference values, and top SHAP parameters.
- **Top SHAP Key Driver**: Identifies the primary feature parameter contributing to energy increases.
- **Floor-Level Actions to Minimize Energy Consumption**: Displays targeted actions to eliminate energy waste across the building's 24 zones.
- **Auto-Sync & Live Streaming**: Background asynchronous polling thread with instant manual sync button.

---

## How to Run

1. Ensure the BEMS Backend REST API is running:
   ```bash
   python backend/server.py
   # or: python app.py
   ```

2. In a new terminal, launch the Desktop GUI:
   ```bash
   python gui/app.py
   ```
