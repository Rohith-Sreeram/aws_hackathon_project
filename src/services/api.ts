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
    throw new Error(data.error || 'Analysis failed');
  }
  return res.json();
}

export async function controlHvacApi(params: {
  floor_id?: string;
  zone_id?: string;
  mode: 'energy_saving' | 'normal' | 'off';
}): Promise<any> {
  const res = await fetch('/api/control/hvac', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'HVAC control failed');
  }
  return res.json();
}

export async function controlLightingApi(params: {
  floor_id?: string;
  zone_id?: string;
  mode: 'off' | 'dimmed' | 'on';
}): Promise<any> {
  const res = await fetch('/api/control/lighting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Lighting control failed');
  }
  return res.json();
}

export async function applyRecommendationActionApi(id: string, action: 'apply' | 'acknowledge' | 'dismiss'): Promise<any> {
  const res = await fetch(`/api/recommendations/${id}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Action failed');
  }
  return res.json();
}

export async function applyScenarioApi(scenario_id: string): Promise<any> {
  const res = await fetch('/api/scenarios/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario_id }),
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
