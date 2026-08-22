import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  TrendingUp,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Info,
  ArrowRight,
  RotateCcw,
  Layers,
} from 'lucide-react';
import { DashboardSummary, Floor, Zone } from '../types.ts';
import { predictShapApi, updateZoneMlControlApi } from '../services/api.ts';

interface ShapExplainerTabProps {
  summary: DashboardSummary | null;
  selectedFloorId: string;
  onRefresh: () => void;
}

export const ShapExplainerTab: React.FC<ShapExplainerTabProps> = ({
  summary,
  selectedFloorId,
  onRefresh,
}) => {
  // Simulator State
  const [simZoneType, setSimZoneType] = useState<string>('Office');
  const [simOccupancy, setSimOccupancy] = useState<number>(60);
  const [simTemp, setSimTemp] = useState<number>(23.5);
  const [simHumidity, setSimHumidity] = useState<number>(48.0);
  const [simWeekend, setSimWeekend] = useState<'Yes' | 'No'>('No');
  const [simDayNight, setSimDayNight] = useState<'Day' | 'Night'>('Day');
  const [simHvac, setSimHvac] = useState<'ON' | 'OFF'>('ON');
  const [simFan, setSimFan] = useState<'ON' | 'OFF'>('ON');
  const [simLighting, setSimLighting] = useState<'ON' | 'OFF'>('ON');

  const [simResult, setSimResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simSuccessMsg, setSimSuccessMsg] = useState<string | null>(null);

  const bldg = summary?.building;
  const allFloors: Floor[] = bldg?.floors || summary?.floors || [];

  // Filter floors if a specific floor is selected
  const activeFloors: Floor[] =
    selectedFloorId === 'all'
      ? allFloors
      : allFloors.filter((f) => f.id === selectedFloorId || String(f.floorNumber) === selectedFloorId);

  const shapAgg = summary?.shap_aggregation || bldg?.shap_aggregation || {
    'HVAC Status': 24.5,
    'Day/Night': 15.2,
    'Lighting Status': 9.8,
    'Weekend': 8.4,
    'Fan Status': 4.6,
    'Humidity': 2.8,
    'Temperature': -6.4,
    'Occupancy': -18.2,
    'Zone Type': -22.5,
  };

  const topDriver = summary?.top_shap_driver || bldg?.top_shap_driver;

  const runSimulation = async () => {
    setIsSimulating(true);
    setSimSuccessMsg(null);
    try {
      const res = await predictShapApi({
        'Zone Type': simZoneType,
        Occupancy: simOccupancy,
        Temperature: simTemp,
        Humidity: simHumidity,
        Weekend: simWeekend,
        'Day/Night': simDayNight,
        'HVAC Status': simHvac,
        'Fan Status': simFan,
        'Lighting Status': simLighting,
      });
      setSimResult(res);
    } catch (err: any) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const applyToZone = async (zoneId: string) => {
    try {
      await updateZoneMlControlApi({
        zone_id: zoneId,
        hvac_status: simHvac,
        lighting_status: simLighting,
        fan_status: simFan,
        occupancy: simOccupancy,
        temperature: simTemp,
        humidity: simHumidity,
      });
      setSimSuccessMsg(`Successfully applied simulator parameters to ${zoneId}!`);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to update zone:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* SHAP Intelligence Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md border border-indigo-700/30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-400/30">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold tracking-tight">
                SHAP (SHapley Additive exPlanations) AI Energy Attribution
              </h2>
            </div>
            <p className="mt-2 text-sm text-indigo-100 max-w-3xl leading-relaxed">
              Using cooperative game theory, SHAP mathematically decomposes SVR energy predictions to explain
              <strong> which operational feature of each office and meeting hall is driving energy up or down</strong>.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs border border-white/10 px-4 py-3 rounded-xl text-right">
            <span className="text-xs text-indigo-200 block">SVR Neutral Baseline</span>
            <span className="text-2xl font-bold text-white">49.40 kWh</span>
            <span className="text-[11px] text-indigo-200 block">Base Model Value</span>
          </div>
        </div>

        {/* Top SHAP Driver Callout */}
        {topDriver && (
          <div className="mt-5 p-3.5 bg-indigo-500/20 border border-indigo-400/40 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3 text-xs">
              <span className="px-2 py-0.5 bg-indigo-400 text-slate-950 font-bold rounded">
                #1 DRIVER
              </span>
              <span className="font-semibold text-white">
                {topDriver.description}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-200">
              +{topDriver.total_impact_kw?.toFixed(1) || 0} kWh Impact
            </span>
          </div>
        )}
      </div>

      {/* 2-Column: Feature Importance Aggregation & Interactive Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 Cols: Building Feature Impact Ranking */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Building Feature Impact Breakdown (SHAP Values)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Positive values (+kWh) increase energy consumption; negative values (−kWh) reduce consumption.
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
              4 Floors • 24 Zones
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {Object.entries(shapAgg)
              .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
              .map(([feat, val]) => {
                const isPositive = val >= 0;
                const maxAbs = Math.max(...Object.values(shapAgg).map((v) => Math.abs(v)), 1);
                const barWidth = Math.min(100, Math.round((Math.abs(val) / maxAbs) * 100));

                return (
                  <div key={feat} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-700 font-semibold">{feat}</span>
                      <span
                        className={`font-mono font-bold ${
                          isPositive ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {isPositive ? `+${val.toFixed(2)} kWh (Increased)` : `${val.toFixed(2)} kWh (Reduced)`}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${barWidth}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          isPositive ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-start space-x-2">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <span>
              <strong>Insight:</strong> Turning off HVAC in vacant rooms eliminates the largest positive SHAP contributor (+{shapAgg['HVAC Status']?.toFixed(1) || '24.5'} kWh) while maintaining occupant thermal comfort.
            </span>
          </div>
        </div>

        {/* Right 6 Cols: Interactive What-If SVR Simulator */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span>Interactive What-If SVR Simulator</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Adjust zone parameters and simulate live SVR prediction + SHAP feature attributions.
              </p>
            </div>
            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer flex items-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSimulating ? 'Computing...' : 'Run Simulation'}</span>
            </button>
          </div>

          {/* Form Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {/* Zone Type */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Zone Type</label>
              <select
                value={simZoneType}
                onChange={(e) => setSimZoneType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
              >
                <option value="Office">Office (4 per floor)</option>
                <option value="Meeting Hall">Meeting Hall (2 per floor)</option>
              </select>
            </div>

            {/* Occupancy */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Occupancy ({simOccupancy} people)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={simOccupancy}
                onChange={(e) => setSimOccupancy(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Temperature ({simTemp.toFixed(1)}°C)
              </label>
              <input
                type="range"
                min="18"
                max="32"
                step="0.5"
                value={simTemp}
                onChange={(e) => setSimTemp(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            {/* Humidity */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Humidity ({simHumidity.toFixed(0)}%)
              </label>
              <input
                type="range"
                min="30"
                max="80"
                value={simHumidity}
                onChange={(e) => setSimHumidity(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            {/* Day / Night */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Time of Day</label>
              <select
                value={simDayNight}
                onChange={(e) => setSimDayNight(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
              >
                <option value="Day">Day (Business Hours)</option>
                <option value="Night">Night (After Hours)</option>
              </select>
            </div>

            {/* Weekend */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Day Type</label>
              <select
                value={simWeekend}
                onChange={(e) => setSimWeekend(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
              >
                <option value="No">Weekday</option>
                <option value="Yes">Weekend</option>
              </select>
            </div>
          </div>

          {/* Toggle Equipment Controls */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setSimHvac(simHvac === 'ON' ? 'OFF' : 'ON')}
              className={`p-2 rounded-lg text-xs font-bold transition flex items-center justify-between cursor-pointer border ${
                simHvac === 'ON'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}
            >
              <span>HVAC</span>
              <span>{simHvac}</span>
            </button>

            <button
              onClick={() => setSimLighting(simLighting === 'ON' ? 'OFF' : 'ON')}
              className={`p-2 rounded-lg text-xs font-bold transition flex items-center justify-between cursor-pointer border ${
                simLighting === 'ON'
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}
            >
              <span>Lighting</span>
              <span>{simLighting}</span>
            </button>

            <button
              onClick={() => setSimFan(simFan === 'ON' ? 'OFF' : 'ON')}
              className={`p-2 rounded-lg text-xs font-bold transition flex items-center justify-between cursor-pointer border ${
                simFan === 'ON'
                  ? 'bg-sky-50 border-sky-300 text-sky-800'
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}
            >
              <span>Fan</span>
              <span>{simFan}</span>
            </button>
          </div>

          {/* Simulation Output Card */}
          {simResult && (
            <div className="mt-4 p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-indigo-900 uppercase">
                    Simulated SVR Prediction
                  </span>
                  <div className="text-2xl font-extrabold text-indigo-950">
                    {simResult.predicted_energy_kwh.toFixed(2)} kWh
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-600 block">Baseline: 49.4 kWh</span>
                  <span className="text-xs font-bold text-indigo-700">
                    {simResult.predicted_energy_kwh > 49.4
                      ? `+${(simResult.predicted_energy_kwh - 49.4).toFixed(2)} kWh above baseline`
                      : `${(simResult.predicted_energy_kwh - 49.4).toFixed(2)} kWh below baseline`}
                  </span>
                </div>
              </div>

              {simResult.top_positive_driver && (
                <div className="text-xs bg-white p-2.5 rounded-lg border border-indigo-100 text-slate-700">
                  <strong>Top SHAP Driver:</strong> {simResult.top_positive_driver.description}
                </div>
              )}
            </div>
          )}

          {simSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
              {simSuccessMsg}
            </div>
          )}
        </div>
      </div>

      {/* 3. Zone-by-Zone SHAP Breakdown across 4 Floors (24 Zones Total) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>Zone-Level SHAP Attributions (4 Floors • 24 Zones Total)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Every office and meeting hall has an individual SVR energy prediction decomposed by SHAP.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {activeFloors.map((floor) => {
            const zones = floor.zones || [];
            return (
              <div key={floor.id} className="space-y-3">
                <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-xs font-bold">
                      Floor {floor.floorNumber || floor.id.replace('floor-', '')}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{floor.name}</h4>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">
                    SVR Total: {(floor.total_predicted_energy_kw || 0).toFixed(1)} kWh • 6 Zones (4 Offices, 2 Meeting Halls)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {zones.map((zone) => {
                    const shap = zone.shap_explanation;
                    const predKw = zone.predicted_energy_kw || zone.totalPower || 45.0;
                    const isWaste = (zone.Occupancy || zone.currentPresence || 0) === 0 && (zone['HVAC Status'] === 'ON' || zone['Lighting Status'] === 'ON');

                    return (
                      <div
                        key={zone.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                          isWaste
                            ? 'bg-rose-50/50 border-rose-200'
                            : 'bg-white border-slate-200 hover:border-indigo-300 shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 text-[10px] font-bold rounded">
                              {zone.type}
                            </span>
                            <span className="font-extrabold text-sm text-slate-900 font-mono">
                              {predKw.toFixed(1)} kWh
                            </span>
                          </div>

                          <h5 className="font-bold text-slate-900 text-xs mb-2 truncate" title={zone.name}>
                            {zone.name}
                          </h5>

                          <div className="grid grid-cols-3 gap-1.5 text-[11px] py-2 border-y border-slate-100 text-slate-600 mb-3">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Occupancy</span>
                              <strong className="text-slate-900 font-semibold">
                                {zone.Occupancy ?? zone.currentPresence ?? 0}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Temp</span>
                              <strong className="text-slate-900 font-semibold">
                                {(zone.Temperature ?? zone.currentTemp ?? 22).toFixed(1)}°C
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">HVAC/Light</span>
                              <strong className="text-slate-900 font-semibold">
                                {zone['HVAC Status'] ?? 'ON'}/{zone['Lighting Status'] ?? 'ON'}
                              </strong>
                            </div>
                          </div>

                          {/* SHAP Explanation */}
                          {shap?.top_positive_driver && (
                            <div className="p-2 bg-indigo-50/60 rounded-lg text-[11px] text-indigo-900 space-y-1">
                              <div className="flex items-center justify-between font-semibold">
                                <span className="flex items-center space-x-1">
                                  <Sparkles className="w-3 h-3 text-indigo-600" />
                                  <span>Top Driver:</span>
                                </span>
                                <span className="font-mono">
                                  +{shap.top_positive_driver.impact?.toFixed(1) || 0} kWh
                                </span>
                              </div>
                              <p className="text-[10px] text-indigo-700">
                                {shap.top_positive_driver.description}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className={`text-[10px] font-bold ${isWaste ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {isWaste ? '⚠️ Vacant with Active Load' : '✓ Normal Operation'}
                          </span>
                          <button
                            onClick={() => applyToZone(zone.id)}
                            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                          >
                            Apply Sim
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
