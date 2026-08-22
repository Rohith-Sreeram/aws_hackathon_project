import React, { useState, useEffect } from 'react';
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
  Play,
  Pause,
  Edit3,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Sun,
  Moon,
  Calendar,
  Clock,
  SlidersHorizontal,
  Flame,
} from 'lucide-react';
import { Zone, Floor } from '../types.ts';
import { predictShapApi, updateZoneMlControlApi } from '../services/api.ts';

interface FloorViewTabProps {
  floor: Floor | null;
  onControlHvac: (floorId: string, zoneId: string, mode: 'energy_saving' | 'normal' | 'off') => Promise<void>;
  onControlLighting: (floorId: string, zoneId: string, mode: 'off' | 'dimmed' | 'on') => Promise<void>;
  onRefresh: () => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
}

/* Status badge styling */
const statusBadge = (status?: string) => {
  if (!status) return 'bg-cyan-50 text-cyan-700 border-cyan-200';
  if (status.includes('Increasing')) return 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
  if (status.includes('Efficient') || status.includes('Eco')) return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
  return 'bg-cyan-50 text-cyan-700 border-cyan-200 font-bold';
};

/* Diff color */
const diffColor = (diff: number) =>
  diff > 3.5 ? 'text-rose-600 font-bold' : diff < -3.5 ? 'text-emerald-600 font-bold' : 'text-slate-700 font-semibold';

/* Diff icon */
const DiffIcon = ({ diff }: { diff: number }) =>
  diff > 3.5 ? (
    <TrendingUp className="w-3.5 h-3.5 text-rose-500 inline mr-0.5" />
  ) : diff < -3.5 ? (
    <TrendingDown className="w-3.5 h-3.5 text-emerald-500 inline mr-0.5" />
  ) : (
    <Minus className="w-3.5 h-3.5 text-slate-400 inline mr-0.5" />
  );

export const FloorViewTab: React.FC<FloorViewTabProps> = ({
  floor,
  onControlHvac,
  onControlLighting,
  onRefresh,
  isSimulating,
  onToggleSimulation,
}) => {
  // Evaluation Mode: 'simulate' (streaming telemetry) vs 'manual' (judge manual entry)
  const [evalMode, setEvalMode] = useState<'simulate' | 'manual'>('simulate');
  
  // Selected Zone for Inspection or Manual Editing
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  
  // Manual Input Form State for Judges
  const [manualForm, setManualForm] = useState({
    occupancy: 0,
    temperature: 23.0,
    humidity: 50.0,
    zoneType: 'Office',
    hvacStatus: 'ON',
    lightingStatus: 'ON',
    fanStatus: 'ON',
    dayNight: 'Day',
    weekend: 'No',
    actualEnergyKw: 58.0,
    useCustomActual: false,
  });

  const [liveManualPrediction, setLiveManualPrediction] = useState<any>(null);
  const [isCalculatingManual, setIsCalculatingManual] = useState<boolean>(false);
  const [manualSuccessMsg, setManualSuccessMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Category accordions
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    Office: true,
    'Meeting Hall': true,
  });

  const zones = floor?.zones || [];
  const officeZones = zones.filter((z) => (z.type === 'Office' || z['Zone Type'] === 'Office'));
  const hallZones = zones.filter((z) => (z.type === 'Meeting Hall' || z['Zone Type'] === 'Meeting Hall'));

  // Default select first zone if none selected
  useEffect(() => {
    if (zones.length > 0 && (!selectedZoneId || !zones.some(z => z.id === selectedZoneId))) {
      setSelectedZoneId(zones[0].id);
      syncFormFromZone(zones[0]);
    }
  }, [floor?.id]);

  const currentSelectedZone = zones.find(z => z.id === selectedZoneId) || zones[0];

  const syncFormFromZone = (z: Zone) => {
    if (!z) return;
    const occ = z.Occupancy ?? z.currentPresence ?? 0;
    const temp = z.Temperature ?? z.currentTemp ?? 22.5;
    const hum = z.Humidity ?? 50.0;
    const zType = z.type || z['Zone Type'] || 'Office';
    const hvac = z['HVAC Status'] ?? 'ON';
    const light = z['Lighting Status'] ?? 'ON';
    const fan = z['Fan Status'] ?? 'ON';
    const dn = z['Day/Night'] ?? 'Day';
    const wk = z.Weekend ?? 'No';
    const act = (z as any).actual_energy_kw ?? z.predicted_energy_kw ?? 50.0;

    setManualForm({
      occupancy: occ,
      temperature: temp,
      humidity: hum,
      zoneType: zType,
      hvacStatus: hvac,
      lightingStatus: light,
      fanStatus: fan,
      dayNight: dn,
      weekend: wk,
      actualEnergyKw: act,
      useCustomActual: false,
    });
    runManualCalculation({
      Occupancy: occ,
      Temperature: temp,
      Humidity: hum,
      'Zone Type': zType,
      'HVAC Status': hvac,
      'Lighting Status': light,
      'Fan Status': fan,
      'Day/Night': dn,
      Weekend: wk,
    }, act);
  };

  const handleSelectZoneForEdit = (z: Zone) => {
    setSelectedZoneId(z.id);
    syncFormFromZone(z);
  };

  const runManualCalculation = async (features: Record<string, any>, actualKw: number) => {
    setIsCalculatingManual(true);
    try {
      const res = await predictShapApi(features);
      const pred = res.predicted_energy_kwh || 45.0;
      const diff = actualKw - pred;
      const isIncreasing = diff > 3.5 || (features.Occupancy === 0 && features['HVAC Status'] === 'ON');
      
      setLiveManualPrediction({
        predicted: pred,
        actual: actualKw,
        diff: diff,
        status: isIncreasing ? 'Energy Usage Increasing' : diff < -3.5 ? 'Energy Efficient' : 'Normal',
        topDriver: res.top_positive_driver,
        shapValues: res.shap_values,
      });
    } catch (err) {
      console.error('Manual calculation error:', err);
    } finally {
      setIsCalculatingManual(false);
    }
  };

  // Preset Scenario loader for Judges
  const applyJudgePreset = (presetName: string) => {
    let newForm = { ...manualForm };
    if (presetName === 'wastage') {
      // Unoccupied with active HVAC & Lighting
      newForm = {
        ...newForm,
        occupancy: 0,
        temperature: 23.0,
        humidity: 48.0,
        hvacStatus: 'ON',
        lightingStatus: 'ON',
        fanStatus: 'ON',
        dayNight: 'Day',
        actualEnergyKw: 64.5,
      };
    } else if (presetName === 'overcooling') {
      // Overcooled Room
      newForm = {
        ...newForm,
        occupancy: 15,
        temperature: 18.0,
        humidity: 55.0,
        hvacStatus: 'ON',
        lightingStatus: 'ON',
        fanStatus: 'ON',
        dayNight: 'Day',
        actualEnergyKw: 68.2,
      };
    } else if (presetName === 'eco') {
      // Eco Mode
      newForm = {
        ...newForm,
        occupancy: 0,
        temperature: 22.0,
        humidity: 50.0,
        hvacStatus: 'OFF',
        lightingStatus: 'OFF',
        fanStatus: 'OFF',
        dayNight: 'Night',
        actualEnergyKw: 14.5,
      };
    } else if (presetName === 'meeting') {
      // High Occupancy Meeting
      newForm = {
        ...newForm,
        occupancy: 50,
        temperature: 24.5,
        humidity: 60.0,
        hvacStatus: 'ON',
        lightingStatus: 'ON',
        fanStatus: 'ON',
        dayNight: 'Day',
        actualEnergyKw: 72.0,
      };
    }

    setManualForm(newForm);
    runManualCalculation({
      Occupancy: newForm.occupancy,
      Temperature: newForm.temperature,
      Humidity: newForm.humidity,
      'Zone Type': newForm.zoneType,
      'HVAC Status': newForm.hvacStatus,
      'Lighting Status': newForm.lightingStatus,
      'Fan Status': newForm.fanStatus,
      'Day/Night': newForm.dayNight,
      Weekend: newForm.weekend,
    }, newForm.actualEnergyKw);
  };

  const handleApplyManualToZone = async () => {
    if (!currentSelectedZone) return;
    setIsCalculatingManual(true);
    setManualSuccessMsg(null);
    try {
      await updateZoneMlControlApi({
        zone_id: currentSelectedZone.id,
        hvac_status: manualForm.hvacStatus as any,
        lighting_status: manualForm.lightingStatus as any,
        fan_status: manualForm.fanStatus as any,
        occupancy: manualForm.occupancy,
        temperature: manualForm.temperature,
        humidity: manualForm.humidity,
        ...({
          zone_type: manualForm.zoneType,
          day_night: manualForm.dayNight,
          weekend: manualForm.weekend,
          actual_energy_kw: manualForm.actualEnergyKw,
        } as any),
      });
      setManualSuccessMsg(`Updated ${currentSelectedZone.name} with manual parameters! SVR & SHAP recalculated.`);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to apply manual settings:', err);
    } finally {
      setIsCalculatingManual(false);
      setTimeout(() => setManualSuccessMsg(null), 5000);
    }
  };

  const toggleCategory = (cat: string) =>
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));

  const handleHvacAction = async (zoneId: string, mode: 'energy_saving' | 'normal' | 'off') => {
    if (!floor) return;
    setActionLoading(true);
    try {
      await onControlHvac(floor.id, zoneId, mode);
      onRefresh();
    } finally {
      setActionLoading(false);
    }
  };

  const handleLightingAction = async (zoneId: string, mode: 'off' | 'dimmed' | 'on') => {
    if (!floor) return;
    setActionLoading(true);
    try {
      await onControlLighting(floor.id, zoneId, mode);
      onRefresh();
    } finally {
      setActionLoading(false);
    }
  };

  if (!floor) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-500">No floor selected or floor data unavailable.</p>
      </div>
    );
  }

  const floorActions = floor.actions_to_take || [];
  const floorPred = floor.total_predicted_energy_kw || 0;
  const floorActual = floor.total_actual_energy_kw || floorPred;
  const floorDiff = floor.difference_kw ?? (floorActual - floorPred);
  const floorStatus = floor.status || 'Normal';

  /* Render one zone instance card */
  const renderZoneCard = (zone: Zone) => {
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
    const isSelected = currentSelectedZone?.id === zone.id;
    const hasWastage = !isOccupied && (hvacOn || lightOn);

    return (
      <div
        key={zone.id}
        onClick={() => handleSelectZoneForEdit(zone)}
        className={`border rounded-xl p-4 cursor-pointer transition-all ${
          isSelected
            ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-sm'
            : hasWastage
            ? 'border-rose-200 bg-rose-50/30 hover:border-rose-300'
            : energyStatus.includes('Increasing')
            ? 'border-amber-200 bg-amber-50/20 hover:border-amber-300'
            : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2.5">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isOccupied ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
              }`}
            />
            <div>
              <h4 className="text-xs font-bold text-slate-900">{zone.name}</h4>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                {zone.type} • {zone.areaSqM || 200} m²
              </span>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] border ${statusBadge(energyStatus)}`}>
            {energyStatus}
          </span>
        </div>

        {/* 3-Column Telemetry Box: E_pred, E_actual, Difference */}
        <div className="grid grid-cols-3 gap-2 mb-2.5 text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
          <div>
            <span className="text-[10px] text-slate-500 block">E_pred (SVR)</span>
            <span className="text-xs font-bold text-slate-800">{predKw.toFixed(1)}</span>
            <span className="text-[9px] text-slate-400 block">kWh</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">E_actual (1hr)</span>
            <span className="text-xs font-bold text-slate-800">{actualKw.toFixed(1)}</span>
            <span className="text-[9px] text-slate-400 block">kWh/hr</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Δ Difference</span>
            <span className={`text-xs ${diffColor(diff)}`}>
              <DiffIcon diff={diff} />
              {diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
            </span>
            <span className="text-[9px] text-slate-400 block">kWh</span>
          </div>
        </div>

        {/* Sensor pills */}
        <div className="grid grid-cols-4 gap-1 text-center text-[10px] text-slate-600 mb-2">
          <div className="bg-slate-100/80 rounded py-1">
            <span className="text-slate-400 block text-[9px]">Occ</span>
            <strong className="text-slate-800">{occ}</strong>
          </div>
          <div className="bg-slate-100/80 rounded py-1">
            <span className="text-slate-400 block text-[9px]">Temp</span>
            <strong className="text-slate-800">{temp.toFixed(1)}°</strong>
          </div>
          <div className="bg-slate-100/80 rounded py-1">
            <span className="text-slate-400 block text-[9px]">HVAC</span>
            <strong className={hvacOn ? 'text-blue-700 font-bold' : 'text-slate-400'}>
              {hvacOn ? 'ON' : 'OFF'}
            </strong>
          </div>
          <div className="bg-slate-100/80 rounded py-1">
            <span className="text-slate-400 block text-[9px]">Light</span>
            <strong className={lightOn ? 'text-amber-700 font-bold' : 'text-slate-400'}>
              {lightOn ? 'ON' : 'OFF'}
            </strong>
          </div>
        </div>

        {/* Top SHAP parameter driver badge */}
        {topDriver && (
          <div className="mt-2 px-2 py-1 bg-indigo-50/80 border border-indigo-100 rounded-md text-[10px] text-indigo-900">
            <span className="font-bold">SHAP Cause: </span>
            {topDriver.feature} adds <strong>+{topDriver.impact?.toFixed(1)} kWh</strong>
          </div>
        )}

        {/* Action Recommendation */}
        {suggestedAction && (
          <div className="mt-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded-md text-[10px] text-amber-900">
            <PowerOff className="w-3 h-3 inline mr-1 text-amber-600" />
            <span className="font-semibold">Action: </span>
            {suggestedAction}
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
          <span className="text-indigo-600 font-semibold flex items-center">
            <Edit3 className="w-3 h-3 mr-1" />
            Click to Edit Features
          </span>
          <div className="flex space-x-1">
            {hvacOn && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleHvacAction(zone.id, 'energy_saving');
                }}
                disabled={actionLoading}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold cursor-pointer"
              >
                Setback
              </button>
            )}
            {lightOn && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLightingAction(zone.id, 'off');
                }}
                disabled={actionLoading}
                className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[10px] font-semibold cursor-pointer"
              >
                Off
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* Render a Category section */
  const renderCategorySection = (catLabel: string, catZones: Zone[]) => {
    const catActual = catZones.reduce(
      (a, z) => a + ((z as any).actual_energy_kw ?? z.predicted_energy_kw ?? 45),
      0
    );
    const catPred = catZones.reduce((a, z) => a + (z.predicted_energy_kw ?? 45), 0);
    const catDiff = catActual - catPred;
    const catIncreasing = catDiff > 3.5 * catZones.length * 0.5;
    const isOpen = expandedCategories[catLabel] ?? true;

    return (
      <div key={catLabel} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        {/* Category Accordion Header */}
        <button
          onClick={() => toggleCategory(catLabel)}
          className="w-full flex items-center justify-between pb-3 border-b border-slate-100 text-xs font-bold text-slate-800 transition cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )}
            <span className="text-sm font-bold text-slate-900">
              {catLabel} Category ({catZones.length} Instances)
            </span>
            {catIncreasing ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                Energy Usage Increasing
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Normal Category Load
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4 text-xs font-normal">
            <span className="text-slate-500">
              Pred: <strong className="text-slate-800 font-bold">{catPred.toFixed(1)} kWh</strong>
            </span>
            <span className="text-slate-500">
              Actual: <strong className="text-slate-800 font-bold">{catActual.toFixed(1)} kWh</strong>
            </span>
            <span className={diffColor(catDiff)}>
              Δ {catDiff >= 0 ? '+' : ''}
              {catDiff.toFixed(1)} kWh
            </span>
          </div>
        </button>

        {isOpen && (
          <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {catZones.map((z) => renderZoneCard(z))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Floor Executive Header & Evaluation Mode Switcher */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2.5 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Floor Level Dashboard
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBadge(floorStatus)}`}>
                {floorStatus}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{floor.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              6 Zones Total: 4 Offices & 2 Meeting Halls • SVR Predictive Model & SHAP Parameter Attribution
            </p>
          </div>

          {/* Mode Switcher: Simulate vs Manual */}
          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
            <button
              onClick={() => setEvalMode('simulate')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                evalMode === 'simulate'
                  ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-emerald-500/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${isSimulating ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
              <span>Simulate (Live Stream)</span>
            </button>

            <button
              onClick={() => setEvalMode('manual')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                evalMode === 'manual'
                  ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-indigo-500/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <span>Enter Manually (Judge Demo)</span>
            </button>
          </div>
        </div>

        {/* Floor KPI Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Floor Predicted (SVR)
            </span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-xl font-extrabold text-slate-900">{floorPred.toFixed(1)}</span>
              <span className="text-xs text-slate-500 font-semibold">kWh</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Sum of 6 zones</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              1-Hour Actual Energy
            </span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-xl font-extrabold text-amber-700">{floorActual.toFixed(1)}</span>
              <span className="text-xs text-slate-500 font-semibold">kWh/hr</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Live telemetry sum</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Δ Energy Difference
            </span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className={`text-xl ${diffColor(floorDiff)}`}>
                <DiffIcon diff={floorDiff} />
                {floorDiff >= 0 ? `+${floorDiff.toFixed(1)}` : floorDiff.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500 font-semibold">kWh</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">E_actual - E_pred</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Floor Top Driver (SHAP)
            </span>
            <div className="mt-1 text-xs font-bold text-indigo-700 truncate">
              {floor.top_shap_driver?.feature || 'HVAC Status'}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              +{floor.top_shap_driver?.total_impact_kw?.toFixed(1) || '13.5'} kWh contribution
            </span>
          </div>
        </div>
      </div>

      {/* 2. Mode 1: Live Simulation Notification or Mode 2: Manual Feature Entry for Judges */}
      {evalMode === 'manual' ? (
        /* JUDGE MANUAL ENTRY CONSOLE */
        <div className="bg-white border-2 border-indigo-500/40 rounded-2xl p-5 shadow-md space-y-5 bg-gradient-to-b from-indigo-50/20 to-white">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-indigo-100">
            <div>
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Manual Feature Input & Judge Evaluation Console
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Select any zone on {floor.name}, enter 9 model features manually, and test real-time SVR prediction + SHAP attribution.
              </p>
            </div>

            {/* Quick Demo Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 mr-1">Judge Presets:</span>
              <button
                onClick={() => applyJudgePreset('wastage')}
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer"
                title="Vacant Room with HVAC & Lighting left ON"
              >
                🚨 Wastage Anomaly
              </button>
              <button
                onClick={() => applyJudgePreset('overcooling')}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold cursor-pointer"
                title="Overcooled room at 18°C"
              >
                ❄️ Overcooled Room
              </button>
              <button
                onClick={() => applyJudgePreset('eco')}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold cursor-pointer"
                title="Eco mode / Setback"
              >
                🌿 Eco Mode
              </button>
              <button
                onClick={() => applyJudgePreset('meeting')}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold cursor-pointer"
                title="High occupancy boardroom meeting"
              >
                👥 High Occupancy
              </button>
            </div>
          </div>

          {/* Select Zone Pill Buttons */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Select Zone Instance to Edit on {floor.name}:
            </label>
            <div className="flex flex-wrap gap-2">
              {zones.map((z) => {
                const isSelected = currentSelectedZone?.id === z.id;
                return (
                  <button
                    key={z.id}
                    onClick={() => handleSelectZoneForEdit(z)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {z.name} ({z.type})
                  </button>
                );
              })}
            </div>
          </div>

          {/* 9 Feature Input Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
            {/* 1. Occupancy */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">1. Occupancy:</label>
                <span className="text-xs font-bold text-indigo-700">{manualForm.occupancy} people</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={manualForm.occupancy}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setManualForm({ ...manualForm, occupancy: val });
                  runManualCalculation({ ...manualForm, Occupancy: val }, manualForm.actualEnergyKw);
                }}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* 2. Temperature */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">2. Temperature:</label>
                <span className="text-xs font-bold text-indigo-700">{manualForm.temperature.toFixed(1)}°C</span>
              </div>
              <input
                type="range"
                min={16.0}
                max={32.0}
                step={0.5}
                value={manualForm.temperature}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setManualForm({ ...manualForm, temperature: val });
                  runManualCalculation({ ...manualForm, Temperature: val }, manualForm.actualEnergyKw);
                }}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* 3. Humidity */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">3. Humidity:</label>
                <span className="text-xs font-bold text-indigo-700">{manualForm.humidity.toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={80}
                value={manualForm.humidity}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setManualForm({ ...manualForm, humidity: val });
                  runManualCalculation({ ...manualForm, Humidity: val }, manualForm.actualEnergyKw);
                }}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* 4. Zone Type */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">4. Zone Type:</label>
              <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-lg border border-slate-200">
                {['Office', 'Meeting Hall'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setManualForm({ ...manualForm, zoneType: t });
                      runManualCalculation({ ...manualForm, 'Zone Type': t }, manualForm.actualEnergyKw);
                    }}
                    className={`py-1 text-xs font-semibold rounded text-center cursor-pointer ${
                      manualForm.zoneType === t
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. HVAC Status */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">5. HVAC Status:</label>
              <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-lg border border-slate-200">
                {['ON', 'OFF'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setManualForm({ ...manualForm, hvacStatus: s });
                      runManualCalculation({ ...manualForm, 'HVAC Status': s }, manualForm.actualEnergyKw);
                    }}
                    className={`py-1 text-xs font-semibold rounded text-center cursor-pointer ${
                      manualForm.hvacStatus === s
                        ? s === 'ON'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    HVAC {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Lighting Status */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">6. Lighting Status:</label>
              <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-lg border border-slate-200">
                {['ON', 'OFF'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setManualForm({ ...manualForm, lightingStatus: s });
                      runManualCalculation({ ...manualForm, 'Lighting Status': s }, manualForm.actualEnergyKw);
                    }}
                    className={`py-1 text-xs font-semibold rounded text-center cursor-pointer ${
                      manualForm.lightingStatus === s
                        ? s === 'ON'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-700 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Lights {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 7. Fan Status */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">7. Fan Status:</label>
              <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-lg border border-slate-200">
                {['ON', 'OFF'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setManualForm({ ...manualForm, fanStatus: s });
                      runManualCalculation({ ...manualForm, 'Fan Status': s }, manualForm.actualEnergyKw);
                    }}
                    className={`py-1 text-xs font-semibold rounded text-center cursor-pointer ${
                      manualForm.fanStatus === s
                        ? s === 'ON'
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-700 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Fan {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 8. Day/Night & Weekend */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">8 & 9. Time & Day:</label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const next = manualForm.dayNight === 'Day' ? 'Night' : 'Day';
                    setManualForm({ ...manualForm, dayNight: next });
                    runManualCalculation({ ...manualForm, 'Day/Night': next }, manualForm.actualEnergyKw);
                  }}
                  className={`py-1 text-xs font-semibold rounded text-center cursor-pointer border ${
                    manualForm.dayNight === 'Day'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-slate-800 text-white border-slate-700'
                  }`}
                >
                  {manualForm.dayNight === 'Day' ? '☀️ Day' : '🌙 Night'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = manualForm.weekend === 'No' ? 'Yes' : 'No';
                    setManualForm({ ...manualForm, weekend: next });
                    runManualCalculation({ ...manualForm, Weekend: next }, manualForm.actualEnergyKw);
                  }}
                  className={`py-1 text-xs font-semibold rounded text-center cursor-pointer border ${
                    manualForm.weekend === 'No'
                      ? 'bg-slate-100 text-slate-800 border-slate-200'
                      : 'bg-purple-50 text-purple-800 border-purple-200'
                  }`}
                >
                  {manualForm.weekend === 'No' ? '📅 Weekday' : '🎉 Weekend'}
                </button>
              </div>
            </div>
          </div>

          {/* 10. Actual Energy (1-Hour) Telemetry Override */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <div>
                <span className="text-xs font-bold text-amber-900">1-Hour Actual Energy Measured (E_actual):</span>
                <p className="text-[10px] text-amber-800">
                  Compared against SVR Predicted Energy (E_pred) to determine difference threshold.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                step="0.5"
                min="0"
                value={manualForm.actualEnergyKw}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setManualForm({ ...manualForm, actualEnergyKw: val });
                  runManualCalculation(manualForm, val);
                }}
                className="w-24 px-2.5 py-1 text-xs font-bold bg-white border border-amber-300 rounded-lg text-slate-900 text-right focus:outline-hidden"
              />
              <span className="text-xs font-bold text-amber-900">kWh</span>
            </div>
          </div>

          {/* Live Calculated Output & SHAP Preview */}
          {liveManualPrediction && (
            <div className="p-4 bg-white rounded-xl border border-indigo-200 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-indigo-900 flex items-center">
                  <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" />
                  Model Output & SHAP Attribution:
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-bold border ${statusBadge(
                    liveManualPrediction.status
                  )}`}
                >
                  Status: {liveManualPrediction.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Predicted Energy (E_pred)
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {liveManualPrediction.predicted.toFixed(2)} kWh
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Actual Energy (E_actual)
                  </span>
                  <span className="text-lg font-bold text-amber-700">
                    {liveManualPrediction.actual.toFixed(2)} kWh
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Δ Difference (E_actual - E_pred)
                  </span>
                  <span className={`text-lg ${diffColor(liveManualPrediction.diff)}`}>
                    {liveManualPrediction.diff >= 0 ? '+' : ''}
                    {liveManualPrediction.diff.toFixed(2)} kWh
                  </span>
                </div>
              </div>

              {/* Top SHAP parameter driver */}
              {liveManualPrediction.topDriver && (
                <div className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-100 text-xs text-indigo-900 flex items-center justify-between">
                  <span>
                    <strong>SHAP Identified Driver: </strong>
                    {liveManualPrediction.topDriver.description ||
                      `${liveManualPrediction.topDriver.feature} adds +${liveManualPrediction.topDriver.impact?.toFixed(
                        1
                      )} kWh`}
                  </span>
                  <span className="text-rose-600 font-bold text-xs shrink-0 ml-2">
                    +{liveManualPrediction.topDriver.impact?.toFixed(1)} kWh
                  </span>
                </div>
              )}

              {/* Apply to Zone Button */}
              <div className="flex items-center justify-between pt-2">
                {manualSuccessMsg ? (
                  <span className="text-xs font-semibold text-emerald-700 flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
                    {manualSuccessMsg}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">
                    Click apply to update {currentSelectedZone?.name} across the whole dashboard.
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleApplyManualToZone}
                  disabled={isCalculatingManual}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Apply & Recalculate {currentSelectedZone?.name}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* LIVE SIMULATION NOTIFICATION BANNER */
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">
              Simulation Mode Active: Streaming live sensor inputs (temperature, occupancy, equipment states) for all 6 zones on {floor.name}.
            </span>
          </div>
          <button
            onClick={() => setEvalMode('manual')}
            className="text-xs font-bold text-indigo-700 hover:underline cursor-pointer ml-3 shrink-0"
          >
            Switch to Manual Input (for Judges) →
          </button>
        </div>
      )}

      {/* 3. CATEGORY & INSTANCE LEVEL HIERARCHY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center">
            <Layers className="w-4 h-4 mr-1.5 text-emerald-600" />
            Category & Instance Breakdown for {floor.name}
          </h3>
          <span className="text-xs text-slate-500">
            Offices (4 instances) • Meeting Halls (2 instances)
          </span>
        </div>

        {/* Category 1: Offices (4 instances) */}
        {renderCategorySection('Office', officeZones)}

        {/* Category 2: Meeting Halls (2 instances) */}
        {renderCategorySection('Meeting Hall', hallZones)}
      </div>

      {/* 4. FLOOR-LEVEL ACTION PLAN TO MINIMIZE ENERGY CONSUMPTION */}
      <div className="bg-white border-2 border-amber-300 rounded-2xl p-5 shadow-xs space-y-4 bg-gradient-to-b from-amber-50/30 to-white">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-amber-200/80">
          <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
            <PowerOff className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-amber-950 uppercase tracking-wide">
              Floor-Level Actions to Minimize Energy Consumption ({floor.name})
            </h3>
            <p className="text-xs text-amber-900">
              Targeted recommendations to eliminate excess electrical draw identified by SVR differences and SHAP attribution.
            </p>
          </div>
        </div>

        {floorActions.length > 0 ? (
          <div className="space-y-3">
            {floorActions.map((act: any, idx: number) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-amber-200 rounded-xl p-3.5 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      {act.zoneName} ({act.zoneType})
                    </span>
                    <span className="text-xs font-bold text-slate-900">{act.action}</span>
                  </div>
                  <p className="text-xs text-slate-600">{act.reason}</p>
                </div>

                <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-700 block">
                      -{act.saving_kw?.toFixed(1) || '8.5'} kW
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ${act.saving_cost_monthly?.toFixed(2) || '11.00'}/mo
                    </span>
                  </div>
                  <button
                    onClick={() => handleHvacAction(act.zoneId, 'energy_saving')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    Apply Action
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center bg-emerald-50/50 rounded-xl border border-emerald-200 text-emerald-800 text-xs">
            <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600 mb-1" />
            <p className="font-bold">No active energy wastages detected on {floor.name}.</p>
            <p className="text-emerald-700 text-[11px] mt-0.5">
              All 4 offices and 2 meeting halls are operating within optimal SVR efficiency thresholds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
