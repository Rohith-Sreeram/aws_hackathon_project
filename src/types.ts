export type ZoneType =
  | 'office'
  | 'meeting_room'
  | 'corridor'
  | 'bathroom'
  | 'pantry'
  | 'server_room'
  | 'equipment_room';

export interface Zone {
  id: string;
  floorId: string;
  name: string;
  type: ZoneType;
  areaSqM: number;
  isCritical: boolean; // Server rooms, telecom, UPS etc.
  targetTemp: number; // e.g. 22°C
  minComfortTemp: number; // e.g. 20°C
  maxComfortTemp: number; // e.g. 25.5°C
  minVentilationCfm: number;
  // Current real-time state
  currentPresence: 0 | 1;
  currentTemp: number;
  currentHumidity: number;
  currentHvacPower: number; // kW
  currentLightingPower: number; // kW
  currentEquipmentPower: number; // kW
  totalPower: number; // kW
  hvacMode: 'normal' | 'energy_saving' | 'boost' | 'off';
  lightingMode: 'on' | 'dimmed' | 'off' | 'auto';
  lastOccupiedAt: string; // ISO string
}

export interface Floor {
  id: string;
  name: string;
  level: number;
  zones: Zone[];
  totalAreaSqM: number;
}

export interface Building {
  id: string;
  name: string;
  address: string;
  totalFloors: number;
  totalZones: number;
  floors: Floor[];
}

export interface SensorReading {
  id?: string;
  timestamp: string; // ISO or YYYY-MM-DDTHH:mm:ss
  floor_id: string;
  zone_id: string;
  zone_type: ZoneType;
  temperature: number; // °C
  humidity: number; // %
  presence: 0 | 1;
  hvac_power: number; // kW
  lighting_power: number; // kW
  equipment_power: number; // kW
  energy_consumption: number; // kWh (or total kW power draw in interval)
  notes?: string;
}

export interface EnergyPrediction {
  timestamp: string;
  predicted_energy: number; // kW
  expected_energy: number; // kW baseline model
  actual_energy?: number; // kW
  deviation_kw?: number;
  deviation_pct?: number;
  confidence_lower?: number;
  confidence_upper?: number;
}

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
export type AnomalyStatus = 'normal' | 'warning' | 'anomaly';

export interface AnomalyRecord {
  id: string;
  timestamp: string;
  floor_id: string;
  zone_id: string;
  zone_name: string;
  anomaly_score: number; // 0.00 to 1.00
  anomaly_status: AnomalyStatus;
  severity: AnomalySeverity;
  actual_energy: number;
  expected_energy: number;
  deviation_kw: number;
  deviation_pct: number;
  root_cause_hint: string;
  is_resolved?: boolean;
}

export type WastageType =
  | 'hvac_wastage'
  | 'lighting_wastage'
  | 'low_utilization_high_energy'
  | 'equipment_abnormal_load';

export interface WastageRecord {
  id: string;
  type: WastageType;
  title: string;
  floor_id: string;
  zone_id: string;
  zone_name: string;
  vacancy_duration_min: number;
  hvac_power_kw: number;
  lighting_power_kw: number;
  equipment_power_kw: number;
  wasted_power_kw: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

export type RecommendationPriority = 'HIGH PRIORITY' | 'MEDIUM PRIORITY' | 'LOW PRIORITY';

export interface Recommendation {
  id: string;
  priority: RecommendationPriority;
  type: 'HVAC' | 'LIGHTING' | 'CONSOLIDATION' | 'EQUIPMENT' | 'NO_ACTION';
  recommendation: string;
  reason: string;
  floor_id: string;
  zone_id?: string;
  zone_name?: string;
  current_power_kw: number;
  recommended_power_kw: number;
  estimated_saving_kw: number;
  estimated_hourly_saving_kwh: number;
  estimated_monthly_saving_cost: number;
  status: 'active' | 'applied' | 'acknowledged' | 'dismissed';
  comfort_checks: {
    passed: boolean;
    temperature: number;
    comfort_range: string;
    is_critical_zone: boolean;
    operating_hours: string;
    message: string;
  };
  suggested_action?: {
    type: 'set_hvac_eco' | 'turn_off_lights' | 'schedule_inspection' | 'consolidate_zones';
    floor_id: string;
    zone_id?: string;
  };
  timestamp: string;
}

export interface BuildingUtilization {
  building_utilization_ratio: number; // 0.0 to 1.0 (occupied zones / total zones)
  total_zones: number;
  occupied_zones: number;
  vacant_zones: number;
  critical_zones_count: number;
  underutilized_floors: {
    floor_id: string;
    floor_name: string;
    utilization_ratio: number;
    occupied_count: number;
    total_count: number;
  }[];
  floor_utilizations: {
    floor_id: string;
    floor_name: string;
    utilization_ratio: number;
    occupied_count: number;
    total_count: number;
    total_power_kw: number;
  }[];
}

export interface DashboardSummary {
  timestamp: string;
  current_energy_kw: number;
  today_total_energy_kwh: number;
  predicted_next_hour_energy_kw: number;
  expected_energy_kw: number;
  building_utilization: BuildingUtilization;
  active_anomalies_count: number;
  total_potential_savings_kw: number;
  total_potential_hourly_savings_kwh: number;
  total_potential_monthly_savings_cost: number;
  active_wastages_count: number;
  comfort_alert_count: number;
  anomalies: AnomalyRecord[];
  wastages: WastageRecord[];
  recommendations: Recommendation[];
  subsystem_breakdown: {
    hvac_kw: number;
    lighting_kw: number;
    equipment_kw: number;
    base_kw: number;
  };
  active_scenario: string;
  tariff_rate_usd_per_kwh: number;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  badge: string;
  expectedOutcome: string;
}

export interface ConfigSettings {
  electricityTariff: number; // $ per kWh
  minComfortTemp: number; // °C
  maxComfortTemp: number; // °C
  workHoursStart: number; // 8 (8am)
  workHoursEnd: number; // 18 (6pm)
  anomalySensitivity: number; // 0.1 to 1.0
}
