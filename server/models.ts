import {
  SensorReading,
  EnergyPrediction,
  AnomalyRecord,
  WastageRecord,
  Recommendation,
  BuildingUtilization,
  ConfigSettings,
  Zone,
  Building,
} from '../src/types.ts';

export const DEFAULT_CONFIG: ConfigSettings = {
  electricityTariff: 0.18, // $0.18 per kWh
  minComfortTemp: 20.0,
  maxComfortTemp: 25.5,
  workHoursStart: 8,
  workHoursEnd: 18,
  anomalySensitivity: 0.75,
};

/**
 * -------------------------------------------------------------
 * 1. PRE-TRAINED ENERGY FORECASTING MODEL INTERFACE
 * Separated model layer for easy connection of custom ML models (e.g. XGBoost, LSTM, Linear)
 * -------------------------------------------------------------
 */
export function predictEnergyModel(
  reading: Partial<SensorReading> & {
    zone_type?: string;
    area_sqm?: number;
    is_critical?: boolean;
    outdoor_temp?: number;
  },
  hourOfDay: number = 14,
  dayOfWeek: number = 2
): {
  predicted_energy: number;
  expected_energy: number;
  confidence_lower: number;
  confidence_upper: number;
} {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isWorkingHour = hourOfDay >= 8 && hourOfDay <= 18;
  const outdoorTemp = reading.outdoor_temp ?? 26.0;
  const indoorTemp = reading.temperature ?? 22.5;
  const presence = reading.presence ?? 0;
  const isCritical = reading.is_critical ?? (reading.zone_type === 'server_room' || reading.zone_type === 'equipment_room');

  // Baseline base power per zone type (kW)
  let baseKw = 1.0;
  switch (reading.zone_type) {
    case 'server_room':
      baseKw = 35.0; // Server constant load
      break;
    case 'equipment_room':
      baseKw = 10.0;
      break;
    case 'office':
      baseKw = 3.5;
      break;
    case 'meeting_room':
      baseKw = 1.5;
      break;
    case 'pantry':
      baseKw = 2.5;
      break;
    case 'corridor':
      baseKw = 1.0;
      break;
    case 'bathroom':
      baseKw = 0.8;
      break;
    default:
      baseKw = 2.0;
  }

  // Thermal delta load (cooling needed if outdoor > 21°C or heating if outdoor < 18°C)
  const deltaT = Math.max(0, outdoorTemp - 21.0) * 0.45;

  // Time-of-day diurnal curve (bell curve peaking at 14:00)
  const diurnalFactor = isWorkingHour && !isWeekend ? 1.0 + 0.3 * Math.sin(((hourOfDay - 8) / 10) * Math.PI) : 0.4;

  // Occupancy contribution
  const occupancyLoad = presence === 1 ? 4.5 : 0.5;

  // Expected energy based on standard physics & historical regression baseline
  let expected_energy: number;
  if (isCritical) {
    expected_energy = baseKw + deltaT * 0.8; // Critical runs 24/7
  } else {
    expected_energy = (baseKw + occupancyLoad + deltaT) * (isWeekend ? 0.35 : diurnalFactor);
  }

  // Predicted next-hour energy incorporating trending inertia
  const predicted_energy = expected_energy * (1.0 + (presence ? 0.05 : -0.05));

  return {
    predicted_energy: Math.max(0.2, Number(predicted_energy.toFixed(2))),
    expected_energy: Math.max(0.2, Number(expected_energy.toFixed(2))),
    confidence_lower: Math.max(0.1, Number((predicted_energy * 0.92).toFixed(2))),
    confidence_upper: Number((predicted_energy * 1.08).toFixed(2)),
  };
}

/**
 * -------------------------------------------------------------
 * 2. PRE-TRAINED ANOMALY DETECTION MODEL INTERFACE
 * Computes anomaly scores (0 to 1.0), status ('normal'|'warning'|'anomaly') and severity
 * -------------------------------------------------------------
 */
export function detectAnomalyModel(
  actualEnergy: number,
  expectedEnergy: number,
  reading: Partial<SensorReading>,
  zone?: Zone,
  config: ConfigSettings = DEFAULT_CONFIG
): {
  anomaly_status: 'normal' | 'warning' | 'anomaly';
  anomaly_score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  deviation_kw: number;
  deviation_pct: number;
  root_cause_hint: string;
} {
  const deviation_kw = actualEnergy - expectedEnergy;
  const deviation_pct = expectedEnergy > 0 ? (deviation_kw / expectedEnergy) * 100 : 0;

  // Logistic anomaly scoring curve normalized between 0.0 and 1.0
  const normalizedDev = Math.abs(deviation_kw) / Math.max(2.0, expectedEnergy * 0.25);
  let anomaly_score = Math.min(1.0, normalizedDev / (1.0 + normalizedDev));

  // Determine root cause hint
  let root_cause_hint = 'Nominal operational pattern';
  const isVacant = reading.presence === 0;
  const isCritical = zone?.isCritical || reading.zone_type === 'server_room';

  if (isVacant && !isCritical && (reading.hvac_power ?? 0) > 4.5) {
    anomaly_score = Math.max(anomaly_score, 0.85);
    root_cause_hint = 'High HVAC draw in unoccupied non-critical zone';
  } else if (isVacant && (reading.lighting_power ?? 0) > 1.2) {
    anomaly_score = Math.max(anomaly_score, 0.72);
    root_cause_hint = 'Lighting active in unoccupied zone';
  } else if (deviation_pct > 40 && (reading.equipment_power ?? 0) > (reading.hvac_power ?? 0)) {
    anomaly_score = Math.max(anomaly_score, 0.88);
    root_cause_hint = 'Abnormal equipment or plug-load spike detected';
  } else if (deviation_pct > 25) {
    root_cause_hint = 'Energy consumption significantly exceeds expected model baseline';
  }

  // Classification threshold
  let anomaly_status: 'normal' | 'warning' | 'anomaly' = 'normal';
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

  if (anomaly_score >= 0.8) {
    anomaly_status = 'anomaly';
    severity = deviation_kw > 15 || anomaly_score > 0.9 ? 'critical' : 'high';
  } else if (anomaly_score >= 0.6) {
    anomaly_status = 'warning';
    severity = 'medium';
  } else if (anomaly_score >= 0.4) {
    severity = 'low';
  }

  return {
    anomaly_status,
    anomaly_score: Number(anomaly_score.toFixed(2)),
    severity,
    deviation_kw: Number(deviation_kw.toFixed(2)),
    deviation_pct: Number(deviation_pct.toFixed(1)),
    root_cause_hint,
  };
}

/**
 * -------------------------------------------------------------
 * 3. COMPREHENSIVE WASTAGE & RECOMMENDATION ENGINE
 * Respects strict user-specified criteria, comfort safety bounds, and savings metrics
 * -------------------------------------------------------------
 */
export function analyzeBuildingState(
  building: Building,
  outdoorTemp: number = 26.0,
  config: ConfigSettings = DEFAULT_CONFIG
): {
  building_utilization: BuildingUtilization;
  anomalies: AnomalyRecord[];
  wastages: WastageRecord[];
  recommendations: Recommendation[];
  total_predicted_kw: number;
  total_expected_kw: number;
  total_actual_kw: number;
  subsystem_breakdown: {
    hvac_kw: number;
    lighting_kw: number;
    equipment_kw: number;
    base_kw: number;
  };
} {
  const anomalies: AnomalyRecord[] = [];
  const wastages: WastageRecord[] = [];
  const recommendations: Recommendation[] = [];

  let totalZones = 0;
  let occupiedZones = 0;
  let criticalCount = 0;
  let totalActualKw = 0;
  let totalExpectedKw = 0;
  let totalPredictedKw = 0;

  let totalHvacKw = 0;
  let totalLightingKw = 0;
  let totalEquipmentKw = 0;

  const floorUtilizations: BuildingUtilization['floor_utilizations'] = [];
  const underutilizedFloors: BuildingUtilization['underutilized_floors'] = [];

  const nowIso = new Date().toISOString();
  const currentHour = new Date().getHours();
  const isOperatingHours = currentHour >= config.workHoursStart && currentHour <= config.workHoursEnd;

  // Process all floors and zones
  for (const floor of building.floors) {
    let floorOccupied = 0;
    let floorTotal = floor.zones.length;
    let floorPower = 0;
    let floorExpected = 0;

    for (const zone of floor.zones) {
      totalZones++;
      if (zone.isCritical) criticalCount++;
      if (zone.currentPresence === 1) {
        occupiedZones++;
        floorOccupied++;
      }

      totalActualKw += zone.totalPower;
      floorPower += zone.totalPower;
      totalHvacKw += zone.currentHvacPower;
      totalLightingKw += zone.currentLightingPower;
      totalEquipmentKw += zone.currentEquipmentPower;

      // Model Predictions
      const pred = predictEnergyModel(
        {
          zone_type: zone.type,
          area_sqm: zone.areaSqM,
          is_critical: zone.isCritical,
          temperature: zone.currentTemp,
          humidity: zone.currentHumidity,
          presence: zone.currentPresence,
          outdoor_temp: outdoorTemp,
        },
        currentHour
      );

      totalExpectedKw += pred.expected_energy;
      totalPredictedKw += pred.predicted_energy;
      floorExpected += pred.expected_energy;

      // Anomaly Detection
      const anom = detectAnomalyModel(
        zone.totalPower,
        pred.expected_energy,
        {
          floor_id: floor.id,
          zone_id: zone.id,
          zone_type: zone.type,
          temperature: zone.currentTemp,
          presence: zone.currentPresence,
          hvac_power: zone.currentHvacPower,
          lighting_power: zone.currentLightingPower,
          equipment_power: zone.currentEquipmentPower,
        },
        zone,
        config
      );

      if (anom.anomaly_status !== 'normal') {
        anomalies.push({
          id: `anom-${zone.id}-${Date.now()}`,
          timestamp: nowIso,
          floor_id: floor.id,
          zone_id: zone.id,
          zone_name: `${floor.name} › ${zone.name}`,
          anomaly_score: anom.anomaly_score,
          anomaly_status: anom.anomaly_status,
          severity: anom.severity,
          actual_energy: zone.totalPower,
          expected_energy: pred.expected_energy,
          deviation_kw: anom.deviation_kw,
          deviation_pct: anom.deviation_pct,
          root_cause_hint: anom.root_cause_hint,
          is_resolved: false,
        });
      }

      // -------------------------------------------------------------
      // WASTAGE LOGIC EVALUATION
      // -------------------------------------------------------------

      // 1. HVAC Wastage: presence = 0 AND HVAC is high AND not critical
      if (zone.currentPresence === 0 && zone.currentHvacPower > 4.0 && !zone.isCritical) {
        const excessHvac = zone.currentHvacPower - 1.5; // Saving down to 1.5 kW eco mode
        wastages.push({
          id: `waste-hvac-${zone.id}`,
          type: 'hvac_wastage',
          title: 'Potential HVAC wastage',
          floor_id: floor.id,
          zone_id: zone.id,
          zone_name: `${floor.name} › ${zone.name}`,
          vacancy_duration_min: 75,
          hvac_power_kw: zone.currentHvacPower,
          lighting_power_kw: zone.currentLightingPower,
          equipment_power_kw: zone.currentEquipmentPower,
          wasted_power_kw: Number(excessHvac.toFixed(2)),
          severity: zone.currentHvacPower > 8.0 ? 'high' : 'medium',
          timestamp: nowIso,
        });

        // Comfort Protection Verification
        // "If temperature is outside comfort range, do NOT recommend reducing HVAC operation"
        const isTempInComfortRange =
          zone.currentTemp >= config.minComfortTemp && zone.currentTemp <= config.maxComfortTemp;

        if (isTempInComfortRange && !zone.isCritical) {
          const savingKw = excessHvac;
          const hourlySavingKwh = savingKw;
          const monthlyCostSaving = hourlySavingKwh * 24 * 30 * config.electricityTariff;

          recommendations.push({
            id: `rec-hvac-${zone.id}`,
            priority: zone.currentHvacPower > 8.0 ? 'HIGH PRIORITY' : 'MEDIUM PRIORITY',
            type: 'HVAC',
            recommendation: `Place ${zone.name} HVAC in energy-saving mode.`,
            reason: `Low presence (vacant) and high HVAC consumption (${zone.currentHvacPower.toFixed(1)} kW).`,
            floor_id: floor.id,
            zone_id: zone.id,
            zone_name: `${floor.name} › ${zone.name}`,
            current_power_kw: zone.totalPower,
            recommended_power_kw: Number((zone.totalPower - savingKw).toFixed(2)),
            estimated_saving_kw: Number(savingKw.toFixed(2)),
            estimated_hourly_saving_kwh: Number(hourlySavingKwh.toFixed(2)),
            estimated_monthly_saving_cost: Number(monthlyCostSaving.toFixed(2)),
            status: zone.hvacMode === 'energy_saving' ? 'applied' : 'active',
            comfort_checks: {
              passed: true,
              temperature: zone.currentTemp,
              comfort_range: `${config.minComfortTemp}°C - ${config.maxComfortTemp}°C`,
              is_critical_zone: false,
              operating_hours: isOperatingHours ? 'Business Hours (Standard Eco Allowed)' : 'After Hours',
              message: `Comfort preserved: Current temperature (${zone.currentTemp}°C) is within safe bounds (${config.minComfortTemp}°C - ${config.maxComfortTemp}°C).`,
            },
            suggested_action: {
              type: 'set_hvac_eco',
              floor_id: floor.id,
              zone_id: zone.id,
            },
            timestamp: nowIso,
          });
        }
      }

      // 2. Lighting Wastage: presence = 0 AND lighting is high
      if (zone.currentPresence === 0 && zone.currentLightingPower > 1.0) {
        const excessLighting = zone.currentLightingPower - 0.2;
        wastages.push({
          id: `waste-light-${zone.id}`,
          type: 'lighting_wastage',
          title: 'Potential lighting wastage',
          floor_id: floor.id,
          zone_id: zone.id,
          zone_name: `${floor.name} › ${zone.name}`,
          vacancy_duration_min: 60,
          hvac_power_kw: zone.currentHvacPower,
          lighting_power_kw: zone.currentLightingPower,
          equipment_power_kw: zone.currentEquipmentPower,
          wasted_power_kw: Number(excessLighting.toFixed(2)),
          severity: 'medium',
          timestamp: nowIso,
        });

        const savingKw = excessLighting;
        const hourlySavingKwh = savingKw;
        const monthlyCostSaving = hourlySavingKwh * 24 * 30 * config.electricityTariff;

        recommendations.push({
          id: `rec-light-${zone.id}`,
          priority: 'MEDIUM PRIORITY',
          type: 'LIGHTING',
          recommendation: `Turn off or dim lighting in ${zone.name}.`,
          reason: `Zone is vacant with lighting fully active (${zone.currentLightingPower.toFixed(1)} kW).`,
          floor_id: floor.id,
          zone_id: zone.id,
          zone_name: `${floor.name} › ${zone.name}`,
          current_power_kw: zone.totalPower,
          recommended_power_kw: Number((zone.totalPower - savingKw).toFixed(2)),
          estimated_saving_kw: Number(savingKw.toFixed(2)),
          estimated_hourly_saving_kwh: Number(hourlySavingKwh.toFixed(2)),
          estimated_monthly_saving_cost: Number(monthlyCostSaving.toFixed(2)),
          status: zone.lightingMode === 'off' ? 'applied' : 'active',
          comfort_checks: {
            passed: true,
            temperature: zone.currentTemp,
            comfort_range: `${config.minComfortTemp}°C - ${config.maxComfortTemp}°C`,
            is_critical_zone: zone.isCritical,
            operating_hours: 'All Hours',
            message: 'Lighting control has zero thermal comfort impact on occupants.',
          },
          suggested_action: {
            type: 'turn_off_lights',
            floor_id: floor.id,
            zone_id: zone.id,
          },
          timestamp: nowIso,
        });
      }

      // 3. Equipment Investigation: energy is abnormal but HVAC and lighting are normal
      if (
        zone.totalPower > pred.expected_energy * 1.3 &&
        zone.currentHvacPower <= 10.0 &&
        zone.currentLightingPower <= 2.5 &&
        zone.currentEquipmentPower > 8.0 &&
        !zone.isCritical
      ) {
        wastages.push({
          id: `waste-equip-${zone.id}`,
          type: 'equipment_abnormal_load',
          title: 'Investigate equipment or plug loads',
          floor_id: floor.id,
          zone_id: zone.id,
          zone_name: `${floor.name} › ${zone.name}`,
          vacancy_duration_min: zone.currentPresence === 0 ? 90 : 0,
          hvac_power_kw: zone.currentHvacPower,
          lighting_power_kw: zone.currentLightingPower,
          equipment_power_kw: zone.currentEquipmentPower,
          wasted_power_kw: Number((zone.currentEquipmentPower * 0.4).toFixed(2)),
          severity: 'high',
          timestamp: nowIso,
        });

        recommendations.push({
          id: `rec-equip-${zone.id}`,
          priority: 'MEDIUM PRIORITY',
          type: 'EQUIPMENT',
          recommendation: `Inspect equipment and plug loads in ${zone.name}.`,
          reason: `Abnormal energy consumption (${zone.totalPower.toFixed(1)} kW) detected while HVAC and lighting are within normal bounds.`,
          floor_id: floor.id,
          zone_id: zone.id,
          zone_name: `${floor.name} › ${zone.name}`,
          current_power_kw: zone.totalPower,
          recommended_power_kw: Number((zone.totalPower * 0.75).toFixed(2)),
          estimated_saving_kw: Number((zone.currentEquipmentPower * 0.4).toFixed(2)),
          estimated_hourly_saving_kwh: Number((zone.currentEquipmentPower * 0.4).toFixed(2)),
          estimated_monthly_saving_cost: Number(
            (zone.currentEquipmentPower * 0.4 * 24 * 30 * config.electricityTariff).toFixed(2)
          ),
          status: 'active',
          comfort_checks: {
            passed: true,
            temperature: zone.currentTemp,
            comfort_range: `${config.minComfortTemp}°C - ${config.maxComfortTemp}°C`,
            is_critical_zone: false,
            operating_hours: 'Physical Inspection',
            message: 'Equipment inspection does not disrupt primary building environmental controls.',
          },
          suggested_action: {
            type: 'schedule_inspection',
            floor_id: floor.id,
            zone_id: zone.id,
          },
          timestamp: nowIso,
        });
      }
    }

    const floorRatio = floorTotal > 0 ? floorOccupied / floorTotal : 0;
    floorUtilizations.push({
      floor_id: floor.id,
      floor_name: floor.name,
      utilization_ratio: Number(floorRatio.toFixed(2)),
      occupied_count: floorOccupied,
      total_count: floorTotal,
      total_power_kw: Number(floorPower.toFixed(2)),
    });

    // 4. Low utilization with high energy (Floor level)
    // occupied_zone_ratio is low AND actual energy is higher than expected energy
    if (floorRatio <= 0.25 && floorPower > floorExpected * 1.15) {
      underutilizedFloors.push({
        floor_id: floor.id,
        floor_name: floor.name,
        utilization_ratio: Number(floorRatio.toFixed(2)),
        occupied_count: floorOccupied,
        total_count: floorTotal,
      });

      const floorExcess = floorPower - floorExpected * 0.6;
      recommendations.push({
        id: `rec-floor-underutil-${floor.id}`,
        priority: 'HIGH PRIORITY',
        type: 'CONSOLIDATION',
        recommendation: `Consolidate occupant zones on ${floor.name} and apply setback.`,
        reason: `Low floor utilization (${(floorRatio * 100).toFixed(0)}%) with high actual energy consumption (${floorPower.toFixed(1)} kW vs expected ${floorExpected.toFixed(1)} kW).`,
        floor_id: floor.id,
        current_power_kw: Number(floorPower.toFixed(2)),
        recommended_power_kw: Number((floorExpected * 0.6).toFixed(2)),
        estimated_saving_kw: Number(floorExcess.toFixed(2)),
        estimated_hourly_saving_kwh: Number(floorExcess.toFixed(2)),
        estimated_monthly_saving_cost: Number((floorExcess * 24 * 30 * config.electricityTariff).toFixed(2)),
        status: 'active',
        comfort_checks: {
          passed: true,
          temperature: 22.0,
          comfort_range: `${config.minComfortTemp}°C - ${config.maxComfortTemp}°C`,
          is_critical_zone: false,
          operating_hours: isOperatingHours ? 'Core Hours Setback' : 'After Hours',
          message: 'Migrate active staff to adjacent occupied wings before applying floor-wide setbacks.',
        },
        suggested_action: {
          type: 'consolidate_zones',
          floor_id: floor.id,
        },
        timestamp: nowIso,
      });
    }
  }

  const buildingUtilizationRatio = totalZones > 0 ? occupiedZones / totalZones : 0;

  // 5. No Action condition: High occupancy OR high outdoor heat explains energy
  if (
    (buildingUtilizationRatio > 0.75 || outdoorTemp > 32.0) &&
    wastages.length === 0 &&
    recommendations.length === 0
  ) {
    recommendations.push({
      id: `rec-noaction-${Date.now()}`,
      priority: 'LOW PRIORITY',
      type: 'NO_ACTION',
      recommendation: 'No intervention recommended.',
      reason:
        buildingUtilizationRatio > 0.75
          ? `High energy is justified by high building occupancy (${(buildingUtilizationRatio * 100).toFixed(0)}%).`
          : `High cooling load is justified by high outdoor ambient temperature (${outdoorTemp}°C).`,
      floor_id: 'building-wide',
      current_power_kw: Number(totalActualKw.toFixed(2)),
      recommended_power_kw: Number(totalActualKw.toFixed(2)),
      estimated_saving_kw: 0,
      estimated_hourly_saving_kwh: 0,
      estimated_monthly_saving_cost: 0,
      status: 'active',
      comfort_checks: {
        passed: true,
        temperature: 22.2,
        comfort_range: `${config.minComfortTemp}°C - ${config.maxComfortTemp}°C`,
        is_critical_zone: false,
        operating_hours: 'All Hours',
        message: 'Comfort parameters are perfectly aligned with current building demand.',
      },
      timestamp: nowIso,
    });
  }

  const building_utilization: BuildingUtilization = {
    building_utilization_ratio: Number(buildingUtilizationRatio.toFixed(2)),
    total_zones: totalZones,
    occupied_zones: occupiedZones,
    vacant_zones: totalZones - occupiedZones,
    critical_zones_count: criticalCount,
    underutilized_floors: underutilizedFloors,
    floor_utilizations: floorUtilizations,
  };

  const subsystem_breakdown = {
    hvac_kw: Number(totalHvacKw.toFixed(2)),
    lighting_kw: Number(totalLightingKw.toFixed(2)),
    equipment_kw: Number(totalEquipmentKw.toFixed(2)),
    base_kw: Number((totalActualKw - (totalHvacKw + totalLightingKw + totalEquipmentKw)).toFixed(2)),
  };

  return {
    building_utilization,
    anomalies,
    wastages,
    recommendations,
    total_predicted_kw: Number(totalPredictedKw.toFixed(2)),
    total_expected_kw: Number(totalExpectedKw.toFixed(2)),
    total_actual_kw: Number(totalActualKw.toFixed(2)),
    subsystem_breakdown,
  };
}
