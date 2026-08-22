import React, { useState } from 'react';
import {
  Building2,
  Users,
  AlertCircle,
  Thermometer,
  Zap,
  Lightbulb,
  Fan,
  Sliders,
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
  PowerOff,
  ChevronDown,
  ChevronRight,
  BarChart2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { DashboardSummary, Zone, Floor } from '../types.ts';

interface UtilizationTabProps {
  summary: DashboardSummary | null;
  onControlHvac: (floorId: string, zoneId: string, mode: 'energy_saving' | 'normal' | 'off') => Promise<void>;
  onControlLighting: (floorId: string, zoneId: string, mode: 'off' | 'dimmed' | 'on') => Promise<void>;
}

/* Status badge colors */
const statusBadge = (status?: string) => {
  if (!status) return 'bg-cyan-50 text-cyan-700 border-cyan-200';
  if (status.includes('Increasing')) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (status.includes('Efficient') || status.includes('Eco')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-cyan-50 text-cyan-700 border-cyan-200';
};

/* Diff color */
const diffColor = (diff: number) =>
  diff > 3 ? 'text-rose-600 font-bold' : diff < -3 ? 'text-emerald-600 font-bold' : 'text-slate-700 font-semibold';

/* Diff icon */
const DiffIcon = ({ diff }: { diff: number }) =>
  diff > 3 ? (
    <TrendingUp className="w-3 h-3 text-rose-500 inline mr-0.5" />
  ) : diff < -3 ? (
    <TrendingDown className="w-3 h-3 text-emerald-500 inline mr-0.5" />
  ) : (
    <Minus className="w-3 h-3 text-slate-400 inline mr-0.5" />
  );

export const UtilizationTab: React.FC<UtilizationTabProps> = ({
  summary,
  onControlHvac,
  onControlLighting,
}) => {
  const [selectedFloorId, setSelectedFloorId] = useState<string>('floor-1');
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    Office: true,
    'Meeting Hall': true,
  });
  const [actionLoading, setActionLoading] = useState(false);

  const bldg = summary?.building;
  const floors: Floor[] = bldg?.floors || summary?.floors || [];

  if (!summary || floors.length === 0) return null;

  const currentFloor = floors.find((f) => f.id === selectedFloorId) || floors[0];
  const floorActions = currentFloor.actions_to_take || [];

  const zones = currentFloor.zones || [];
  const officeZones = zones.filter((z) => (z.type === 'Office' || z['Zone Type'] === 'Office'));
  const hallZones = zones.filter((z) => (z.type === 'Meeting Hall' || z['Zone Type'] === 'Meeting Hall'));

  const toggleCategory = (cat: string) =>
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));

  const handleHvacAction = async (mode: 'energy_saving' | 'normal' | 'off') => {
    if (!selectedZone) return;
    setActionLoading(true);
    try { await onControlHvac(selectedFloorId, selectedZone.id, mode); }
    finally { setActionLoading(false); }
  };

  const handleLightingAction = async (mode: 'off' | 'dimmed' | 'on') => {
    if (!selectedZone) return;
    setActionLoading(true);
    try { await onControlLighting(selectedFloorId, selectedZone.id, mode); }
    finally { setActionLoading(false); }
  };

  const totalZones = 24;
  const occupiedZones = floors.reduce(
    (acc, f) => acc + (f.zones?.filter((z) => (z.Occupancy ?? z.currentPresence ?? 0) > 0).length || 0),
    0
  );

  /* Render one zone instance row in the hierarchy */
  const renderZoneRow = (zone: Zone, idx: number, floorId: string) => {
    const occ = zone.Occupancy ?? zone.currentPresence ?? 0;
    const isOccupied = occ > 0;
    const hvacOn = (zone['HVAC Status'] ?? 'ON') === 'ON';
    const lightOn = (zone['Lighting Status'] ?? 'ON') === 'ON';
    const fanOn = (zone['Fan Status'] ?? 'ON') === 'ON';
    const predKw = zone.predicted_energy_kw ?? zone.totalPower ?? 45.0;
    const actualKw = (zone as any).actual_energy_kw ?? predKw;
    const diff = (zone as any).difference_kw ?? (actualKw - predKw);
    const energyStatus = (zone as any).energy_status ?? (diff > 3.5 ? 'Energy Usage Increasing' : 'Normal');
    const topDriver = (zone as any).top_driver ?? zone.shap_explanation?.top_positive_driver;
    const suggestedAction = (zone as any).suggested_action;
    const temp = zone.Temperature ?? zone.currentTemp ?? 22.5;
    const isSelected = selectedZone?.id === zone.id;
    const hasWastage = !isOccupied && (hvacOn || lightOn);

    return (
      <div
        key={zone.id}
        onClick={() => setSelectedZone(isSelected ? null : zone)}
        className={`border rounded-xl p-3.5 cursor-pointer transition-all text-xs ${
          isSelected
            ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-400/30 shadow-xs'
            : hasWastage
            ? 'border-rose-200 bg-rose-50/40 hover:border-rose-300'
            : energyStatus.includes('Increasing')
            ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300'
            : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
        }`}
      >
        {/* Row Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${isOccupied ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <div>
              <span className="font-bold text-slate-900">{zone.name}</span>
              <span className="ml-1.5 text-[10px] text-slate-400 uppercase">{zone.type}</span>
            </div>
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${statusBadge(energyStatus)}`}>
            {energyStatus}
          </span>
        </div>

        {/* E_pred vs E_actual vs Diff */}
        <div className="grid grid-cols-3 gap-2 mb-2 text-center bg-slate-50 rounded-lg py-2 border border-slate-100">
          <div>
            <span className="text-[10px] text-slate-500 block">E_pred</span>
            <span className="font-bold text-slate-800">{predKw.toFixed(1)}</span>
            <span className="text-[9px] text-slate-400 block">kWh</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">E_actual</span>
            <span className="font-bold text-slate-800">{actualKw.toFixed(1)}</span>
            <span className="text-[9px] text-slate-400 block">kWh/hr</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Δ Diff</span>
            <span className={diffColor(diff)}>
              <DiffIcon diff={diff} />{diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
            </span>
            <span className="text-[9px] text-slate-400 block">kWh</span>
          </div>
        </div>

        {/* Sensor Row */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
          <span>Occ: <strong className="text-slate-800">{occ}</strong></span>
          <span>Temp: <strong className="text-slate-800">{temp.toFixed(1)}°C</strong></span>
          <span>HVAC: <strong className={hvacOn ? 'text-blue-700' : 'text-slate-400'}>{hvacOn ? 'ON' : 'OFF'}</strong></span>
          <span>Light: <strong className={lightOn ? 'text-amber-700' : 'text-slate-400'}>{lightOn ? 'ON' : 'OFF'}</strong></span>
        </div>

        {/* SHAP Top Driver (for increasing zones) */}
        {energyStatus.includes('Increasing') && topDriver && (
          <div className="mt-1.5 px-2 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-[10px] text-indigo-800">
            <span className="font-bold">SHAP Cause:</span> {topDriver.description || `${topDriver.feature} adds +${topDriver.impact?.toFixed(1)} kWh`}
          </div>
        )}

        {/* Suggested Action */}
        {suggestedAction && (
          <div className="mt-1.5 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-900">
            <PowerOff className="w-3 h-3 inline mr-1 text-amber-600" />
            <span className="font-semibold">Action:</span> {suggestedAction}
          </div>
        )}
      </div>
    );
  };

  /* Category section */
  const renderCategorySection = (catLabel: string, catZones: Zone[], floorId: string) => {
    const catActual = catZones.reduce((a, z) => a + ((z as any).actual_energy_kw ?? z.predicted_energy_kw ?? 45), 0);
    const catPred = catZones.reduce((a, z) => a + (z.predicted_energy_kw ?? 45), 0);
    const catDiff = catActual - catPred;
    const catIncreasing = catDiff > (3.5 * catZones.length * 0.5);
    const isOpen = expandedCategories[catLabel] ?? true;

    return (
      <div key={catLabel} className="mb-3">
        <button
          onClick={() => toggleCategory(catLabel)}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
            <span>{catLabel} ({catZones.length} instances)</span>
            {catIncreasing && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                Energy Usage Increasing
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <span className="text-slate-500">Pred: <strong className="text-slate-800">{catPred.toFixed(1)} kWh</strong></span>
            <span className="text-slate-500">Actual: <strong className="text-slate-800">{catActual.toFixed(1)} kWh</strong></span>
            <span className={diffColor(catDiff)}>
              Δ {catDiff >= 0 ? '+' : ''}{catDiff.toFixed(1)} kWh
            </span>
          </div>
        </button>

        {isOpen && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-2">
            {catZones.map((z, i) => renderZoneRow(z, i, floorId))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Building Occupancy</span>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{Math.round((occupiedZones / totalZones) * 100)}%</span>
            <span className="text-xs text-slate-500">{occupiedZones}/{totalZones} zones</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Floor Predicted</span>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{(currentFloor.total_predicted_energy_kw || 0).toFixed(1)}</span>
            <span className="text-xs text-slate-500">kWh</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">1-Hr Actual</span>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-amber-700">
              {(currentFloor.total_actual_energy_kw || currentFloor.total_predicted_energy_kw || 0).toFixed(1)}
            </span>
            <span className="text-xs text-slate-500">kWh/hr</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Δ Floor Difference</span>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className={`text-2xl ${diffColor(currentFloor.difference_kw ?? 0)}`}>
              {(currentFloor.difference_kw ?? 0) >= 0 ? '+' : ''}
              {(currentFloor.difference_kw ?? 0).toFixed(1)}
            </span>
            <span className="text-xs text-slate-500">kWh</span>
          </div>
          <div className={`mt-1 text-[10px] font-bold ${statusBadge(currentFloor.status)} inline-block px-1.5 py-0.5 rounded border`}>
            {currentFloor.status || 'Normal'}
          </div>
        </div>
      </div>

      {/* Main Layout: Hierarchy + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Floor selector + Zone Hierarchy (Floor → Category → Instance) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <Layers className="w-4 h-4 mr-1.5 text-emerald-600" />
                Floor → Category → Zone Instance Hierarchy
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                E_pred vs E_actual(1hr). SHAP identifies cause of increase. Actions per instance.
              </p>
            </div>
            {/* Floor Tabs */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {floors.map((floor) => {
                const isIncrease = floor.status?.includes('Increasing');
                return (
                  <button
                    key={floor.id}
                    onClick={() => { setSelectedFloorId(floor.id); setSelectedZone(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                      selectedFloorId === floor.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Floor {floor.floorNumber || floor.id.replace('floor-', '')}</span>
                    {isIncrease && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Floor Status Summary Row */}
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-semibold text-slate-600">
              {currentFloor.name} — Predicted: <strong>{(currentFloor.total_predicted_energy_kw || 0).toFixed(1)} kWh</strong>
              {' | '}Actual: <strong>{(currentFloor.total_actual_energy_kw || currentFloor.total_predicted_energy_kw || 0).toFixed(1)} kWh/hr</strong>
              {' | '}Δ: <strong className={diffColor(currentFloor.difference_kw ?? 0)}>
                {(currentFloor.difference_kw ?? 0) >= 0 ? '+' : ''}
                {(currentFloor.difference_kw ?? 0).toFixed(1)} kWh
              </strong>
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge(currentFloor.status)}`}>
              {currentFloor.status || 'Normal'}
            </span>
          </div>

          {/* Offices category */}
          {renderCategorySection('Office', officeZones, currentFloor.id)}

          {/* Meeting Halls category */}
          {renderCategorySection('Meeting Hall', hallZones, currentFloor.id)}

          {/* Floor-Level Actions to Minimize Energy */}
          {floorActions.length > 0 && (
            <div className="mt-2 border border-amber-200 bg-amber-50 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <PowerOff className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Floor-Level Actions to Minimize Energy Consumption
                </h4>
              </div>
              <div className="space-y-2">
                {floorActions.map((act: any, i: number) => (
                  <div key={i} className="flex items-start justify-between bg-white/70 border border-amber-200/60 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-700">{act.zoneName} ({act.zoneType})</span>
                      <p className="text-[11px] text-amber-900 mt-0.5">{act.action}</p>
                      <p className="text-[10px] text-slate-500">{act.reason}</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 shrink-0 ml-2">-{act.saving_kw?.toFixed(1)} kW</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Zone Inspector & Controls */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-0.5 flex items-center">
              <Sliders className="w-4 h-4 mr-1.5 text-emerald-600" />
              Zone Inspector & Controls
            </h3>
            <p className="text-[11px] text-slate-500">
              {selectedZone ? `Configuring: ${selectedZone.name}` : 'Click any zone instance to inspect'}
            </p>
          </div>

          {selectedZone ? (
            <div className="space-y-4">
              {/* Energy Comparison */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Zone Type:</span>
                  <strong className="text-slate-900">{selectedZone.type}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Occupancy:</span>
                  <strong>{selectedZone.Occupancy ?? 0} people</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Temperature:</span>
                  <strong>{(selectedZone.Temperature ?? 22.5).toFixed(1)}°C</strong>
                </div>
                <div className="border-t border-slate-200 pt-2 mt-1" />
                <div className="flex justify-between items-center font-semibold">
                  <span className="text-slate-500">E_pred (SVR):</span>
                  <span className="text-slate-900">{(selectedZone.predicted_energy_kw ?? 45.0).toFixed(2)} kWh</span>
                </div>
                <div className="flex justify-between items-center font-semibold">
                  <span className="text-slate-500">E_actual (1hr):</span>
                  <span className="text-amber-700">{((selectedZone as any).actual_energy_kw ?? selectedZone.predicted_energy_kw ?? 45.0).toFixed(2)} kWh</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Δ Difference:</span>
                  <span className={diffColor((selectedZone as any).difference_kw ?? 0)}>
                    {((selectedZone as any).difference_kw ?? 0) >= 0 ? '+' : ''}
                    {((selectedZone as any).difference_kw ?? 0).toFixed(2)} kWh
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Status:</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${statusBadge((selectedZone as any).energy_status)}`}>
                    {(selectedZone as any).energy_status ?? 'Normal'}
                  </span>
                </div>
              </div>

              {/* SHAP Breakdown */}
              {selectedZone.shap_explanation && (
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-xs space-y-1.5">
                  <span className="font-bold text-indigo-900 block">SHAP Feature Attributions:</span>
                  {Object.entries(selectedZone.shap_explanation.shap_values || {})
                    .sort(([, a], [, b]) => Math.abs(b as number) - Math.abs(a as number))
                    .slice(0, 5)
                    .map(([feat, val]) => (
                      <div key={feat} className="flex items-center justify-between">
                        <span className="text-slate-600 truncate max-w-[120px]">{feat}:</span>
                        <div className="flex items-center space-x-1.5">
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${(val as number) > 0 ? 'bg-rose-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.min(100, Math.abs((val as number) / 15) * 100)}%` }}
                            />
                          </div>
                          <span className={`font-bold text-[10px] w-12 text-right ${(val as number) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {(val as number) >= 0 ? '+' : ''}{(val as number).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Suggested Action */}
              {(selectedZone as any).suggested_action && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
                  <div className="flex items-start space-x-2">
                    <PowerOff className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-amber-900 font-medium">{(selectedZone as any).suggested_action}</p>
                  </div>
                </div>
              )}

              {/* HVAC Controls */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">HVAC Controls:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleHvacAction('energy_saving')}
                    disabled={actionLoading}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Energy Saving
                  </button>
                  <button
                    onClick={() => handleHvacAction('normal')}
                    disabled={actionLoading}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Normal Mode
                  </button>
                </div>
              </div>

              {/* Lighting Controls */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Lighting Controls:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleLightingAction('off')}
                    disabled={actionLoading}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Turn Off Lights
                  </button>
                  <button
                    onClick={() => handleLightingAction('on')}
                    disabled={actionLoading}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Turn On Lights
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <div className="text-slate-400 text-xs space-y-1">
                <BarChart2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-500">Select any zone instance</p>
                <p>View SVR vs actual comparison, SHAP attribution breakdown & controls</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
