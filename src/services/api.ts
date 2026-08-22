import {
  DashboardSummary,
  SensorReading,
  EnergyPrediction,
  AnomalyRecord,
  Recommendation,
  ConfigSettings,
} from '../types.ts';

/**
 * Returns the effective API Base URL in priority:
 * 1. Runtime override from localStorage (allows fixing URL directly from browser)
 * 2. Build-time environment variable VITE_API_URL
 * 3. Default empty string (relative path for local Vite dev server / same-origin proxy)
 */
export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('BEMS_BACKEND_URL');
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  }
  const envUrl = (import.meta.env.VITE_API_URL as string) || '';
  return envUrl.trim().replace(/\/+$/, '');
}

export function setCustomApiUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (!url || !url.trim()) {
      localStorage.removeItem('BEMS_BACKEND_URL');
    } else {
      localStorage.setItem('BEMS_BACKEND_URL', url.trim().replace(/\/+$/, ''));
    }
  }
}

/**
 * Helper to perform fetch and safely parse JSON with meaningful error diagnostics
 */
async function safeFetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const base = getApiBase();
  const url = `${base}${endpoint}`;

  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (err: any) {
    throw new Error(
      `Cannot connect to backend at ${url || window.location.origin}. Render free-tier may be waking up (wait ~30s), or check your backend URL.`
    );
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    if (text.includes('<!DOCTYPE html') || text.includes('<html')) {
      throw new Error(
        `Backend returned HTML instead of API data. Please configure your Render backend URL in Vercel settings (VITE_API_URL) or enter it in the connection bar above.`
      );
    }
    throw new Error(`Unexpected non-JSON response from server (HTTP ${res.status})`);
  }

  const data = await res.json();
  if (!res.ok) {
    const msg = data.errors ? data.errors.join('; ') : data.error || res.statusText || `Request failed with status ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  return safeFetchJson<DashboardSummary>('/api/dashboard/summary');
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
  return safeFetchJson<{ history: any[]; interval: string; total_points: number }>('/api/dashboard/history');
}

export async function submitSensorData(readings: SensorReading | SensorReading[]): Promise<any> {
  return safeFetchJson<any>('/api/sensor-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(readings),
  });
}

export async function predictEnergyApi(payload: {
  reading: Partial<SensorReading>;
  hourOfDay?: number;
  dayOfWeek?: number;
}): Promise<EnergyPrediction> {
  return safeFetchJson<EnergyPrediction>('/api/predict/energy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function detectAnomalyApi(payload: {
  actual_energy: number;
  expected_energy: number;
  reading?: Partial<SensorReading>;
}): Promise<any> {
  return safeFetchJson<any>('/api/predict/anomaly', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function analyzeFullBuildingApi(payload?: { building?: any; outdoor_temp?: number }): Promise<any> {
  return safeFetchJson<any>('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
}

export async function fetchAnomaliesApi(): Promise<AnomalyRecord[]> {
  return safeFetchJson<AnomalyRecord[]>('/api/anomalies');
}

export async function fetchWastagesApi(): Promise<any[]> {
  return safeFetchJson<any[]>('/api/wastages');
}

export async function fetchRecommendationsApi(): Promise<Recommendation[]> {
  return safeFetchJson<Recommendation[]>('/api/recommendations');
}

export async function applyRecommendationActionApi(recId: string, action: 'apply' | 'acknowledge' | 'dismiss'): Promise<any> {
  return safeFetchJson<any>(`/api/recommendations/${recId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
}

export async function controlHvacApi(payload: { floor_id: string; zone_id: string; mode: 'normal' | 'energy_saving' | 'off' }): Promise<any> {
  return safeFetchJson<any>('/api/control/hvac', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function controlLightingApi(payload: { floor_id: string; zone_id: string; mode: 'on' | 'dimmed' | 'off' }): Promise<any> {
  return safeFetchJson<any>('/api/control/lighting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function applyScenarioApi(scenarioId: string): Promise<any> {
  return safeFetchJson<any>('/api/scenarios/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId }),
  });
}

export async function fetchScenariosApi(): Promise<any> {
  return safeFetchJson<any>('/api/scenarios');
}

export async function updateSettingsApi(settings: Partial<ConfigSettings>): Promise<any> {
  return safeFetchJson<any>('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
}

export async function fetchFloorDetails(floorId: string): Promise<any> {
  return safeFetchJson<any>(`/api/floor/${floorId}`);
}

export async function fetchBuildingDetails(buildingId: string): Promise<any> {
  return safeFetchJson<any>(`/api/building/${buildingId}`);
}

export async function predictShapApi(features: Record<string, any>): Promise<any> {
  return safeFetchJson<any>('/api/predict/shap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(features),
  });
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
  return safeFetchJson<any>('/api/zone/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function fetchSimulationStatus(): Promise<{
  is_simulating: boolean;
  interval: number;
  tick_count: number;
  last_tick_time: string;
  outdoor_temp: number;
}> {
  return safeFetchJson<{
    is_simulating: boolean;
    interval: number;
    tick_count: number;
    last_tick_time: string;
    outdoor_temp: number;
  }>('/api/simulation/status');
}

export async function toggleSimulationApi(isActive?: boolean, interval?: number): Promise<any> {
  return safeFetchJson<any>('/api/simulation/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: isActive, interval }),
  });
}

export async function triggerSimulationTickApi(): Promise<any> {
  return safeFetchJson<any>('/api/simulation/tick', {
    method: 'POST',
  });
}

export async function resetBuildingApi(): Promise<any> {
  return safeFetchJson<any>('/api/building/reset', {
    method: 'POST',
  });
}

export async function resetPortfolioApi(): Promise<any> {
  return resetBuildingApi();
}
