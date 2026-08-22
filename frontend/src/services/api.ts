import {
  DashboardSummary,
  SensorReading,
  EnergyPrediction,
  AnomalyRecord,
  Recommendation,
  ConfigSettings,
} from '../types.ts';

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch('/api/dashboard/summary');
  if (!res.ok) {
    throw new Error(`Failed to fetch summary: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchBuildingSummary(): Promise<DashboardSummary> {
  return fetchDashboardSummary();
}

export async function fetchCompanySummary(): Promise<DashboardSummary> {
  return fetchDashboardSummary();
}

export async function fetchDashboardHistory(): Promise<{
  history: any[];
  interval: string;
  total_points: number;
}> {
  const res = await fetch('/api/dashboard/history');
  if (!res.ok) {
    throw new Error(`Failed to fetch history: ${res.statusText}`);
  }
  return res.json();
}

export async function submitSensorData(readings: SensorReading | SensorReading[]): Promise<any> {
  const res = await fetch('/api/sensor-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(readings),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.errors ? data.errors.join('; ') : data.error || 'Failed to submit sensor data');
  }
  return data;
}

export async function predictEnergyApi(payload: {
  reading: Partial<SensorReading>;
  hourOfDay?: number;
  dayOfWeek?: number;
}): Promise<EnergyPrediction> {
  const res = await fetch('/api/predict/energy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Prediction failed');
  }
  return res.json();
}

export async function detectAnomalyApi(payload: {
  actual_energy: number;
  expected_energy: number;
  reading?: Partial<SensorReading>;
}): Promise<any> {
  const res = await fetch('/api/predict/anomaly', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Anomaly detection failed');
  }
  return res.json();
}

export async function analyzeFullBuildingApi(payload?: { building?: any; outdoor_temp?: number }): Promise<any> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Building analysis failed');
  }
  return res.json();
}

export async function fetchAnomaliesApi(): Promise<AnomalyRecord[]> {
  const res = await fetch('/api/anomalies');
  if (!res.ok) {
    throw new Error('Failed to fetch anomalies');
  }
  return res.json();
}

export async function fetchWastagesApi(): Promise<any[]> {
  const res = await fetch('/api/wastages');
  if (!res.ok) {
    throw new Error('Failed to fetch wastages');
  }
  return res.json();
}

export async function fetchRecommendationsApi(): Promise<Recommendation[]> {
  const res = await fetch('/api/recommendations');
  if (!res.ok) {
    throw new Error('Failed to fetch recommendations');
  }
  return res.json();
}

export async function applyRecommendationActionApi(recId: string, action: 'apply' | 'acknowledge' | 'dismiss'): Promise<any> {
  const res = await fetch(`/api/recommendations/${recId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to update recommendation');
  }
  return res.json();
}

export async function controlHvacApi(payload: { floor_id: string; zone_id: string; mode: 'normal' | 'energy_saving' | 'off' }): Promise<any> {
  const res = await fetch('/api/control/hvac', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'HVAC control failed');
  }
  return res.json();
}

export async function controlLightingApi(payload: { floor_id: string; zone_id: string; mode: 'on' | 'dimmed' | 'off' }): Promise<any> {
  const res = await fetch('/api/control/lighting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Lighting control failed');
  }
  return res.json();
}

export async function applyScenarioApi(scenarioId: string): Promise<any> {
  const res = await fetch('/api/scenarios/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to apply scenario');
  }
  return res.json();
}

export async function fetchScenariosApi(): Promise<any> {
  const res = await fetch('/api/scenarios');
  return res.json();
}

export async function updateSettingsApi(settings: Partial<ConfigSettings>): Promise<any> {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to update settings');
  }
  return res.json();
}

export async function fetchFloorDetails(floorId: string): Promise<any> {
  const res = await fetch(`/api/floor/${floorId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch floor details: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchBuildingDetails(buildingId: string): Promise<any> {
  const res = await fetch(`/api/building/${buildingId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch building details: ${res.statusText}`);
  }
  return res.json();
}

export async function predictShapApi(features: Record<string, any>): Promise<any> {
  const res = await fetch('/api/predict/shap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(features),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'SHAP Prediction failed');
  }
  return res.json();
}

export async function updateZoneMlControlApi(payload: {
  zone_id: string;
  hvac_status?: 'ON' | 'OFF';
  lighting_status?: 'ON' | 'OFF';
  fan_status?: 'ON' | 'OFF';
  occupancy?: number;
  temperature?: number;
  humidity?: number;
}): Promise<any> {
  const res = await fetch('/api/zone/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Zone control failed');
  }
  return res.json();
}

export async function fetchSimulationStatus(): Promise<{
  is_simulating: boolean;
  interval: number;
  tick_count: number;
  last_tick_time: string;
  outdoor_temp: number;
}> {
  const res = await fetch('/api/simulation/status');
  if (!res.ok) {
    throw new Error('Failed to fetch simulation status');
  }
  return res.json();
}

export async function toggleSimulationApi(isActive?: boolean, interval?: number): Promise<any> {
  const res = await fetch('/api/simulation/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: isActive, interval }),
  });
  if (!res.ok) {
    throw new Error('Failed to toggle simulation');
  }
  return res.json();
}

export async function triggerSimulationTickApi(): Promise<any> {
  const res = await fetch('/api/simulation/tick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error('Failed to trigger simulation tick');
  }
  return res.json();
}

export async function resetBuildingApi(): Promise<any> {
  const res = await fetch('/api/building/reset', {
    method: 'POST',
  });
  return res.json();
}

export async function resetPortfolioApi(): Promise<any> {
  return resetBuildingApi();
}
