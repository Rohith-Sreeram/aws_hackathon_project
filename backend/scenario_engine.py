"""
Demonstration Scenario Engine for Smart Building Energy Management System.
"""
import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
for p in [CURRENT_DIR, ROOT_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.building_data import INITIAL_BUILDING
except (ImportError, ModuleNotFoundError):
    from building_data import INITIAL_BUILDING

SCENARIOS = {
    "normal": {
        "id": "normal",
        "name": "1. Normal Operation",
        "badge": "Nominal",
        "description": "High occupancy during peak business hours with balanced HVAC and lighting.",
        "expectedOutcome": "Normal operation displayed. Zero wastage warnings. Legitimate high demand.",
        "outdoorTemp": 24.0,
    },
    "empty_room_wastage": {
        "id": "empty_room_wastage",
        "name": "2. Empty Rooms with Active HVAC & Lights",
        "badge": "Wastage Warning",
        "description": "Meeting rooms & offices on Floor 2 and Floor 4 are vacant (presence = 0) with HVAC & lighting running at full capacity.",
        "expectedOutcome": 'Flags "Potential HVAC wastage" and "Potential lighting wastage" with comfort-guarded eco controls.',
        "outdoorTemp": 26.0,
    },
    "underutilized_floor": {
        "id": "underutilized_floor",
        "name": "3. Underutilized Floor (15% Occupancy)",
        "badge": "Underutilization",
        "description": "Floor 2 has only 15% zone presence while consuming full baseline power, compared to Floor 3 at 85% occupancy.",
        "expectedOutcome": "Identifies Floor 2 as underutilized. Issues zone consolidation recommendation.",
        "outdoorTemp": 25.0,
    },
    "high_heat_demand": {
        "id": "high_heat_demand",
        "name": "4. Legitimate High Demand (Heatwave)",
        "badge": "High Demand",
        "description": "Outdoor temperature surges to 36°C with 90% building occupancy, requiring elevated chiller and HVAC loads.",
        "expectedOutcome": "Recognized as legitimate high weather demand. No unnecessary setback interventions.",
        "outdoorTemp": 36.5,
    },
    "equipment_anomaly": {
        "id": "equipment_anomaly",
        "name": "5. Equipment & Plug-Load Anomaly",
        "badge": "Anomaly Alert",
        "description": "After-hours unexplainable 38 kW plug-load surge on Floor 2 while HVAC and lighting are normal/idle.",
        "expectedOutcome": 'Triggers critical anomaly score (>0.85). Advises "Investigate equipment or plug loads".',
        "outdoorTemp": 22.0,
    },
}

def apply_scenario_to_building(scenario_id: str) -> dict:
    building = copy.deepcopy(INITIAL_BUILDING)
    scenario = SCENARIOS.get(scenario_id, SCENARIOS["normal"])

    if scenario_id == "normal":
        for floor in building["floors"]:
            for zone in floor["zones"]:
                if not zone.get("isCritical"):
                    zone["currentPresence"] = 1
                    zone["hvacMode"] = "normal"
                    zone["lightingMode"] = "on"
                    zone["currentTemp"] = 22.2
                    zone["currentHvacPower"] = 5.2 if zone["type"] == "meeting_room" else (9.5 if zone["type"] == "office" else 3.0)
                    zone["currentLightingPower"] = 2.5 if zone["type"] == "office" else 1.2
                    zone["currentEquipmentPower"] = 6.5 if zone["type"] == "office" else 2.0
                else:
                    zone["currentPresence"] = 0
                    zone["currentHvacPower"] = 18.0
                    zone["currentEquipmentPower"] = 35.0
                zone["totalPower"] = round(zone["currentHvacPower"] + zone["currentLightingPower"] + zone["currentEquipmentPower"], 2)

    elif scenario_id == "empty_room_wastage":
        for floor in building["floors"]:
            for zone in floor["zones"]:
                if zone["id"] in ("zone-203", "zone-401", "zone-104"):
                    zone["currentPresence"] = 0  # VACANT
                    zone["currentHvacPower"] = 9.8  # HIGH HVAC
                    zone["currentLightingPower"] = 2.4  # HIGH LIGHTING
                    zone["currentEquipmentPower"] = 1.8
                    zone["hvacMode"] = "normal"
                    zone["lightingMode"] = "on"
                    zone["currentTemp"] = 21.0  # Comfort temp in safe range
                    zone["totalPower"] = round(zone["currentHvacPower"] + zone["currentLightingPower"] + zone["currentEquipmentPower"], 2)
                elif not zone.get("isCritical"):
                    zone["currentPresence"] = 1
                    zone["currentHvacPower"] = 7.5
                    zone["currentLightingPower"] = 1.8
                    zone["currentEquipmentPower"] = 4.0
                    zone["totalPower"] = round(zone["currentHvacPower"] + zone["currentLightingPower"] + zone["currentEquipmentPower"], 2)

    elif scenario_id == "underutilized_floor":
        for floor in building["floors"]:
            if floor["id"] == "floor-2":
                for zone in floor["zones"]:
                    if zone["id"] == "zone-201":
                        zone["currentPresence"] = 1
                        zone["currentHvacPower"] = 10.5
                        zone["currentLightingPower"] = 2.5
                        zone["currentEquipmentPower"] = 7.0
                    elif not zone.get("isCritical"):
                        zone["currentPresence"] = 0
                        zone["currentHvacPower"] = 8.5  # Wasting HVAC across entire floor
                        zone["currentLightingPower"] = 1.8
                        zone["currentEquipmentPower"] = 2.0
                    zone["totalPower"] = round(zone["currentHvacPower"] + zone["currentLightingPower"] + zone["currentEquipmentPower"], 2)
            elif floor["id"] == "floor-3":
                for zone in floor["zones"]:
                    zone["currentPresence"] = 1
                    zone["currentHvacPower"] = 8.0
                    zone["currentLightingPower"] = 2.0
                    zone["currentEquipmentPower"] = 5.0
                    zone["totalPower"] = round(zone["currentHvacPower"] + zone["currentLightingPower"] + zone["currentEquipmentPower"], 2)

    elif scenario_id == "high_heat_demand":
        for floor in building["floors"]:
            for zone in floor["zones"]:
                if not zone.get("isCritical"):
                    zone["currentPresence"] = 1
                    zone["currentTemp"] = 23.5
                    zone["currentHvacPower"] = 16.5  # High cooling load
                    zone["currentLightingPower"] = 2.2
                    zone["currentEquipmentPower"] = 6.0
                else:
                    zone["currentPresence"] = 0
                    zone["currentHvacPower"] = 32.0
                    zone["currentEquipmentPower"] = 40.0
                zone["totalPower"] = round(zone["currentHvacPower"] + zone["currentLightingPower"] + zone["currentEquipmentPower"], 2)

    elif scenario_id == "equipment_anomaly":
        for floor in building["floors"]:
            for zone in floor["zones"]:
                if zone["id"] == "zone-202":
                    zone["currentPresence"] = 0
                    zone["currentHvacPower"] = 2.0
                    zone["currentLightingPower"] = 0.3
                    zone["currentEquipmentPower"] = 38.5  # CRITICAL PLUG LOAD SPIKE
                    zone["totalPower"] = round(zone["currentHvacPower"] + zone["currentLightingPower"] + zone["currentEquipmentPower"], 2)
                elif not zone.get("isCritical"):
                    zone["currentPresence"] = 1
                    zone["currentHvacPower"] = 6.0
                    zone["currentLightingPower"] = 1.5
                    zone["currentEquipmentPower"] = 3.5
                    zone["totalPower"] = round(zone["currentHvacPower"] + zone["currentLightingPower"] + zone["currentEquipmentPower"], 2)

    return {
        "building": building,
        "outdoorTemp": scenario["outdoorTemp"],
    }
