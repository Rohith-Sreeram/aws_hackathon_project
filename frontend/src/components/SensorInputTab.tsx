import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Download,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Table,
} from 'lucide-react';
import { SensorReading, ZoneType } from '../types.ts';
import { submitSensorData } from '../services/api.ts';

interface SensorInputTabProps {
  onDataIngested: () => void;
}

export const SensorInputTab: React.FC<SensorInputTabProps> = ({ onDataIngested }) => {
  const [activeSubTab, setActiveSubTab] = useState<'csv' | 'manual' | 'scenarios'>('csv');

  // Manual Form State
  const [timestamp, setTimestamp] = useState<string>(new Date().toISOString().slice(0, 16));
  const [floorId, setFloorId] = useState<string>('floor-2');
  const [zoneId, setZoneId] = useState<string>('zone-203');
  const [zoneType, setZoneType] = useState<ZoneType>('meeting_room');
  const [temperature, setTemperature] = useState<number>(22.0);
  const [humidity, setHumidity] = useState<number>(45);
  const [presence, setPresence] = useState<0 | 1>(0);
  const [hvacPower, setHvacPower] = useState<number>(8.5);
  const [lightingPower, setLightingPower] = useState<number>(2.1);
  const [equipmentPower, setEquipmentPower] = useState<number>(1.5);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // CSV State
  const [csvText, setCsvText] = useState<string>('');
  const [parsedReadings, setParsedReadings] = useState<SensorReading[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  // Handle Manual Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    setSubmitSuccessMsg(null);

    // Client-side Validation (Section 3)
    const errors: string[] = [];
    if (temperature < -10 || temperature > 60) errors.push('Temperature must be between -10°C and 60°C.');
    if (humidity < 0 || humidity > 100) errors.push('Humidity must be between 0% and 100%.');
    if (presence !== 0 && presence !== 1) errors.push('Presence must be 0 (vacant) or 1 (occupied).');
    if (hvacPower < 0) errors.push('HVAC power cannot be negative.');
    if (lightingPower < 0) errors.push('Lighting power cannot be negative.');
    if (equipmentPower < 0) errors.push('Equipment power cannot be negative.');

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const reading: SensorReading = {
        timestamp: new Date(timestamp).toISOString(),
        floor_id: floorId,
        zone_id: zoneId,
        zone_type: zoneType,
        temperature: Number(temperature),
        humidity: Number(humidity),
        presence: Number(presence) as 0 | 1,
        hvac_power: Number(hvacPower),
        lighting_power: Number(lightingPower),
        equipment_power: Number(equipmentPower),
        energy_consumption: Number((hvacPower + lightingPower + equipmentPower).toFixed(2)),
      };

      await submitSensorData(reading);
      setSubmitSuccessMsg(`Successfully ingested sensor reading for zone ${zoneId}. Building state and AI models refreshed.`);
      onDataIngested();
    } catch (err: any) {
      setValidationErrors([err.message || 'Submission failed']);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sample CSV Templates
  const sampleValidCsv = `timestamp,floor_id,zone_id,zone_type,temperature,humidity,presence,hvac_power,lighting_power,equipment_power,energy_consumption
2026-08-22T08:00:00Z,floor-2,zone-201,office,22.4,48,1,10.5,2.6,8.2,21.3
2026-08-22T08:00:00Z,floor-2,zone-202,office,22.1,46,1,9.8,2.4,7.8,20.0
2026-08-22T08:00:00Z,floor-2,zone-203,meeting_room,21.5,44,0,8.2,2.0,1.4,11.6
2026-08-22T08:00:00Z,floor-4,zone-401,meeting_room,21.8,45,0,7.5,1.8,2.0,11.3
2026-08-22T08:00:00Z,floor-4,zone-405,server_room,19.2,40,0,28.0,0.5,42.0,70.5`;

  const handleParseCsv = (raw: string) => {
    setCsvText(raw);
    setCsvErrors([]);
    setSubmitSuccessMsg(null);

    const lines = raw.trim().split('\n');
    if (lines.length <= 1) {
      setParsedReadings([]);
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const readings: SensorReading[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = line.split(',').map((v) => v.trim());
      const row = i + 1;

      const obj: any = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx];
      });

      // Validation Checks
      const temp = parseFloat(obj.temperature);
      const hum = parseFloat(obj.humidity);
      const pres = parseInt(obj.presence);
      const hvac = parseFloat(obj.hvac_power);
      const light = parseFloat(obj.lighting_power);
      const equip = parseFloat(obj.equipment_power);

      if (!obj.floor_id) errors.push(`Row ${row}: Missing floor_id`);
      if (!obj.zone_id) errors.push(`Row ${row}: Missing zone_id`);
      if (isNaN(temp) || temp < -10 || temp > 60) errors.push(`Row ${row}: Invalid temperature (${obj.temperature})`);
      if (isNaN(pres) || (pres !== 0 && pres !== 1)) errors.push(`Row ${row}: Presence must be 0 or 1`);
      if (isNaN(hvac) || hvac < 0) errors.push(`Row ${row}: HVAC power must be non-negative`);
      if (isNaN(light) || light < 0) errors.push(`Row ${row}: Lighting power must be non-negative`);
      if (isNaN(equip) || equip < 0) errors.push(`Row ${row}: Equipment power must be non-negative`);

      if (errors.length === 0) {
        readings.push({
          timestamp: obj.timestamp || new Date().toISOString(),
          floor_id: obj.floor_id,
          zone_id: obj.zone_id,
          zone_type: obj.zone_type || 'office',
          temperature: temp,
          humidity: isNaN(hum) ? 45 : hum,
          presence: pres as 0 | 1,
          hvac_power: hvac,
          lighting_power: light,
          equipment_power: equip,
          energy_consumption: parseFloat(obj.energy_consumption) || (hvac + light + equip),
        });
      }
    }

    if (errors.length > 0) {
      setCsvErrors(errors);
    } else {
      setParsedReadings(readings);
    }
  };

  const handleUploadBulkCsv = async () => {
    if (parsedReadings.length === 0) return;
    setIsSubmitting(true);
    setValidationErrors([]);
    try {
      await submitSensorData(parsedReadings);
      setSubmitSuccessMsg(`Successfully ingested ${parsedReadings.length} sensor records from CSV into BEMS.`);
      onDataIngested();
    } catch (err: any) {
      setCsvErrors([err.message || 'Batch upload failed']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center">
            <SlidersHorizontal className="w-5 h-5 mr-2 text-emerald-700" />
            Sensor Telemetry Ingestion Suite (15-Min Intervals)
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Accepts electricity meters, indoor temperature/humidity, HVAC, lighting, presence, and access systems.
          </p>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveSubTab('csv')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'csv' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            CSV Bulk Ingest
          </button>
          <button
            onClick={() => setActiveSubTab('manual')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'manual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Manual 15m Form
          </button>
        </div>
      </div>

      {/* Alerts / Feedback */}
      {submitSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{submitSuccessMsg}</span>
        </div>
      )}

      {/* CSV Ingest View */}
      {activeSubTab === 'csv' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: CSV Editor & File Dropper */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <UploadCloud className="w-4 h-4 text-emerald-700" />
                <span>CSV Ingest & Validation</span>
              </div>
              <button
                onClick={() => handleParseCsv(sampleValidCsv)}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Load Sample Dataset</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Paste 15-minute sensor data in comma-separated values format. Required headers: <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">timestamp, floor_id, zone_id, zone_type, temperature, humidity, presence, hvac_power, lighting_power, equipment_power, energy_consumption</code>
            </p>

            <textarea
              id="textarea-csv-input"
              rows={8}
              value={csvText}
              onChange={(e) => handleParseCsv(e.target.value)}
              placeholder="Paste CSV rows here or click 'Load Sample Dataset' above..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder-slate-400 font-medium"
            />

            {/* Validation Errors Box (Section 3 requirement) */}
            {csvErrors.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg space-y-1">
                <div className="flex items-center space-x-1.5 text-rose-700 text-xs font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span>CSV Input Validation Errors ({csvErrors.length})</span>
                </div>
                <ul className="text-[11px] text-rose-600 list-disc list-inside space-y-0.5 max-h-28 overflow-y-auto font-medium">
                  {csvErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-medium">
                Parsed records: <strong className="text-slate-900">{parsedReadings.length}</strong>
              </span>
              <button
                id="btn-upload-bulk-csv"
                onClick={handleUploadBulkCsv}
                disabled={isSubmitting || parsedReadings.length === 0 || csvErrors.length > 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Ingesting...' : `Ingest ${parsedReadings.length} Readings to AI`}</span>
              </button>
            </div>
          </div>

          {/* Right: Parsed Preview Table */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Table className="w-4 h-4 text-sky-700" />
                <span>Sensor Readings Preview</span>
              </div>
              <span className="text-xs text-slate-500 font-mono font-medium">15m Telemetry</span>
            </div>

            {parsedReadings.length > 0 ? (
              <div className="overflow-x-auto max-h-[340px] overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200">
                      <th className="py-2 px-2 font-semibold">Zone</th>
                      <th className="py-2 px-2 font-semibold">Temp</th>
                      <th className="py-2 px-2 font-semibold">Pres</th>
                      <th className="py-2 px-2 font-semibold">HVAC</th>
                      <th className="py-2 px-2 font-semibold">Light</th>
                      <th className="py-2 px-2 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {parsedReadings.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/80">
                        <td className="py-2 px-2 font-mono font-semibold text-slate-900">{r.zone_id}</td>
                        <td className="py-2 px-2">{r.temperature}°C</td>
                        <td className="py-2 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${r.presence ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {r.presence ? '1 Occ' : '0 Vac'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-blue-700 font-semibold">{r.hvac_power} kW</td>
                        <td className="py-2 px-2 text-amber-700 font-semibold">{r.lighting_power} kW</td>
                        <td className="py-2 px-2 font-bold text-emerald-700">{r.energy_consumption} kW</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                No sensor records loaded. Paste CSV data on the left or click "Load Sample Dataset".
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual 15-Minute Form */}
      {activeSubTab === 'manual' && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs max-w-3xl mx-auto space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Manual 15-Minute Sensor Reading Entry</h3>
            <p className="text-xs text-slate-500 font-medium">Validate and ingest individual telemetry readings directly into the AI pipeline.</p>
          </div>

          {validationErrors.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg space-y-1">
              <div className="flex items-center space-x-1.5 text-rose-700 text-xs font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>Validation Failure</span>
              </div>
              <ul className="text-[11px] text-rose-600 list-disc list-inside space-y-0.5 font-medium">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Timestamp</label>
                <input
                  type="datetime-local"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Floor ID</label>
                <select
                  value={floorId}
                  onChange={(e) => setFloorId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                >
                  <option value="floor-1">Floor 1 - Reception & Hub</option>
                  <option value="floor-2">Floor 2 - Engineering</option>
                  <option value="floor-3">Floor 3 - Marketing & Sales</option>
                  <option value="floor-4">Floor 4 - Executive & Data Center</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Zone ID</label>
                <input
                  type="text"
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Zone Type</label>
                <select
                  value={zoneType}
                  onChange={(e) => setZoneType(e.target.value as ZoneType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                >
                  <option value="office">Office</option>
                  <option value="meeting_room">Meeting Room</option>
                  <option value="corridor">Corridor</option>
                  <option value="bathroom">Bathroom</option>
                  <option value="pantry">Pantry / Kitchen</option>
                  <option value="server_room">Server Room (Critical)</option>
                  <option value="equipment_room">Equipment Room (Critical)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  min="-10"
                  max="60"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Humidity (% RH)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={humidity}
                  onChange={(e) => setHumidity(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Presence Sensor</label>
                <select
                  value={presence}
                  onChange={(e) => setPresence(parseInt(e.target.value) as 0 | 1)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                >
                  <option value={0}>0 - Vacant (No Occupants)</option>
                  <option value={1}>1 - Occupied</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">HVAC Power (kW)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={hvacPower}
                  onChange={(e) => setHvacPower(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lighting Power (kW)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={lightingPower}
                  onChange={(e) => setLightingPower(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Equipment / Plug Power (kW)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={equipmentPower}
                  onChange={(e) => setEquipmentPower(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                  required
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Calculated Total Power:{' '}
                <strong className="text-emerald-700 font-mono">
                  {(hvacPower + lightingPower + equipmentPower).toFixed(2)} kW
                </strong>
              </span>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isSubmitting ? 'Ingesting...' : 'Ingest Reading & Update AI'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
