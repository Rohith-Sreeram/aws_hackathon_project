import { Building, Zone } from '../src/types.ts';
import { INITIAL_BUILDING } from './buildingData.ts';

export type ScenarioId =
  | 'normal'
  | 'empty_room_wastage'
  | 'underutilized_floor'
  | 'high_heat_demand'
  | 'equipment_anomaly';

export interface ScenarioMeta {
  id: ScenarioId;
  name: string;
  badge: string;
  description: string;
  expectedOutcome: string;
  outdoorTemp: number;
}

export const SCENARIOS: Record<ScenarioId, ScenarioMeta> = {
  normal: {
    id: 'normal',
    name: '1. Normal Operation',
    badge: 'Nominal',
    description: 'High occupancy during peak business hours with balanced HVAC and lighting.',
    expectedOutcome: 'Normal operation displayed. Zero wastage warnings. Legitimate high demand.',
    outdoorTemp: 24.0,
  },
  empty_room_wastage: {
    id: 'empty_room_wastage',
    name: '2. Empty Rooms with Active HVAC & Lights',
    badge: 'Wastage Warning',
    description: 'Meeting rooms & offices on Floor 2 and Floor 4 are vacant (presence = 0) with HVAC & lighting running at full capacity.',
    expectedOutcome: 'Flags "Potential HVAC wastage" and "Potential lighting wastage" with comfort-guarded eco controls.',
    outdoorTemp: 26.0,
  },
  underutilized_floor: {
    id: 'underutilized_floor',
    name: '3. Underutilized Floor (15% Occupancy)',
    badge: 'Underutilization',
    description: 'Floor 2 has only 15% zone presence while consuming full baseline power, compared to Floor 3 at 85% occupancy.',
    expectedOutcome: 'Identifies Floor 2 as underutilized. Issues zone consolidation recommendation.',
    outdoorTemp: 25.0,
  },
  high_heat_demand: {
    id: 'high_heat_demand',
    name: '4. Legitimate High Demand (Heatwave)',
    badge: 'High Demand',
    description: 'Outdoor temperature surges to 36°C with 90% building occupancy, requiring elevated chiller and HVAC loads.',
    expectedOutcome: 'Recognized as legitimate high weather demand. No unnecessary setback interventions.',
    outdoorTemp: 36.5,
  },
  equipment_anomaly: {
    id: 'equipment_anomaly',
    name: '5. Equipment & Plug-Load Anomaly',
    badge: 'Anomaly Alert',
    description: 'After-hours unexplainable 38 kW plug-load surge on Floor 2 while HVAC and lighting are normal/idle.',
    expectedOutcome: 'Triggers critical anomaly score (>0.85). Advises "Investigate equipment or plug loads".',
    outdoorTemp: 22.0,
  },
};

export function applyScenarioToBuilding(scenarioId: ScenarioId): {
  building: Building;
  outdoorTemp: number;
} {
  // Deep clone initial building
  const building: Building = JSON.parse(JSON.stringify(INITIAL_BUILDING));
  const scenario = SCENARIOS[scenarioId] || SCENARIOS.normal;

  switch (scenarioId) {
    case 'normal': {
      // High occupancy (~80%), normal HVAC & lighting
      for (const floor of building.floors) {
        for (const zone of floor.zones) {
          if (!zone.isCritical) {
            zone.currentPresence = 1;
            zone.hvacMode = 'normal';
            zone.lightingMode = 'on';
            zone.currentTemp = 22.2;
            zone.currentHvacPower = zone.type === 'meeting_room' ? 5.2 : zone.type === 'office' ? 9.5 : 3.0;
            zone.currentLightingPower = zone.type === 'office' ? 2.5 : 1.2;
            zone.currentEquipmentPower = zone.type === 'office' ? 6.5 : 2.0;
          } else {
            zone.currentPresence = 0;
            zone.currentHvacPower = 18.0;
            zone.currentEquipmentPower = 35.0;
          }
          zone.totalPower = zone.currentHvacPower + zone.currentLightingPower + zone.currentEquipmentPower;
        }
      }
      break;
    }

    case 'empty_room_wastage': {
      // Set Conference Room 2A & Boardroom 401 & Office 202 to presence = 0, but HVAC & Lights full blast
      for (const floor of building.floors) {
        for (const zone of floor.zones) {
          if (zone.id === 'zone-203' || zone.id === 'zone-401' || zone.id === 'zone-104') {
            zone.currentPresence = 0; // VACANT
            zone.currentHvacPower = 9.8; // HIGH HVAC
            zone.currentLightingPower = 2.4; // HIGH LIGHTING
            zone.currentEquipmentPower = 1.8;
            zone.hvacMode = 'normal';
            zone.lightingMode = 'on';
            zone.currentTemp = 21.0; // Comfort temp is fine (20-25.5°C) so recommendation is safe!
            zone.totalPower = zone.currentHvacPower + zone.currentLightingPower + zone.currentEquipmentPower;
          } else if (!zone.isCritical) {
            zone.currentPresence = 1;
            zone.currentHvacPower = 7.5;
            zone.currentLightingPower = 1.8;
            zone.currentEquipmentPower = 4.0;
            zone.totalPower = zone.currentHvacPower + zone.currentLightingPower + zone.currentEquipmentPower;
          }
        }
      }
      break;
    }

    case 'underutilized_floor': {
      // Floor 2 has 15% occupancy (only 1 zone out of 6 occupied), but full HVAC running
      for (const floor of building.floors) {
        if (floor.id === 'floor-2') {
          for (const zone of floor.zones) {
            if (zone.id === 'zone-201') {
              zone.currentPresence = 1;
              zone.currentHvacPower = 10.5;
              zone.currentLightingPower = 2.5;
              zone.currentEquipmentPower = 7.0;
            } else if (!zone.isCritical) {
              zone.currentPresence = 0;
              zone.currentHvacPower = 8.5; // Wasting HVAC across entire floor
              zone.currentLightingPower = 1.8;
              zone.currentEquipmentPower = 2.0;
            }
            zone.totalPower = zone.currentHvacPower + zone.currentLightingPower + zone.currentEquipmentPower;
          }
        } else if (floor.id === 'floor-3') {
          // Floor 3 is 85% occupied
          for (const zone of floor.zones) {
            zone.currentPresence = 1;
            zone.currentHvacPower = 8.0;
            zone.currentLightingPower = 2.0;
            zone.currentEquipmentPower = 5.0;
            zone.totalPower = zone.currentHvacPower + zone.currentLightingPower + zone.currentEquipmentPower;
          }
        }
      }
      break;
    }

    case 'high_heat_demand': {
      // 36.5°C outside heatwave, 90% occupancy, legitimate high HVAC
      for (const floor of building.floors) {
        for (const zone of floor.zones) {
          if (!zone.isCritical) {
            zone.currentPresence = 1;
            zone.currentTemp = 23.5;
            zone.currentHvacPower = 16.5; // High cooling load
            zone.currentLightingPower = 2.2;
            zone.currentEquipmentPower = 6.0;
          } else {
            zone.currentPresence = 0;
            zone.currentHvacPower = 32.0;
            zone.currentEquipmentPower = 40.0;
          }
          zone.totalPower = zone.currentHvacPower + zone.currentLightingPower + zone.currentEquipmentPower;
        }
      }
      break;
    }

    case 'equipment_anomaly': {
      // Floor 2 Engineering Bay B has equipment power spike (38 kW)
      for (const floor of building.floors) {
        for (const zone of floor.zones) {
          if (zone.id === 'zone-202') {
            zone.currentPresence = 0;
            zone.currentHvacPower = 2.0; // Normal low HVAC
            zone.currentLightingPower = 0.3; // Normal low lighting
            zone.currentEquipmentPower = 38.5; // CRITICAL PLUG LOAD SPIKE
            zone.totalPower = zone.currentHvacPower + zone.currentLightingPower + zone.currentEquipmentPower;
          } else if (!zone.isCritical) {
            zone.currentPresence = 1;
            zone.currentHvacPower = 6.0;
            zone.currentLightingPower = 1.5;
            zone.currentEquipmentPower = 3.5;
            zone.totalPower = zone.currentHvacPower + zone.currentLightingPower + zone.currentEquipmentPower;
          }
        }
      }
      break;
    }
  }

  return {
    building,
    outdoorTemp: scenario.outdoorTemp,
  };
}
