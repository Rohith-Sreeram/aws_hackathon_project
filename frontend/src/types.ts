export type ZoneType =
  | 'office'
  | 'meeting_room'
  | 'corridor'
  | 'bathroom'
  | 'pantry'
  | 'server_room'
  | 'equipment_room'
  | 'Office'
  | 'Meeting Hall';

export interface Zone {
  id: string;
  floorId: string;
  name: string;
  type: ZoneType | string;
  areaSqM: number;
  isCritical: boolean; // Server rooms, telecom, UPS etc.
  targetTemp: number; // e.g. 22°C
  minComfortTemp: number; // e.g. 20°C
  maxComfortTemp: number; // e.g. 25.5°C
  minVentilationCfm?: number;
  // Current real-time state
  currentPresence?: 0 | 1;
  currentTemp?: number;
  currentHumidity?: number;
  currentHvacPower?: number; // kW
  currentLightingPower?: number; // kW
  currentEquipmentPower?: number; // kW
  totalPower?: number; // kW
  hvacMode?: 'normal' | 'energy_saving' | 'boost' | 'off' | string;
  lightingMode?: 'on' | 'dimmed' | 'off' | 'auto' | string;
  fanMode?: 'on' | 'off' | string;
  lastOccupiedAt?: string;
  // ML Feature representation
  Occupancy?: number;
  Temperature?: number;
  Humidity?: number;
  Weekend?: 'Yes' | 'No' | string;
  'Day/Night'?: 'Day' | 'Night' | string;
  'HVAC Status'?: 'ON' | 'OFF' | string;
  'Fan Status'?: 'ON' | 'OFF' | string;
  predicted_energy_kw?: number;
  actual_energy_kw?: number;
  difference_kw?: number;
  energy_status?: 'Energy Usage Increasing' | 'Energy Efficient' | 'Normal' | string;
  status_badge_color?: string;
  suggested_action?: string;
  shap_explanation?: ShapExplanation;
  top_driver?: ShapDriver;
}

export interface FloorAction {
  zoneId: string;
  zoneName: string;
  zoneType: string;
  action: string;
  reason: string;
  saving_kw: number;
  saving_cost_monthly?: number;
}

export interface Floor {
  id: string;
  name: string;
  level?: number;
  floorNumber?: number;
  zones: Zone[];
  totalAreaSqM?: number;
  areaSqM?: number;
  zones_count?: number;
  offices_count?: number;
  meeting_halls_count?: number;
  occupied_zones_count?: number;
  occupancy_rate_pct?: number;
  total_predicted_energy_kw?: number;
  total_actual_energy_kw?: number;
  expected_energy_kw?: number;
  difference_kw?: number;
  deviation_kw?: number;
  status?: 'Energy Consumption Increasing' | 'Eco Optimized' | 'Normal' | string;
  badge_color?: string;
  top_shap_driver?: ShapDriver;
  shap_feature_totals?: Record<string, number>;
  categories?: Record<string, any>;
  actions_to_take?: FloorAction[];
  wastages?: any[];
}

export interface Building {
  id: string;
  name: string;
  code?: string;
  address: string;
  totalFloors?: number;
  floors_count?: number;
  totalZones?: number;
  total_zones_count?: number;
  offices_per_floor?: number;
  meeting_halls_per_floor?: number;
  total_offices_count?: number;
  total_meeting_halls_count?: number;
  totalAreaSqM?: number;
  total_predicted_energy_kw?: number;
  expected_energy_kw?: number;
  savings_potential_kw?: number;
  monthly_savings_cost?: number;
  occupancy_rate_pct?: number;
  top_shap_driver?: ShapDriver;
  shap_aggregation?: Record<string, number>;
  floors: Floor[];
  wastages?: any[];
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
  floor_name?: string;
  floor_number?: number;
  zone_id: string;
  zone_name: string;
  anomaly_score?: number; // 0.00 to 1.00
  anomaly_status?: AnomalyStatus;
  severity?: AnomalySeverity;
  actual_energy?: number;
  expected_energy?: number;
  deviation_kw?: number;
  deviation_pct?: number;
  root_cause_hint?: string;
  is_resolved?: boolean;
  type?: string;
  title?: string;
  occupancy?: number;
  hvac_status?: string;
  lighting_status?: string;
  fan_status?: string;
  wasted_kw?: number;
  monthly_waste_cost?: number;
  top_driver?: ShapDriver;
}

export type WastageType =
  | 'hvac_wastage'
  | 'lighting_wastage'
  | 'low_utilization_high_energy'
  | 'equipment_abnormal_load'
  | 'empty_room_active_equipment';

export interface WastageRecord {
  id: string;
  type: WastageType | string;
  title: string;
  buildingId?: string;
  buildingName?: string;
  floorId?: string;
  floorName?: string;
  floorNumber?: number;
  floor_id?: string;
  zone_id?: string;
  zoneId?: string;
  zone_name?: string;
  zoneName?: string;
  vacancy_duration_min?: number;
  occupancy?: number;
  hvac_status?: string;
  lighting_status?: string;
  fan_status?: string;
  hvac_power_kw?: number;
  lighting_power_kw?: number;
  equipment_power_kw?: number;
  wasted_power_kw?: number;
  wasted_kw?: number;
  monthly_waste_cost?: number;
  top_driver?: ShapDriver;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  timestamp?: string;
}

export type RecommendationPriority = 'HIGH PRIORITY' | 'MEDIUM PRIORITY' | 'LOW PRIORITY';

export interface Recommendation {
  id: string;
  priority: RecommendationPriority;
  type: 'HVAC' | 'LIGHTING' | 'CONSOLIDATION' | 'EQUIPMENT' | 'NO_ACTION' | 'ENERGY_SAVING' | string;
  recommendation: string;
  reason: string;
  buildingId?: string;
  buildingName?: string;
  floorId?: string;
  floorName?: string;
  floorNumber?: number;
  floor_id?: string;
  zone_id?: string;
  zoneId?: string;
  zone_name?: string;
  zoneName?: string;
  current_power_kw: number;
  recommended_power_kw: number;
  estimated_saving_kw: number;
  estimated_hourly_saving_kwh?: number;
  estimated_monthly_saving_cost: number;
  status: 'active' | 'applied' | 'acknowledged' | 'dismissed';
  comfort_checks: {
    passed: boolean;
    temperature: number;
    comfort_range: string;
    message?: string;
  };
}

export interface FloorUtilizationSummary {
  floor_id: string;
  floor_name: string;
  total_zones: number;
  occupied_zones: number;
  utilization_rate: number; // 0 to 1.0 (e.g. 0.35 = 35%)
  total_power_kw: number;
  avg_power_per_occupied_zone: number;
  is_underutilized: boolean; // utilization < 0.25 and total_power > threshold
  recommendation?: string;
}

export interface BuildingUtilizationMetrics {
  timestamp: string;
  total_capacity_people: number;
  current_presence_count: number;
  overall_utilization_rate: number;
  total_building_power_kw: number;
  power_per_person_kw: number;
  floors: FloorUtilizationSummary[];
  underutilized_floors_count: number;
}

export interface DashboardSummary {
  timestamp: string;
  building_name?: string;
  building_code?: string;
  building?: Building;
  total_floors_count?: number;
  total_zones_count?: number;
  total_offices_count?: number;
  total_meeting_halls_count?: number;
  current_power_kw?: number;
  total_predicted_energy_kw?: number;
  expected_baseline_kw?: number;
  total_expected_energy_kw?: number;
  deviation_kw?: number;
  deviation_pct?: number;
  daily_energy_kwh?: number;
  estimated_monthly_cost_usd?: number;
  potential_monthly_savings_usd?: number;
  total_savings_potential_kw?: number;
  monthly_savings_cost?: number;
  occupancy_rate?: number;
  occupancy_rate_pct?: number;
  total_occupied_zones?: number;
  total_zones?: number;
  active_anomalies_count: number;
  active_wastages_count: number;
  pending_recommendations_count?: number;
  tariff_rate_usd_per_kwh: number;
  tariff_rate?: number;
  top_shap_driver?: ShapDriver;
  shap_aggregation?: Record<string, number>;
  floors?: Floor[];
  recommendations?: Recommendation[];
  config?: ConfigSettings;
  // Aliases
  company_name?: string;
  total_buildings_count?: number;
  company_total_predicted_energy_kw?: number;
  company_total_expected_energy_kw?: number;
  company_total_savings_potential_kw?: number;
  company_monthly_savings_cost?: number;
  company_occupancy_rate_pct?: number;
  company_top_shap_driver?: ShapDriver;
  company_shap_aggregation?: Record<string, number>;
  buildings?: any[];
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

export interface ShapDriver {
  feature: string;
  impact?: number;
  total_impact_kw?: number;
  current_value?: string;
  description: string;
}

export interface ShapExplanation {
  predicted_energy: number;
  base_value: number;
  shap_values: Record<string, number>;
  top_positive_driver: ShapDriver;
}

export type MultiBuildingZone = Zone;
export type MultiBuildingSummary = Floor;
export type CompanySummary = DashboardSummary;
