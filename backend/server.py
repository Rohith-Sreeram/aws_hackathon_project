"""
Smart Building Energy Management System (BEMS) - Backend REST API Server.
Modular Backend supporting Flask REST APIs, SVR Model Inference, SHAP attributions,
PostgreSQL Database connectivity, and Lightweight Python GUI endpoints.
"""
import os
import sys
from datetime import datetime, timezone
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# Add root directory to path for cross-imports
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.state import state_manager
from backend.db import db_manager
from backend.models import (
    predict_zone_energy,
    explain_zone_shap,
    analyze_building_system,
    FEATURE_COLS,
)

DIST_DIR = os.path.join(ROOT_DIR, "dist")
if not os.path.exists(DIST_DIR):
    DIST_DIR = os.path.join(ROOT_DIR, "frontend", "dist")

app = Flask(__name__, static_folder=DIST_DIR, static_url_path="")

# Allow all origins in development; in production only allow Vercel domains.
_VERCEL_ORIGIN = os.environ.get("VERCEL_FRONTEND_URL", "*")
CORS(app, resources={r"/api/*": {"origins": _VERCEL_ORIGIN}})

# ==============================================================================
# 1. HEALTH & SYSTEM DIAGNOSTICS
# ==============================================================================

@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "buildings_count": 1,
        "floors_count": 4,
        "total_zones": 24,
        "layout": "4 Floors (4 Offices + 2 Meeting Halls per floor)",
        "engine": "SVR Pipeline + SHAP Feature Attribution",
        "database": db_manager.get_status(),
        "simulation": state_manager.get_simulation_status()
    }), 200

@app.route("/api/db/status", methods=["GET"])
def get_db_status():
    """PostgreSQL connection & table status"""
    return jsonify(db_manager.get_status()), 200

# ==============================================================================
# 2. BUILDING & FLOOR SUMMARY (FULL DASHBOARD DATA)
# ==============================================================================

@app.route("/api/building/summary", methods=["GET"])
@app.route("/api/dashboard/summary", methods=["GET"])
@app.route("/api/company/summary", methods=["GET"])
def get_building_summary():
    try:
        summary = state_manager.get_building_summary()
        # Optionally log snapshot to PostgreSQL
        if db_manager.is_connected:
            db_manager.log_building_snapshot(summary)
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({"error": str(e) or "Failed to fetch building summary"}), 500

@app.route("/api/floor/<floor_id>", methods=["GET"])
def get_floor_details(floor_id):
    try:
        floor = state_manager.get_floor_details(floor_id)
        if floor:
            return jsonify(floor), 200
        return jsonify({"error": f"Floor '{floor_id}' not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e) or "Failed to fetch floor details"}), 500

# ==============================================================================
# 3. LIGHTWEIGHT GUI SUMMARY ENDPOINT (FOR PYTHON GUI APP)
# ==============================================================================

@app.route("/api/gui/summary", methods=["GET"])
def get_gui_summary():
    """
    Lightweight, optimized endpoint for the Python Desktop GUI App.
    Returns only the essential stats: Building status, E_pred, E_actual, Difference,
    4 floors summary, top SHAP driver, and top actionable recommendations.
    """
    try:
        summary = state_manager.get_building_summary()
        bldg = summary.get("building", {})
        floors = bldg.get("floors", [])

        gui_floors = []
        key_actions = []

        for fl in floors:
            fl_actions = fl.get("actions_to_take", [])
            fl_zones = []
            for z in fl.get("zones", []):
                fl_zones.append({
                    "id": z.get("id"),
                    "name": z.get("name"),
                    "type": z.get("type", "Office"),
                    "occupancy": z.get("Occupancy", 0),
                    "temperature": z.get("Temperature", 22.5),
                    "hvac_status": z.get("HVAC Status", "ON"),
                    "lighting_status": z.get("Lighting Status", "ON"),
                    "predicted_kw": z.get("predicted_energy_kw", 0),
                    "actual_kw": z.get("actual_energy_kw", 0),
                    "difference_kw": z.get("difference_kw", 0),
                    "energy_status": z.get("energy_status", "Normal"),
                    "top_driver": z.get("top_driver", {}).get("feature", "HVAC Status"),
                    "suggested_action": z.get("suggested_action"),
                })

            gui_floors.append({
                "id": fl.get("id"),
                "name": fl.get("name"),
                "floorNumber": fl.get("floorNumber"),
                "status": fl.get("status"),
                "predicted_kw": fl.get("total_predicted_energy_kw"),
                "actual_kw": fl.get("total_actual_energy_kw"),
                "difference_kw": fl.get("difference_kw"),
                "top_driver": fl.get("top_shap_driver", {}).get("feature", "HVAC Status"),
                "top_driver_impact": fl.get("top_shap_driver", {}).get("total_impact_kw", 0),
                "categories": fl.get("categories", {}),
                "zones": fl_zones,
                "zones_count": fl.get("zones_count", 6),
                "actions_count": len(fl_actions),
            })

            for act in fl_actions:
                key_actions.append({
                    "floor_id": fl.get("id"),
                    "floor": fl.get("name"),
                    "zone_id": act.get("zoneId"),
                    "zone": act.get("zoneName"),
                    "action": act.get("action"),
                    "reason": act.get("reason"),
                    "saving_kw": act.get("saving_kw"),
                    "saving_cost": act.get("saving_cost_monthly"),
                })

        return jsonify({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "building_name": bldg.get("name", "Apex Corporate Tower"),
            "status": bldg.get("status", "Normal"),
            "total_predicted_kw": bldg.get("total_predicted_energy_kw", 0),
            "total_actual_kw": bldg.get("total_actual_energy_kw", 0),
            "difference_kw": bldg.get("difference_kw", 0),
            "savings_potential_kw": bldg.get("savings_potential_kw", 0),
            "monthly_savings_cost": bldg.get("monthly_savings_cost", 0),
            "occupancy_rate_pct": bldg.get("occupancy_rate_pct", 0),
            "top_shap_driver": bldg.get("top_shap_driver", {}),
            "shap_aggregation": summary.get("shap_aggregation", {}),
            "floors": gui_floors,
            "key_actions": key_actions[:12],
            "database": db_manager.get_status(),
            "simulation": state_manager.get_simulation_status(),
        }), 200
    except Exception as e:
        return jsonify({"error": str(e) or "Failed to fetch GUI summary"}), 500

# ==============================================================================
# 4. SVR PREDICTION & SHAP EXPLAINABILITY
# ==============================================================================

@app.route("/api/predict/shap", methods=["POST"])
@app.route("/api/predict/energy", methods=["POST"])
def predict_and_explain_shap():
    try:
        data = request.get_json(force=True) or {}
        reading = data.get("reading", data)
        shap_result = explain_zone_shap(reading)
        return jsonify({
            "status": "success",
            "predicted_energy_kwh": shap_result["predicted_energy"],
            "base_value_kwh": shap_result["base_value"],
            "shap_values": shap_result["shap_values"],
            "top_positive_driver": shap_result["top_positive_driver"],
            "features": reading,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e) or "SHAP prediction failed"}), 500

# ==============================================================================
# 5. LIVE ZONE CONTROL & MANUAL OVERRIDES
# ==============================================================================

@app.route("/api/zone/control", methods=["POST"])
@app.route("/api/zone/update", methods=["POST"])
def control_zone():
    try:
        data = request.get_json(force=True) or {}
        zone_id = data.get("zone_id")
        if not zone_id:
            return jsonify({"error": "zone_id is required"}), 400

        result = state_manager.update_zone_control(zone_id, data)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e) or "Zone control failed"}), 500

@app.route("/api/control/hvac", methods=["POST"])
def control_hvac():
    try:
        data = request.get_json(force=True) or {}
        zone_id = data.get("zone_id")
        mode = data.get("mode", "normal")
        hvac_status = "OFF" if mode in ("off", "energy_saving") else "ON"
        res = state_manager.update_zone_control(zone_id, {"hvac_status": hvac_status})
        return jsonify(res), 200
    except Exception as e:
        return jsonify({"error": str(e) or "HVAC control failed"}), 500

@app.route("/api/control/lighting", methods=["POST"])
def control_lighting():
    try:
        data = request.get_json(force=True) or {}
        zone_id = data.get("zone_id")
        mode = data.get("mode", "on")
        lighting_status = "OFF" if mode == "off" else "ON"
        res = state_manager.update_zone_control(zone_id, {"lighting_status": lighting_status})
        return jsonify(res), 200
    except Exception as e:
        return jsonify({"error": str(e) or "Lighting control failed"}), 500

# ==============================================================================
# 6. SETTINGS & CONFIGURATION
# ==============================================================================

@app.route("/api/settings", methods=["GET", "POST"])
def handle_settings():
    try:
        if request.method == "POST":
            data = request.get_json(force=True) or {}
            result = state_manager.update_settings(data)
            return jsonify(result), 200
        else:
            return jsonify({
                "status": "success",
                "config": state_manager.current_config
            }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==============================================================================
# 7. SIMULATION & TELEMETRY CONTROLS
# ==============================================================================

@app.route("/api/simulation/status", methods=["GET"])
def get_simulation_status():
    return jsonify(state_manager.get_simulation_status()), 200

@app.route("/api/simulation/toggle", methods=["POST"])
def toggle_simulation():
    try:
        data = request.get_json(force=True) or {}
        active = data.get("is_active", not state_manager.is_simulating)
        interval = data.get("interval", state_manager.simulation_interval)
        result = state_manager.set_simulation_state(active, interval)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/simulation/tick", methods=["POST"])
def trigger_simulation_tick():
    try:
        result = state_manager.simulate_sensor_tick()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/dashboard/history", methods=["GET"])
def get_dashboard_history():
    return jsonify(state_manager.get_history()), 200

# ==============================================================================
# 7. STATIC ASSET SERVING FOR FRONTEND
# ==============================================================================

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    print(f"BEMS Backend REST API Server listening on port {port} at http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
