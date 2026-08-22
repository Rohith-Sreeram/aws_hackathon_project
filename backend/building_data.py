"""
Single Building Topology & Baseline Parameters.
1 Building: Apex Corporate Tower
4 Floors (Floor 1 to Floor 4)
Each floor: 4 Offices + 2 Meeting Halls = 6 zones per floor (24 zones total)
"""
from datetime import datetime, timezone

def get_iso_now():
    return datetime.now(timezone.utc).isoformat()

def create_floor_zones(floor_num: int, floor_name: str, profile: str = "normal"):
    """
    Creates 6 zones for a floor:
    - 4 Offices
    - 2 Meeting Halls
    """
    prefix = f"fl{floor_num}"
    
    # Realistic operational defaults per floor
    if floor_num == 1:
        # Ground floor: active reception/executive, normal load
        off_1_occ, off_1_hvac, off_1_light, off_1_fan = 45, "ON", "ON", "ON"
        off_2_occ, off_2_hvac, off_2_light, off_2_fan = 50, "ON", "ON", "OFF"
        off_3_occ, off_3_hvac, off_3_light, off_3_fan = 35, "ON", "ON", "ON"
        off_4_occ, off_4_hvac, off_4_light, off_4_fan = 30, "ON", "ON", "OFF"
        hall_a_occ, hall_a_hvac, hall_a_light, hall_a_fan = 60, "ON", "ON", "ON"
        hall_b_occ, hall_b_hvac, hall_b_light, hall_b_fan = 0, "OFF", "OFF", "OFF"
    elif floor_num == 2:
        # Floor 2: Engineering & Tech - High Occupancy, high demand
        off_1_occ, off_1_hvac, off_1_light, off_1_fan = 65, "ON", "ON", "ON"
        off_2_occ, off_2_hvac, off_2_light, off_2_fan = 70, "ON", "ON", "ON"
        off_3_occ, off_3_hvac, off_3_light, off_3_fan = 55, "ON", "ON", "OFF"
        off_4_occ, off_4_hvac, off_4_light, off_4_fan = 60, "ON", "ON", "ON"
        hall_a_occ, hall_a_hvac, hall_a_light, hall_a_fan = 40, "ON", "ON", "ON"
        hall_b_occ, hall_b_hvac, hall_b_light, hall_b_fan = 30, "ON", "ON", "OFF"
    elif floor_num == 3:
        # Floor 3: Product & Marketing - Wastage Scenario: 2 unoccupied rooms with active HVAC/lights
        off_1_occ, off_1_hvac, off_1_light, off_1_fan = 40, "ON", "ON", "ON"
        off_2_occ, off_2_hvac, off_2_light, off_2_fan = 0, "ON", "ON", "ON"   # Wastage: 0 occupancy, HVAC ON
        off_3_occ, off_3_hvac, off_3_light, off_3_fan = 45, "ON", "ON", "OFF"
        off_4_occ, off_4_hvac, off_4_light, off_4_fan = 0, "ON", "ON", "OFF"  # Wastage: 0 occupancy, HVAC ON
        hall_a_occ, hall_a_hvac, hall_a_light, hall_a_fan = 0, "ON", "ON", "ON"   # Wastage: 0 occupancy, Hall ON
        hall_b_occ, hall_b_hvac, hall_b_light, hall_b_fan = 50, "ON", "ON", "ON"
    else:
        # Floor 4: Research & Innovation - Eco/Balanced operation
        off_1_occ, off_1_hvac, off_1_light, off_1_fan = 35, "ON", "ON", "OFF"
        off_2_occ, off_2_hvac, off_2_light, off_2_fan = 40, "ON", "ON", "OFF"
        off_3_occ, off_3_hvac, off_3_light, off_3_fan = 0, "OFF", "OFF", "OFF"
        off_4_occ, off_4_hvac, off_4_light, off_4_fan = 30, "ON", "ON", "OFF"
        hall_a_occ, hall_a_hvac, hall_a_light, hall_a_fan = 0, "OFF", "OFF", "OFF"
        hall_b_occ, hall_b_hvac, hall_b_light, hall_b_fan = 25, "ON", "ON", "OFF"

    floor_id = f"floor-{floor_num}"

    zones = [
        # --- 4 Offices ---
        {
            "id": f"{prefix}-off-1",
            "buildingId": "bldg-apex",
            "floorId": floor_id,
            "name": f"Office {floor_num}01 ({floor_name})",
            "type": "Office",
            "areaSqM": 180,
            "isCritical": False,
            "targetTemp": 22.0,
            "minComfortTemp": 20.0,
            "maxComfortTemp": 25.5,
            "Occupancy": off_1_occ,
            "Temperature": 22.8,
            "Humidity": 48.0,
            "Weekend": "No",
            "Day/Night": "Day",
            "HVAC Status": off_1_hvac,
            "Fan Status": off_1_fan,
            "Lighting Status": off_1_light,
            "hvacMode": "energy_saving" if off_1_hvac == "OFF" else "normal",
            "lightingMode": "off" if off_1_light == "OFF" else "on",
            "fanMode": "off" if off_1_fan == "OFF" else "on",
        },
        {
            "id": f"{prefix}-off-2",
            "buildingId": "bldg-apex",
            "floorId": floor_id,
            "name": f"Office {floor_num}02 ({floor_name})",
            "type": "Office",
            "areaSqM": 200,
            "isCritical": False,
            "targetTemp": 22.0,
            "minComfortTemp": 20.0,
            "maxComfortTemp": 25.5,
            "Occupancy": off_2_occ,
            "Temperature": 23.2,
            "Humidity": 46.0,
            "Weekend": "No",
            "Day/Night": "Day",
            "HVAC Status": off_2_hvac,
            "Fan Status": off_2_fan,
            "Lighting Status": off_2_light,
            "hvacMode": "energy_saving" if off_2_hvac == "OFF" else "normal",
            "lightingMode": "off" if off_2_light == "OFF" else "on",
            "fanMode": "off" if off_2_fan == "OFF" else "on",
        },
        {
            "id": f"{prefix}-off-3",
            "buildingId": "bldg-apex",
            "floorId": floor_id,
            "name": f"Office {floor_num}03 ({floor_name})",
            "type": "Office",
            "areaSqM": 220,
            "isCritical": False,
            "targetTemp": 22.0,
            "minComfortTemp": 20.0,
            "maxComfortTemp": 25.5,
            "Occupancy": off_3_occ,
            "Temperature": 23.0,
            "Humidity": 50.0,
            "Weekend": "No",
            "Day/Night": "Day",
            "HVAC Status": off_3_hvac,
            "Fan Status": off_3_fan,
            "Lighting Status": off_3_light,
            "hvacMode": "energy_saving" if off_3_hvac == "OFF" else "normal",
            "lightingMode": "off" if off_3_light == "OFF" else "on",
            "fanMode": "off" if off_3_fan == "OFF" else "on",
        },
        {
            "id": f"{prefix}-off-4",
            "buildingId": "bldg-apex",
            "floorId": floor_id,
            "name": f"Office {floor_num}04 ({floor_name})",
            "type": "Office",
            "areaSqM": 190,
            "isCritical": False,
            "targetTemp": 22.0,
            "minComfortTemp": 20.0,
            "maxComfortTemp": 25.5,
            "Occupancy": off_4_occ,
            "Temperature": 22.5,
            "Humidity": 45.0,
            "Weekend": "No",
            "Day/Night": "Day",
            "HVAC Status": off_4_hvac,
            "Fan Status": off_4_fan,
            "Lighting Status": off_4_light,
            "hvacMode": "energy_saving" if off_4_hvac == "OFF" else "normal",
            "lightingMode": "off" if off_4_light == "OFF" else "on",
            "fanMode": "off" if off_4_fan == "OFF" else "on",
        },

        # --- 2 Meeting Halls ---
        {
            "id": f"{prefix}-hall-1",
            "buildingId": "bldg-apex",
            "floorId": floor_id,
            "name": f"Meeting Hall {floor_num}A - Conference ({floor_name})",
            "type": "Meeting Hall",
            "areaSqM": 320,
            "isCritical": False,
            "targetTemp": 21.5,
            "minComfortTemp": 20.0,
            "maxComfortTemp": 25.0,
            "Occupancy": hall_a_occ,
            "Temperature": 22.0,
            "Humidity": 49.0,
            "Weekend": "No",
            "Day/Night": "Day",
            "HVAC Status": hall_a_hvac,
            "Fan Status": hall_a_fan,
            "Lighting Status": hall_a_light,
            "hvacMode": "energy_saving" if hall_a_hvac == "OFF" else "normal",
            "lightingMode": "off" if hall_a_light == "OFF" else "on",
            "fanMode": "off" if hall_a_fan == "OFF" else "on",
        },
        {
            "id": f"{prefix}-hall-2",
            "buildingId": "bldg-apex",
            "floorId": floor_id,
            "name": f"Meeting Hall {floor_num}B - Boardroom ({floor_name})",
            "type": "Meeting Hall",
            "areaSqM": 240,
            "isCritical": False,
            "targetTemp": 21.5,
            "minComfortTemp": 20.0,
            "maxComfortTemp": 25.0,
            "Occupancy": hall_b_occ,
            "Temperature": 21.8,
            "Humidity": 44.0,
            "Weekend": "No",
            "Day/Night": "Day",
            "HVAC Status": hall_b_hvac,
            "Fan Status": hall_b_fan,
            "Lighting Status": hall_b_light,
            "hvacMode": "energy_saving" if hall_b_hvac == "OFF" else "normal",
            "lightingMode": "off" if hall_b_light == "OFF" else "on",
            "fanMode": "off" if hall_b_fan == "OFF" else "on",
        },
    ]
    return zones

def create_single_building_portfolio():
    """
    Creates 1 Building with 4 Floors:
    Each floor has 4 Offices and 2 Meeting Halls (6 zones per floor, 24 zones total).
    """
    floors = [
        {
            "id": "floor-1",
            "floorNumber": 1,
            "name": "Floor 1 - Executive & Operations",
            "areaSqM": 1350,
            "zones": create_floor_zones(1, "Floor 1"),
        },
        {
            "id": "floor-2",
            "floorNumber": 2,
            "name": "Floor 2 - Engineering & Technology Hub",
            "areaSqM": 1350,
            "zones": create_floor_zones(2, "Floor 2"),
        },
        {
            "id": "floor-3",
            "floorNumber": 3,
            "name": "Floor 3 - Product & Marketing Wing",
            "areaSqM": 1350,
            "zones": create_floor_zones(3, "Floor 3"),
        },
        {
            "id": "floor-4",
            "floorNumber": 4,
            "name": "Floor 4 - Research & Innovation Lab",
            "areaSqM": 1350,
            "zones": create_floor_zones(4, "Floor 4"),
        },
    ]

    building = {
        "id": "bldg-apex",
        "code": "APEX",
        "name": "Apex Corporate Tower",
        "address": "100 Enterprise Boulevard, Innovation Park",
        "totalAreaSqM": 5400,
        "floors_count": 4,
        "total_zones_count": 24,
        "offices_per_floor": 4,
        "meeting_halls_per_floor": 2,
        "floors": floors,
    }

    return [building]

INITIAL_BUILDING = create_single_building_portfolio()[0]
