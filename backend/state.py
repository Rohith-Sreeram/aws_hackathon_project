"""
In-Memory State Management for Single Building (4 Floors, 24 Zones),
Dynamic Sensor Simulation Engine, Zone Controls, and SVR/SHAP Aggregations.
"""
import copy
import math
import random
import time
import threading
from datetime import datetime, timezone, timedelta
from backend.building_data import create_single_building_portfolio
from backend.models import (
    DEFAULT_CONFIG,
    analyze_building_system,
    predict_zone_energy,
    explain_zone_shap
)

def generate_building_history():
    history = []
    now = datetime.now(timezone.utc)

    for i in range(96, -1, -1):
        time_point = now - timedelta(minutes=i * 15)
        hour = time_point.hour + time_point.minute / 60.0
        is_working_hours = 8 <= hour <= 18
        diurnal = (1.0 + 0.35 * math.sin(((hour - 8) / 10.0) * math.pi)) if is_working_hours else 0.42

        # 1 building with 4 floors (24 zones) baseline around 280 kW total
        expected = 180 + 190 * diurnal
        noise = (math.sin(i * 0.4) + math.cos(i * 0.7)) * 7.5
        actual = max(85.0, expected + noise + (18.0 if i > 80 else 0.0))
        predicted = expected * (1.0 + (math.sin(i * 0.2) * 0.03))

        history.append({
            "timestamp": time_point.isoformat(),
            "display_time": time_point.strftime("%I:%M %p"),
            "actual_energy": round(actual, 1),
            "expected_energy": round(expected, 1),
            "predicted_energy": round(predicted, 1),
            "deviation_kw": round(actual - expected, 1),
            "floor_1_kw": round(actual * 0.23, 1),
            "floor_2_kw": round(actual * 0.31, 1),
            "floor_3_kw": round(actual * 0.28, 1),
            "floor_4_kw": round(actual * 0.18, 1),
            "occupancy_ratio": round(0.68 + 0.2 * math.sin(hour), 2) if is_working_hours else 0.10,
            "temperature": round(22.0 + 1.2 * math.sin(hour / 4.0), 1),
            "outdoor_temp": round(18 + 10 * math.sin((hour - 6) / 8.0), 1),
        })
    return history

class BuildingStateManager:
    def __init__(self):
        self.lock = threading.Lock()
        self.buildings = create_single_building_portfolio()
        self.active_floor_id = "all"
        self.active_scenario = "normal"
        self.current_outdoor_temp = 26.0
        self.current_config = copy.deepcopy(DEFAULT_CONFIG)
        self.history_cache = generate_building_history()
        
        # Sensor Simulation State (Fast real-time streaming)
        self.is_simulating = True
        self.simulation_interval = 1.0  # seconds between ticks (high-speed dynamic streaming)
        self.tick_count = 0
        self.last_tick_time = datetime.now(timezone.utc).isoformat()
        
        # Background simulation thread
        self._stop_event = threading.Event()
        self._sim_thread = threading.Thread(target=self._simulation_loop, daemon=True)
        self._sim_thread.start()

    def _simulation_loop(self):
        """Continuous background thread simulating real-time sensor streams."""
        while not self._stop_event.is_set():
            if self.is_simulating:
                try:
                    self.simulate_sensor_tick()
                except Exception as err:
                    print(f"Simulation tick error: {err}")
            time.sleep(self.simulation_interval)

    def simulate_sensor_tick(self):
        """
        Dynamically fluctuates sensor inputs across all 24 zones:
        - Temperature drifts slightly based on HVAC cooling vs ambient heat
        - Occupancy fluctuates organically
        - Humidity has micro-variations
        - SVR power is recalculated in real time
        - New history telemetry point is appended
        """
        with self.lock:
            self.tick_count += 1
            now = datetime.now(timezone.utc)
            self.last_tick_time = now.isoformat()
            
            # Fluctuate outdoor temp slightly
            self.current_outdoor_temp = round(24.0 + 3.0 * math.sin(self.tick_count * 0.1) + random.uniform(-0.3, 0.3), 1)

            total_bldg_predicted_kw = 0.0
            floor_kws = {1: 0.0, 2: 0.0, 3: 0.0, 4: 0.0}
            total_occupancy = 0

            for bldg in self.buildings:
                for floor in bldg.get("floors", []):
                    f_num = floor.get("floorNumber", 1)
                    for zone in floor.get("zones", []):
                        # Organic sensor fluctuations
                        curr_occ = int(zone.get("Occupancy", 0))
                        curr_temp = float(zone.get("Temperature", 22.5))
                        curr_hum = float(zone.get("Humidity", 48.0))
                        hvac_status = zone.get("HVAC Status", "ON")

                        # Occupancy fluctuation (unless locked at 0 in empty wastage demo rooms)
                        if curr_occ > 0:
                            delta_occ = random.choice([-2, -1, 0, 1, 2])
                            zone["Occupancy"] = max(5, min(95, curr_occ + delta_occ))
                        total_occupancy += zone["Occupancy"]

                        # Temperature physics: HVAC ON cools towards 22.0°C; HVAC OFF warms towards outdoor
                        if hvac_status == "ON":
                            temp_drift = -0.15 if curr_temp > 22.0 else 0.10
                        else:
                            temp_drift = 0.20 if curr_temp < self.current_outdoor_temp else -0.05
                        
                        noise = random.uniform(-0.1, 0.1)
                        zone["Temperature"] = round(max(19.0, min(29.0, curr_temp + temp_drift + noise)), 1)
                        zone["Humidity"] = round(max(35.0, min(70.0, curr_hum + random.uniform(-0.5, 0.5))), 1)

                        # Dynamic SVR energy estimation based on fluctuating sensor values
                        base_val = 45.0 if zone.get("type") == "Office" else 55.0
                        hvac_contrib = 14.0 if hvac_status == "ON" else 1.5
                        light_contrib = 4.5 if zone.get("Lighting Status") == "ON" else 0.5
                        fan_contrib = 2.5 if zone.get("Fan Status") == "ON" else 0.4
                        occ_contrib = (zone["Occupancy"] - 30) * 0.12
                        temp_contrib = (zone["Temperature"] - 22.0) * 0.4
                        
                        pred = round(max(3.0, base_val + hvac_contrib + light_contrib + fan_contrib + occ_contrib + temp_contrib), 2)
                        zone["predicted_energy_kw"] = pred
                        zone["totalPower"] = pred
                        
                        total_bldg_predicted_kw += pred
                        floor_kws[f_num] = floor_kws.get(f_num, 0.0) + pred

            # Append new live telemetry point to historical trend
            new_point = {
                "timestamp": now.isoformat(),
                "display_time": now.strftime("%I:%M:%S %p"),
                "actual_energy": round(total_bldg_predicted_kw * random.uniform(0.98, 1.02), 1),
                "expected_energy": 280.0,
                "predicted_energy": round(total_bldg_predicted_kw, 1),
                "deviation_kw": round(total_bldg_predicted_kw - 280.0, 1),
                "floor_1_kw": round(floor_kws.get(1, 0.0), 1),
                "floor_2_kw": round(floor_kws.get(2, 0.0), 1),
                "floor_3_kw": round(floor_kws.get(3, 0.0), 1),
                "floor_4_kw": round(floor_kws.get(4, 0.0), 1),
                "occupancy_ratio": round(total_occupancy / (24 * 50), 2),
                "temperature": 22.8,
                "outdoor_temp": self.current_outdoor_temp,
            }

            self.history_cache.append(new_point)
            if len(self.history_cache) > 96:
                self.history_cache.pop(0)

            return {
                "status": "success",
                "tick_count": self.tick_count,
                "timestamp": self.last_tick_time,
                "outdoor_temp": self.current_outdoor_temp,
                "total_predicted_kw": round(total_bldg_predicted_kw, 1),
            }

    def set_simulation_state(self, is_active: bool, interval: float = None):
        with self.lock:
            self.is_simulating = is_active
            if interval is not None and interval > 0.5:
                self.simulation_interval = float(interval)
            return {
                "is_simulating": self.is_simulating,
                "interval": self.simulation_interval,
                "tick_count": self.tick_count,
            }

    def get_simulation_status(self):
        with self.lock:
            return {
                "is_simulating": self.is_simulating,
                "interval": self.simulation_interval,
                "tick_count": self.tick_count,
                "last_tick_time": self.last_tick_time,
                "outdoor_temp": self.current_outdoor_temp,
            }

    def get_building_summary(self):
        with self.lock:
            summary = analyze_building_system(self.buildings, self.current_config)
            summary["simulation"] = {
                "is_simulating": self.is_simulating,
                "interval": self.simulation_interval,
                "tick_count": self.tick_count,
                "last_tick_time": self.last_tick_time,
            }
            return summary

    def get_floor_details(self, floor_id: str):
        with self.lock:
            analysis = analyze_building_system(self.buildings, self.current_config)
            bldg = analysis["building"]
            for floor in bldg.get("floors", []):
                if floor["id"] == floor_id or str(floor["floorNumber"]) == str(floor_id):
                    return floor
            return None

    def update_zone_control(self, zone_id: str, updates: dict):
        with self.lock:
            target_zone = None
            for bldg in self.buildings:
                for floor in bldg.get("floors", []):
                    for zone in floor.get("zones", []):
                        if zone["id"] == zone_id:
                            target_zone = zone
                            break

            if not target_zone:
                raise ValueError(f"Zone ID not found: {zone_id}")

            # Apply updates
            if "hvac_status" in updates or "HVAC Status" in updates:
                val = updates.get("hvac_status") or updates.get("HVAC Status")
                target_zone["HVAC Status"] = val
                target_zone["hvacMode"] = "normal" if val == "ON" else "energy_saving"
            if "lighting_status" in updates or "Lighting Status" in updates:
                val = updates.get("lighting_status") or updates.get("Lighting Status")
                target_zone["Lighting Status"] = val
                target_zone["lightingMode"] = "on" if val == "ON" else "off"
            if "fan_status" in updates or "Fan Status" in updates:
                val = updates.get("fan_status") or updates.get("Fan Status")
                target_zone["Fan Status"] = val
                target_zone["fanMode"] = "on" if val == "ON" else "off"
            if "occupancy" in updates or "Occupancy" in updates:
                target_zone["Occupancy"] = int(updates.get("occupancy", updates.get("Occupancy", 0)))
            if "temperature" in updates or "Temperature" in updates:
                target_zone["Temperature"] = float(updates.get("temperature", updates.get("Temperature", 22.5)))
            if "humidity" in updates or "Humidity" in updates:
                target_zone["Humidity"] = float(updates.get("humidity", updates.get("Humidity", 50.0)))
            if "zone_type" in updates or "Zone Type" in updates or "type" in updates:
                ztype = updates.get("zone_type") or updates.get("Zone Type") or updates.get("type")
                target_zone["Zone Type"] = ztype
                target_zone["type"] = ztype
            if "weekend" in updates or "Weekend" in updates:
                target_zone["Weekend"] = updates.get("weekend") or updates.get("Weekend")
            if "day_night" in updates or "Day/Night" in updates:
                target_zone["Day/Night"] = updates.get("day_night") or updates.get("Day/Night")
            if "actual_energy_kw" in updates:
                target_zone["actual_energy_kw"] = float(updates["actual_energy_kw"])

            # Recalculate SVR & SHAP
            shap_res = explain_zone_shap(target_zone)
            target_zone["predicted_energy_kw"] = shap_res["predicted_energy"]
            target_zone["shap_explanation"] = shap_res
            target_zone["totalPower"] = shap_res["predicted_energy"]

            return {
                "status": "success",
                "zone_id": zone_id,
                "updated_zone": target_zone,
                "shap_explanation": shap_res,
            }

    def get_history(self):
        with self.lock:
            return {
                "history": self.history_cache,
                "interval": "15m",
                "total_points": len(self.history_cache),
            }

    def update_settings(self, new_settings: dict):
        with self.lock:
            if "electricityTariff" in new_settings:
                self.current_config["electricityTariff"] = float(new_settings["electricityTariff"])
            if "minComfortTemp" in new_settings:
                self.current_config["minComfortTemp"] = float(new_settings["minComfortTemp"])
            if "maxComfortTemp" in new_settings:
                self.current_config["maxComfortTemp"] = float(new_settings["maxComfortTemp"])
            if "workHoursStart" in new_settings:
                self.current_config["workHoursStart"] = int(new_settings["workHoursStart"])
            if "workHoursEnd" in new_settings:
                self.current_config["workHoursEnd"] = int(new_settings["workHoursEnd"])
            return {
                "status": "success",
                "config": self.current_config,
            }

    def reset_building(self):
        with self.lock:
            self.buildings = create_single_building_portfolio()
            return {"status": "success", "message": "Building reset to initial state."}

state_manager = BuildingStateManager()
