import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Building, SensorReading, ConfigSettings } from './src/types.ts';
import { INITIAL_BUILDING } from './server/buildingData.ts';
import {
  predictEnergyModel,
  detectAnomalyModel,
  analyzeBuildingState,
  DEFAULT_CONFIG,
} from './server/models.ts';
import {
  SCENARIOS,
  applyScenarioToBuilding,
  ScenarioId,
} from './server/scenarioEngine.ts';

// In-Memory Database & State
let currentBuilding: Building = JSON.parse(JSON.stringify(INITIAL_BUILDING));
let currentOutdoorTemp: number = 26.0;
let currentScenario: ScenarioId = 'empty_room_wastage'; // Start with interesting wastage scenario
let currentConfig: ConfigSettings = { ...DEFAULT_CONFIG };
let sensorReadingsHistory: SensorReading[] = [];

// Initialize starting scenario
const initialInit = applyScenarioToBuilding(currentScenario);
currentBuilding = initialInit.building;
currentOutdoorTemp = initialInit.outdoorTemp;

// Generate 24 hours of baseline 15-minute historical readings
function generateInitialHistory() {
  const history: any[] = [];
  const now = new Date();

  for (let i = 96; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 15 * 60 * 1000);
    const hour = time.getHours() + time.getMinutes() / 60;
    const isWorkingHours = hour >= 8 && hour <= 18;
    const diurnal = isWorkingHours ? 1.0 + 0.35 * Math.sin(((hour - 8) / 10) * Math.PI) : 0.42;

    // Expected baseline around 120 kW total for building
    const expected = 65 + 75 * diurnal;
    // Add realistic variation
    const noise = (Math.sin(i * 0.4) + Math.cos(i * 0.7)) * 4.5;
    const actual = Math.max(30, expected + noise + (i > 80 ? 8 : 0));
    const predicted = expected * (1.0 + (Math.sin(i * 0.2) * 0.04));

    history.push({
      timestamp: time.toISOString(),
      display_time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actual_energy: Number(actual.toFixed(1)),
      expected_energy: Number(expected.toFixed(1)),
      predicted_energy: Number(predicted.toFixed(1)),
      deviation_kw: Number((actual - expected).toFixed(1)),
      hvac_power: Number((actual * 0.52).toFixed(1)),
      lighting_power: Number((actual * 0.16).toFixed(1)),
      equipment_power: Number((actual * 0.24).toFixed(1)),
      occupancy_ratio: isWorkingHours ? Number((0.65 + 0.2 * Math.sin(hour)).toFixed(2)) : 0.12,
      temperature: Number((21.5 + 1.5 * Math.sin(hour / 4)).toFixed(1)),
      outdoor_temp: Number((18 + 10 * Math.sin((hour - 6) / 8)).toFixed(1)),
    });
  }
  return history;
}

let historyCache = generateInitialHistory();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // ==========================================
  // REST API ENDPOINTS
  // ==========================================

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 1. Model Energy Prediction API
  app.post('/api/predict/energy', (req, res) => {
    try {
      const { reading, hourOfDay, dayOfWeek } = req.body;
      if (!reading) {
        return res.status(400).json({ error: 'Sensor reading object is required' });
      }
      const hour = hourOfDay !== undefined ? Number(hourOfDay) : new Date().getHours();
      const day = dayOfWeek !== undefined ? Number(dayOfWeek) : new Date().getDay();
      const result = predictEnergyModel(reading, hour, day);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Energy prediction failed' });
    }
  });

  // 2. Model Anomaly Detection API
  app.post('/api/predict/anomaly', (req, res) => {
    try {
      const { actual_energy, expected_energy, reading, zone } = req.body;
      if (actual_energy === undefined || expected_energy === undefined) {
        return res.status(400).json({ error: 'actual_energy and expected_energy are required' });
      }
      const result = detectAnomalyModel(
        Number(actual_energy),
        Number(expected_energy),
        reading || {},
        zone,
        currentConfig
      );
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Anomaly detection failed' });
    }
  });

  // 3. Full Building Analysis API
  app.post('/api/analyze', (req, res) => {
    try {
      const bldg = req.body.building || currentBuilding;
      const outdoor = req.body.outdoor_temp ?? currentOutdoorTemp;
      const analysis = analyzeBuildingState(bldg, outdoor, currentConfig);

      return res.json({
        timestamp: new Date().toISOString(),
        predicted_energy: analysis.total_predicted_kw,
        expected_energy: analysis.total_expected_kw,
        actual_energy: analysis.total_actual_kw,
        utilization: analysis.building_utilization.building_utilization_ratio,
        anomaly_status: analysis.anomalies.length > 0 ? 'anomaly' : 'normal',
        anomaly_score: analysis.anomalies.length > 0 ? analysis.anomalies[0].anomaly_score : 0.12,
        anomalies: analysis.anomalies,
        wastages: analysis.wastages,
        recommendations: analysis.recommendations,
        building_utilization: analysis.building_utilization,
        subsystem_breakdown: analysis.subsystem_breakdown,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Analysis failed' });
    }
  });

  // 4. Dashboard Summary API
  app.get('/api/dashboard/summary', (req, res) => {
    try {
      const analysis = analyzeBuildingState(currentBuilding, currentOutdoorTemp, currentConfig);

      let totalSavingsKw = 0;
      for (const rec of analysis.recommendations) {
        if (rec.status === 'active') {
          totalSavingsKw += rec.estimated_saving_kw;
        }
      }

      const totalHourlySavingsKwh = totalSavingsKw;
      const totalMonthlySavingsCost = totalHourlySavingsKwh * 24 * 30 * currentConfig.electricityTariff;

      // Estimate today total energy based on last 24 hr average
      const todayTotalKwh = analysis.total_actual_kw * 14.5; // Estimated progressive daily integral

      return res.json({
        timestamp: new Date().toISOString(),
        current_energy_kw: analysis.total_actual_kw,
        today_total_energy_kwh: Number(todayTotalKwh.toFixed(1)),
        predicted_next_hour_energy_kw: analysis.total_predicted_kw,
        expected_energy_kw: analysis.total_expected_kw,
        building_utilization: analysis.building_utilization,
        active_anomalies_count: analysis.anomalies.filter((a) => !a.is_resolved).length,
        total_potential_savings_kw: Number(totalSavingsKw.toFixed(1)),
        total_potential_hourly_savings_kwh: Number(totalHourlySavingsKwh.toFixed(1)),
        total_potential_monthly_savings_cost: Number(totalMonthlySavingsCost.toFixed(2)),
        active_wastages_count: analysis.wastages.length,
        comfort_alert_count: analysis.recommendations.filter((r) => !r.comfort_checks.passed).length,
        anomalies: analysis.anomalies,
        wastages: analysis.wastages,
        recommendations: analysis.recommendations,
        subsystem_breakdown: analysis.subsystem_breakdown,
        building: currentBuilding,
        outdoor_temp: currentOutdoorTemp,
        active_scenario: currentScenario,
        tariff_rate_usd_per_kwh: currentConfig.electricityTariff,
        config: currentConfig,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch summary' });
    }
  });

  // 5. Dashboard History API (15-min intervals)
  app.get('/api/dashboard/history', (req, res) => {
    return res.json({
      history: historyCache,
      interval: '15m',
      total_points: historyCache.length,
    });
  });

  // 6. Sensor Ingestion API (Supports manual single reading or CSV batch)
  app.post('/api/sensor-data', (req, res) => {
    try {
      const data = req.body;
      const readings: SensorReading[] = Array.isArray(data) ? data : [data];

      const validationErrors: string[] = [];
      const validReadings: SensorReading[] = [];

      for (let i = 0; i < readings.length; i++) {
        const r = readings[i];
        const row = i + 1;

        if (!r.floor_id) validationErrors.push(`Row ${row}: Missing floor_id`);
        if (!r.zone_id) validationErrors.push(`Row ${row}: Missing zone_id`);
        if (r.temperature === undefined || r.temperature < -10 || r.temperature > 60) {
          validationErrors.push(`Row ${row}: Invalid temperature value (${r.temperature}°C)`);
        }
        if (r.humidity !== undefined && (r.humidity < 0 || r.humidity > 100)) {
          validationErrors.push(`Row ${row}: Humidity must be between 0% and 100%`);
        }
        if (r.presence !== 0 && r.presence !== 1) {
          validationErrors.push(`Row ${row}: Presence must be binary 0 or 1`);
        }
        if (r.hvac_power !== undefined && r.hvac_power < 0) {
          validationErrors.push(`Row ${row}: Negative HVAC power (${r.hvac_power} kW) is not allowed`);
        }
        if (r.lighting_power !== undefined && r.lighting_power < 0) {
          validationErrors.push(`Row ${row}: Negative lighting power (${r.lighting_power} kW) is not allowed`);
        }
        if (r.equipment_power !== undefined && r.equipment_power < 0) {
          validationErrors.push(`Row ${row}: Negative equipment power (${r.equipment_power} kW) is not allowed`);
        }

        if (validationErrors.length === 0) {
          validReadings.push({
            id: `reading-${Date.now()}-${i}`,
            timestamp: r.timestamp || new Date().toISOString(),
            floor_id: r.floor_id,
            zone_id: r.zone_id,
            zone_type: r.zone_type || 'office',
            temperature: Number(r.temperature),
            humidity: Number(r.humidity ?? 45),
            presence: (r.presence === 1 ? 1 : 0),
            hvac_power: Number(r.hvac_power ?? 0),
            lighting_power: Number(r.lighting_power ?? 0),
            equipment_power: Number(r.equipment_power ?? 0),
            energy_consumption:
              r.energy_consumption !== undefined
                ? Number(r.energy_consumption)
                : Number(((r.hvac_power ?? 0) + (r.lighting_power ?? 0) + (r.equipment_power ?? 0)).toFixed(2)),
          });
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          status: 'validation_error',
          errors: validationErrors,
          processed_count: 0,
        });
      }

      // Apply valid readings to in-memory building state
      for (const reading of validReadings) {
        sensorReadingsHistory.push(reading);
        for (const floor of currentBuilding.floors) {
          if (floor.id === reading.floor_id) {
            for (const zone of floor.zones) {
              if (zone.id === reading.zone_id) {
                zone.currentPresence = reading.presence;
                zone.currentTemp = reading.temperature;
                zone.currentHumidity = reading.humidity;
                zone.currentHvacPower = reading.hvac_power;
                zone.currentLightingPower = reading.lighting_power;
                zone.currentEquipmentPower = reading.equipment_power;
                zone.totalPower = reading.energy_consumption;
                if (reading.presence === 1) {
                  zone.lastOccupiedAt = reading.timestamp;
                }
              }
            }
          }
        }
      }

      // Re-run analysis
      const analysis = analyzeBuildingState(currentBuilding, currentOutdoorTemp, currentConfig);

      return res.json({
        status: 'success',
        processed_count: validReadings.length,
        message: `Successfully ingested ${validReadings.length} sensor reading(s).`,
        current_building_energy: analysis.total_actual_kw,
        recommendations_count: analysis.recommendations.length,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Sensor data ingestion failed' });
    }
  });

  // 7. Simulated Control Actions (HVAC)
  app.post('/api/control/hvac', (req, res) => {
    try {
      const { floor_id, zone_id, mode } = req.body;
      let updatedZonesCount = 0;

      for (const floor of currentBuilding.floors) {
        if (!floor_id || floor.id === floor_id) {
          for (const zone of floor.zones) {
            if (!zone_id || zone.id === zone_id) {
              if (!zone.isCritical || mode !== 'off') {
                zone.hvacMode = mode;
                if (mode === 'energy_saving') {
                  zone.currentHvacPower = Number((zone.currentHvacPower * 0.45).toFixed(2));
                  zone.currentTemp = Math.min(zone.maxComfortTemp, zone.currentTemp + 0.8);
                } else if (mode === 'off') {
                  zone.currentHvacPower = 0.2; // standby
                } else if (mode === 'normal') {
                  zone.currentHvacPower = zone.type === 'office' ? 9.5 : 5.0;
                }
                zone.totalPower = Number(
                  (zone.currentHvacPower + zone.currentLightingPower + zone.currentEquipmentPower).toFixed(2)
                );
                updatedZonesCount++;
              }
            }
          }
        }
      }

      return res.json({
        status: 'success',
        message: `HVAC mode set to '${mode}' for ${updatedZonesCount} zone(s).`,
        updated_zones: updatedZonesCount,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Control action failed' });
    }
  });

  // 8. Simulated Control Actions (Lighting)
  app.post('/api/control/lighting', (req, res) => {
    try {
      const { floor_id, zone_id, mode } = req.body;
      let updatedCount = 0;

      for (const floor of currentBuilding.floors) {
        if (!floor_id || floor.id === floor_id) {
          for (const zone of floor.zones) {
            if (!zone_id || zone.id === zone_id) {
              zone.lightingMode = mode;
              if (mode === 'off') {
                zone.currentLightingPower = 0.05;
              } else if (mode === 'dimmed') {
                zone.currentLightingPower = Number((zone.currentLightingPower * 0.4).toFixed(2));
              } else if (mode === 'on') {
                zone.currentLightingPower = zone.type === 'office' ? 2.5 : 1.2;
              }
              zone.totalPower = Number(
                (zone.currentHvacPower + zone.currentLightingPower + zone.currentEquipmentPower).toFixed(2)
              );
              updatedCount++;
            }
          }
        }
      }

      return res.json({
        status: 'success',
        message: `Lighting mode set to '${mode}' for ${updatedCount} zone(s).`,
        updated_zones: updatedCount,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Lighting control failed' });
    }
  });

  // 9. Recommendation Action (Apply / Acknowledge / Dismiss)
  app.post('/api/recommendations/:id/action', (req, res) => {
    try {
      const { id } = req.params;
      const { action } = req.body; // 'apply' | 'acknowledge' | 'dismiss'

      // If applying an HVAC recommendation, perform simulated HVAC adjustment
      if (action === 'apply' && id.includes('rec-hvac')) {
        const zoneId = id.replace('rec-hvac-', '');
        for (const floor of currentBuilding.floors) {
          for (const zone of floor.zones) {
            if (zone.id === zoneId) {
              zone.hvacMode = 'energy_saving';
              zone.currentHvacPower = 1.5;
              zone.totalPower = Number(
                (zone.currentHvacPower + zone.currentLightingPower + zone.currentEquipmentPower).toFixed(2)
              );
            }
          }
        }
      } else if (action === 'apply' && id.includes('rec-light')) {
        const zoneId = id.replace('rec-light-', '');
        for (const floor of currentBuilding.floors) {
          for (const zone of floor.zones) {
            if (zone.id === zoneId) {
              zone.lightingMode = 'off';
              zone.currentLightingPower = 0.05;
              zone.totalPower = Number(
                (zone.currentHvacPower + zone.currentLightingPower + zone.currentEquipmentPower).toFixed(2)
              );
            }
          }
        }
      }

      return res.json({
        status: 'success',
        recommendation_id: id,
        action,
        message: `Action '${action}' applied successfully.`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Action failed' });
    }
  });

  // 10. List Demonstration Scenarios
  app.get('/api/scenarios', (req, res) => {
    res.json({
      active_scenario: currentScenario,
      scenarios: Object.values(SCENARIOS),
    });
  });

  // 11. Apply Demonstration Scenario
  app.post('/api/scenarios/apply', (req, res) => {
    try {
      const { scenario_id } = req.body;
      if (!scenario_id || !SCENARIOS[scenario_id as ScenarioId]) {
        return res.status(400).json({ error: `Invalid scenario ID: ${scenario_id}` });
      }

      currentScenario = scenario_id as ScenarioId;
      const result = applyScenarioToBuilding(currentScenario);
      currentBuilding = result.building;
      currentOutdoorTemp = result.outdoorTemp;

      const analysis = analyzeBuildingState(currentBuilding, currentOutdoorTemp, currentConfig);

      return res.json({
        status: 'success',
        active_scenario: currentScenario,
        scenario_meta: SCENARIOS[currentScenario],
        outdoor_temp: currentOutdoorTemp,
        building_utilization: analysis.building_utilization,
        anomalies_count: analysis.anomalies.length,
        wastages_count: analysis.wastages.length,
        recommendations_count: analysis.recommendations.length,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to apply scenario' });
    }
  });

  // 12. Settings & Tariff Configuration API
  app.get('/api/settings', (req, res) => {
    res.json({ config: currentConfig });
  });

  app.post('/api/settings', (req, res) => {
    try {
      const { electricityTariff, minComfortTemp, maxComfortTemp, workHoursStart, workHoursEnd } = req.body;
      if (electricityTariff !== undefined) currentConfig.electricityTariff = Number(electricityTariff);
      if (minComfortTemp !== undefined) currentConfig.minComfortTemp = Number(minComfortTemp);
      if (maxComfortTemp !== undefined) currentConfig.maxComfortTemp = Number(maxComfortTemp);
      if (workHoursStart !== undefined) currentConfig.workHoursStart = Number(workHoursStart);
      if (workHoursEnd !== undefined) currentConfig.workHoursEnd = Number(workHoursEnd);

      return res.json({
        status: 'success',
        config: currentConfig,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to update settings' });
    }
  });

  // ==========================================
  // Vite Middleware / Static Asset Serving
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BEMS Server listening on port ${PORT} at http://0.0.0.0:${PORT}`);
  });
}

startServer();
