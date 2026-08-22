import React, { useState } from 'react';
import {
  Building2,
  Users,
  AlertCircle,
  Shield,
  Thermometer,
  Zap,
  Lightbulb,
  Fan,
  CheckCircle2,
  Sliders,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { DashboardSummary, Zone, Floor } from '../types.ts';

interface UtilizationTabProps {
  summary: DashboardSummary | null;
  onControlHvac: (floorId: string, zoneId: string, mode: 'energy_saving' | 'normal' | 'off') => Promise<void>;
  onControlLighting: (floorId: string, zoneId: string, mode: 'off' | 'dimmed' | 'on') => Promise<void>;
}

export const UtilizationTab: React.FC<UtilizationTabProps> = ({
  summary,
  onControlHvac,
  onControlLighting,
}) => {
  const [selectedFloorId, setSelectedFloorId] = useState<string>('floor-2');
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  if (!summary || !summary.building) return null;

  const currentFloor = summary.building.floors.find((f) => f.id === selectedFloorId) || summary.building.floors[0];

  const handleSelectZone = (zone: Zone) => {
    setSelectedZone(zone);
  };

  const handleHvacAction = async (mode: 'energy_saving' | 'normal' | 'off') => {
    if (!selectedZone) return;
    setActionLoading(true);
    try {
      await onControlHvac(selectedFloorId, selectedZone.id, mode);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLightingAction = async (mode: 'off' | 'dimmed' | 'on') => {
    if (!selectedZone) return;
    setActionLoading(true);
    try {
      await onControlLighting(selectedFloorId, selectedZone.id, mode);
    } finally {
      setActionLoading(false);
    }
  };

  const underutilized = summary.building_utilization.underutilized_floors;

  return (
    <div className="space-y-6">
      {/* Underutilized Floor Warning Banner (Section 5 requirement) */}
      {underutilized.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5 text-amber-900 space-y-2">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <h3 className="text-sm font-bold text-amber-900">
              Underutilized Floor Alert Detected
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-amber-800">
            {underutilized.map((u) => (
              <span key={u.floor_id} className="inline-block mr-3">
                <strong>{u.floor_name}</strong> is operating at only{' '}
                <span className="text-amber-900 font-bold">{(u.utilization_ratio * 100).toFixed(0)}% occupancy</span> ({u.occupied_count}/{u.total_count} zones occupied) with active baseline HVAC.
              </span>
            ))}
          </p>
          <div className="text-xs text-amber-800 font-semibold">
            Recommendation: Consider consolidating occupants to adjacent active floors to execute floor-wide setback savings.
          </div>
        </div>
      )}

      {/* Building & Floor Utilization KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Building Occupancy Ratio</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">
              {(summary.building_utilization.building_utilization_ratio * 100).toFixed(0)}%
            </span>
            <span className="text-xs font-semibold text-slate-500">occupied_zone_ratio</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {summary.building_utilization.occupied_zones} of {summary.building_utilization.total_zones} total zones
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Occupied Zones</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-700">{summary.building_utilization.occupied_zones}</span>
            <span className="text-xs font-semibold text-slate-500">Zones</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">presence = 1 (Occupied)</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vacant Zones</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-700">{summary.building_utilization.vacant_zones}</span>
            <span className="text-xs font-semibold text-slate-500">Zones</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">presence = 0 (Eligible for eco setbacks)</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Critical Protected Zones</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-sky-700">{summary.building_utilization.critical_zones_count}</span>
            <span className="text-xs font-semibold text-slate-500">Zones</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">Server & telecom rooms (24/7 locked)</div>
        </div>
      </div>

      {/* Interactive Floor Plan & Zone Matrix Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Floor Selector & Interactive Zone Grid */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <Layers className="w-4 h-4 mr-1.5 text-emerald-600" />
                Floor Plan & Zone Presence Matrix
              </h3>
              <p className="text-xs text-slate-500">Click any zone to inspect environmental telemetry and test simulated controls</p>
            </div>

            {/* Floor Tabs */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
              {summary.building.floors.map((floor) => (
                <button
                  key={floor.id}
                  onClick={() => {
                    setSelectedFloorId(floor.id);
                    setSelectedZone(null);
                  }}
                  className={`px-3 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                    selectedFloorId === floor.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Floor {floor.level}
                </button>
              ))}
            </div>
          </div>

          {/* Zone Grid Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-1">
            {currentFloor.zones.map((zone) => {
              const isOccupied = zone.currentPresence === 1;
              const isSelected = selectedZone?.id === zone.id;
              const hasWastage = !isOccupied && !zone.isCritical && (zone.currentHvacPower > 4 || zone.currentLightingPower > 1);

              return (
                <div
                  key={zone.id}
                  onClick={() => handleSelectZone(zone)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-2.5 ${
                    isSelected
                      ? 'bg-slate-50 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                      : hasWastage
                      ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 shadow-xs'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isOccupied ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'
                          }`}
                        ></span>
                        <span className="text-xs font-bold text-slate-900 truncate max-w-[130px]">{zone.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                        {zone.type.replace('_', ' ')} • {zone.areaSqM} m²
                      </span>
                    </div>

                    {zone.isCritical ? (
                      <span className="p-1 rounded-md bg-sky-50 text-sky-700 border border-sky-200" title="Critical Zone (Protected)">
                        <Shield className="w-3.5 h-3.5" />
                      </span>
                    ) : isOccupied ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Occupied
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        Vacant
                      </span>
                    )}
                  </div>

                  {/* Telemetry Row */}
                  <div className="grid grid-cols-3 gap-1.5 py-1 text-center bg-slate-50 rounded-lg p-1.5 border border-slate-200/80">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Temp</span>
                      <span className="text-xs font-bold text-slate-800">{zone.currentTemp.toFixed(1)}°C</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">HVAC</span>
                      <span className="text-xs font-bold text-blue-700">{zone.currentHvacPower.toFixed(1)} kW</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Total</span>
                      <span className="text-xs font-bold text-emerald-700">{zone.totalPower.toFixed(1)} kW</span>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">
                      HVAC: <strong className="text-slate-800 capitalize">{zone.hvacMode}</strong>
                    </span>
                    <span className="text-slate-500">
                      Light: <strong className="text-slate-800 capitalize">{zone.lightingMode}</strong>
                    </span>
                  </div>

                  {hasWastage && (
                    <div className="text-[10px] text-amber-800 font-semibold bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md text-center">
                      ⚠️ Potential Wastage Detected
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Selected Zone Inspector & Simulated Controls */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <Sliders className="w-4 h-4 mr-1.5 text-sky-600" />
                Zone Telemetry & Control
              </h3>
              {selectedZone && (
                <span className="text-xs font-mono text-slate-500 font-medium">{selectedZone.id}</span>
              )}
            </div>

            {selectedZone ? (
              <div className="space-y-4 pt-3">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-900">{selectedZone.name}</h4>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      Type: {selectedZone.type}
                    </span>
                    {selectedZone.isCritical && (
                      <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                        Critical Infrastructure
                      </span>
                    )}
                  </div>
                </div>

                {/* Sensor telemetry list */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-600 flex items-center font-medium">
                      <Thermometer className="w-3.5 h-3.5 mr-1.5 text-sky-600" /> Indoor Temperature:
                    </span>
                    <span className="font-bold text-slate-900">{selectedZone.currentTemp.toFixed(1)}°C</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-600 flex items-center font-medium">
                      <Users className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Presence Sensor:
                    </span>
                    <span className="font-bold text-slate-900">
                      {selectedZone.currentPresence === 1 ? '1 (Occupied)' : '0 (Vacant)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-600 flex items-center font-medium">
                      <Fan className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> HVAC Power Draw:
                    </span>
                    <span className="font-bold text-blue-700">{selectedZone.currentHvacPower.toFixed(2)} kW</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-600 flex items-center font-medium">
                      <Lightbulb className="w-3.5 h-3.5 mr-1.5 text-amber-600" /> Lighting Power Draw:
                    </span>
                    <span className="font-bold text-amber-700">{selectedZone.currentLightingPower.toFixed(2)} kW</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-600 flex items-center font-medium">
                      <Zap className="w-3.5 h-3.5 mr-1.5 text-purple-600" /> Equipment / Plug Draw:
                    </span>
                    <span className="font-bold text-purple-700">{selectedZone.currentEquipmentPower.toFixed(2)} kW</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-slate-800">
                    <span className="font-semibold text-emerald-950">Total Zone Power:</span>
                    <span className="font-bold text-emerald-800 text-sm">{selectedZone.totalPower.toFixed(2)} kW</span>
                  </div>
                </div>

                {/* Simulated Control Actions (Section 11 requirement) */}
                <div className="pt-2 space-y-3">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                    Simulated Control Actions
                  </span>

                  {/* HVAC Control */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-600">HVAC Operation Mode:</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => handleHvacAction('energy_saving')}
                        disabled={actionLoading}
                        className={`px-2 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                          selectedZone.hvacMode === 'energy_saving'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        Eco Mode
                      </button>
                      <button
                        onClick={() => handleHvacAction('normal')}
                        disabled={actionLoading}
                        className={`px-2 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                          selectedZone.hvacMode === 'normal'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        Normal
                      </button>
                      <button
                        onClick={() => handleHvacAction('off')}
                        disabled={actionLoading || selectedZone.isCritical}
                        className={`px-2 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer disabled:opacity-40 ${
                          selectedZone.hvacMode === 'off'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        Off
                      </button>
                    </div>
                  </div>

                  {/* Lighting Control */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-600">Lighting Mode:</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => handleLightingAction('off')}
                        disabled={actionLoading}
                        className={`px-2 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                          selectedZone.lightingMode === 'off'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        Lights Off
                      </button>
                      <button
                        onClick={() => handleLightingAction('dimmed')}
                        disabled={actionLoading}
                        className={`px-2 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                          selectedZone.lightingMode === 'dimmed'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        Dimmed
                      </button>
                      <button
                        onClick={() => handleLightingAction('on')}
                        disabled={actionLoading}
                        className={`px-2 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                          selectedZone.lightingMode === 'on'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        Full On
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                <Building2 className="w-8 h-8 text-slate-300" />
                <p className="text-xs text-slate-500">Select any zone on the floor plan to view sensor metrics and trigger simulated actions.</p>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 border-t border-slate-200 pt-3">
            Occupant comfort guaranteed by internal model constraint engine.
          </div>
        </div>
      </div>
    </div>
  );
};
