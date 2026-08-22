import React from 'react';
import {
  Zap,
  Clock,
  TrendingUp,
  Users,
  AlertTriangle,
  Flame,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { DashboardSummary } from '../types.ts';
import { SCENARIOS, ScenarioId } from '../../server/scenarioEngine.ts';

interface OverviewTabProps {
  summary: DashboardSummary | null;
  onNavigateTab: (tabId: string) => void;
  onSelectScenario: (id: string) => void;
  onApplyRecommendation: (recId: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  summary,
  onNavigateTab,
  onSelectScenario,
  onApplyRecommendation,
}) => {
  if (!summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-3 text-slate-500">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm">Synthesizing building sensor telemetry and AI models...</p>
        </div>
      </div>
    );
  }

  const scenarioMeta = SCENARIOS[summary.active_scenario as ScenarioId] || SCENARIOS.normal;
  const devKw = summary.current_energy_kw - summary.expected_energy_kw;
  const devPct = summary.expected_energy_kw > 0 ? (devKw / summary.expected_energy_kw) * 100 : 0;
  const isHighEnergy = devPct > 15;
  const isLowerEnergy = devPct < -5;

  return (
    <div className="space-y-6">
      {/* Scenario Context Banner */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center">
                <Sparkles className="w-3 h-3 mr-1" /> Active Test Scenario
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Outdoor {summary.building ? 'Ambient' : 'Temp'}: {summary.subsystem_breakdown ? 'Live Model Stream' : ''}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {scenarioMeta.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
              {scenarioMeta.description}
            </p>
          </div>

          {/* Quick Scenario Buttons */}
          <div className="flex flex-wrap gap-1.5 shrink-0">
            {Object.values(SCENARIOS).map((sc) => (
              <button
                key={sc.id}
                onClick={() => onSelectScenario(sc.id)}
                className={`text-xs px-2.5 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                  summary.active_scenario === sc.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {sc.id === 'normal' && '1. Normal'}
                {sc.id === 'empty_room_wastage' && '2. Vacant Wastage'}
                {sc.id === 'underutilized_floor' && '3. Underutilized'}
                {sc.id === 'high_heat_demand' && '4. Heatwave'}
                {sc.id === 'equipment_anomaly' && '5. Anomaly'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Primary KPI Grid (Section 8: Overview Section) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Current Energy */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Current Energy</span>
            <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-700">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {summary.current_energy_kw.toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-slate-500">kW</span>
            </div>
            <div className="mt-1 flex items-center text-xs">
              {devKw >= 0 ? (
                <span className="text-amber-700 flex items-center font-medium">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +{devKw.toFixed(1)} kW vs baseline
                </span>
              ) : (
                <span className="text-emerald-700 flex items-center font-medium">
                  <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> {devKw.toFixed(1)} kW vs baseline
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Today's Energy */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Energy</span>
            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {summary.today_total_energy_kwh.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-slate-500">kWh</span>
            </div>
            <div className="mt-1 flex items-center text-xs text-slate-500">
              <span>Cumulative 15-min integral</span>
            </div>
          </div>
        </div>

        {/* 3. Predicted Next-Hour Energy */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Predicted Next-Hour</span>
            <div className="p-1.5 bg-sky-50 rounded-lg text-sky-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold text-sky-700 tracking-tight">
                {summary.predicted_next_hour_energy_kw.toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-slate-500">kW</span>
            </div>
            <div className="mt-1 flex items-center text-xs text-slate-500">
              <span>Baseline: {summary.expected_energy_kw.toFixed(1)} kW</span>
            </div>
          </div>
        </div>

        {/* 4. Building Utilization */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Occupancy Ratio</span>
            <div className="p-1.5 bg-purple-50 rounded-lg text-purple-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {(summary.building_utilization.building_utilization_ratio * 100).toFixed(0)}%
              </span>
              <span className="text-xs font-semibold text-slate-500">
                ({summary.building_utilization.occupied_zones}/{summary.building_utilization.total_zones})
              </span>
            </div>
            <div className="mt-1 flex items-center text-xs">
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full ${
                    summary.building_utilization.building_utilization_ratio > 0.6
                      ? 'bg-emerald-600'
                      : summary.building_utilization.building_utilization_ratio > 0.25
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${summary.building_utilization.building_utilization_ratio * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Active Anomalies */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Anomalies</span>
            <div className={`p-1.5 rounded-lg ${summary.active_anomalies_count > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-1.5">
              <span className={`text-2xl font-bold tracking-tight ${summary.active_anomalies_count > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {summary.active_anomalies_count}
              </span>
              <span className="text-xs font-semibold text-slate-500">Flagged</span>
            </div>
            <div className="mt-1 flex items-center text-xs">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                summary.active_anomalies_count > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {summary.active_anomalies_count > 0 ? 'Active Investigation' : 'Nominal Status'}
              </span>
            </div>
          </div>
        </div>

        {/* 6. Potential Savings */}
        <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-semibold uppercase tracking-wider">Estimated Savings</span>
            <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-800">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold text-emerald-800 tracking-tight">
                {summary.total_potential_savings_kw.toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-emerald-700">kW</span>
            </div>
            <div className="mt-1 flex items-center text-xs text-emerald-700 font-semibold">
              <span>${summary.total_potential_monthly_savings_cost.toFixed(0)}/mo potential</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subsystems Breakdown & Floor Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Subsystems Power Distribution & Energy Classification */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Subsystem Power Distribution</h3>
              <p className="text-xs text-slate-500">Real-time breakdown across HVAC, Lighting, Equipment & Base</p>
            </div>
            <span className="text-xs text-slate-700 font-mono bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 font-medium">
              Total: {summary.current_energy_kw.toFixed(1)} kW
            </span>
          </div>

          {/* Progress Stack Bar */}
          <div className="space-y-3">
            <div className="w-full bg-slate-100 rounded-lg h-5 flex overflow-hidden p-0.5 border border-slate-200">
              <div
                className="bg-blue-500 h-full rounded-l transition-all"
                style={{ width: `${(summary.subsystem_breakdown.hvac_kw / summary.current_energy_kw) * 100}%` }}
                title={`HVAC: ${summary.subsystem_breakdown.hvac_kw} kW`}
              ></div>
              <div
                className="bg-amber-400 h-full transition-all"
                style={{ width: `${(summary.subsystem_breakdown.lighting_kw / summary.current_energy_kw) * 100}%` }}
                title={`Lighting: ${summary.subsystem_breakdown.lighting_kw} kW`}
              ></div>
              <div
                className="bg-purple-500 h-full transition-all"
                style={{ width: `${(summary.subsystem_breakdown.equipment_kw / summary.current_energy_kw) * 100}%` }}
                title={`Equipment: ${summary.subsystem_breakdown.equipment_kw} kW`}
              ></div>
              <div
                className="bg-slate-400 h-full rounded-r transition-all"
                style={{ width: `${(summary.subsystem_breakdown.base_kw / summary.current_energy_kw) * 100}%` }}
                title={`Base: ${summary.subsystem_breakdown.base_kw} kW`}
              ></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                <div className="flex items-center space-x-1.5 text-xs text-blue-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span className="font-semibold">HVAC Systems</span>
                </div>
                <div className="mt-1 text-base font-bold text-slate-900">
                  {summary.subsystem_breakdown.hvac_kw.toFixed(1)} <span className="text-xs font-normal text-slate-500">kW</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {((summary.subsystem_breakdown.hvac_kw / summary.current_energy_kw) * 100).toFixed(0)}% of total
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                <div className="flex items-center space-x-1.5 text-xs text-amber-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="font-semibold">Lighting</span>
                </div>
                <div className="mt-1 text-base font-bold text-slate-900">
                  {summary.subsystem_breakdown.lighting_kw.toFixed(1)} <span className="text-xs font-normal text-slate-500">kW</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {((summary.subsystem_breakdown.lighting_kw / summary.current_energy_kw) * 100).toFixed(0)}% of total
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                <div className="flex items-center space-x-1.5 text-xs text-purple-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                  <span className="font-semibold">Equipment / IT</span>
                </div>
                <div className="mt-1 text-base font-bold text-slate-900">
                  {summary.subsystem_breakdown.equipment_kw.toFixed(1)} <span className="text-xs font-normal text-slate-500">kW</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {((summary.subsystem_breakdown.equipment_kw / summary.current_energy_kw) * 100).toFixed(0)}% of total
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                  <span className="font-semibold">Base Infrastructure</span>
                </div>
                <div className="mt-1 text-base font-bold text-slate-900">
                  {Math.max(0, summary.subsystem_breakdown.base_kw).toFixed(1)} <span className="text-xs font-normal text-slate-500">kW</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {Math.max(0, (summary.subsystem_breakdown.base_kw / summary.current_energy_kw) * 100).toFixed(0)}% of total
                </div>
              </div>
            </div>
          </div>

          {/* Energy Behavior Classification Note (Section 5 requirement) */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-start space-x-2 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-slate-700">
              <strong className="text-slate-900">AI Classification: </strong>
              {summary.active_scenario === 'normal' && 'Normal Operation — High energy is fully explained by peak occupancy.'}
              {summary.active_scenario === 'empty_room_wastage' && 'Likely Energy Wastage — Unoccupied meeting rooms & offices drawing full HVAC & lighting power.'}
              {summary.active_scenario === 'underutilized_floor' && 'Underutilized Operation — Floor 2 occupancy is 15% but baseline HVAC remains active.'}
              {summary.active_scenario === 'high_heat_demand' && 'Legitimate High Demand — Outdoor 36.5°C requires peak chiller capacity; comfort protection active.'}
              {summary.active_scenario === 'equipment_anomaly' && 'Unusual Energy Behavior — Abnormal plug load spike without corresponding HVAC/Lighting activity.'}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Floor Utilization Summary */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Floor Utilizations</h3>
            <button
              onClick={() => onNavigateTab('utilization')}
              className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center font-semibold cursor-pointer"
            >
              Floor Matrix <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {summary.building_utilization.floor_utilizations.map((fl) => {
              const isUnderutilized = fl.utilization_ratio <= 0.25;
              return (
                <div
                  key={fl.floor_id}
                  className={`p-3 rounded-lg border transition ${
                    isUnderutilized
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800">{fl.floor_name.split(' - ')[0]}</span>
                    <span className="font-mono font-medium text-slate-700">{fl.total_power_kw} kW</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                    <span>
                      Occupied: {fl.occupied_count}/{fl.total_count} zones ({(fl.utilization_ratio * 100).toFixed(0)}%)
                    </span>
                    {isUnderutilized && (
                      <span className="text-amber-700 font-semibold">Underutilized</span>
                    )}
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        fl.utilization_ratio > 0.6
                          ? 'bg-emerald-600'
                          : fl.utilization_ratio > 0.25
                          ? 'bg-blue-600'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.max(5, fl.utilization_ratio * 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Recommendations Quick Action Deck */}
      {summary.recommendations.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Prioritized Comfort-Aware Recommendations</h3>
                <p className="text-xs text-slate-500">Pre-evaluated against comfort guardrails and critical zone protection</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('recommendations')}
              className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center font-semibold cursor-pointer"
            >
              View All ({summary.recommendations.length}) <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.recommendations.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                  rec.priority === 'HIGH PRIORITY'
                    ? 'bg-rose-50/70 border-rose-200'
                    : rec.priority === 'MEDIUM PRIORITY'
                    ? 'bg-amber-50/70 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rec.priority === 'HIGH PRIORITY'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : rec.priority === 'MEDIUM PRIORITY'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {rec.priority}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700">
                      Save {rec.estimated_saving_kw} kW
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{rec.recommendation}</h4>
                  <p className="text-[11px] text-slate-600 line-clamp-2">{rec.reason}</p>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    Est. saving: <strong className="text-emerald-700">{rec.estimated_hourly_saving_kwh} kWh/hr</strong>
                  </div>
                  {rec.status === 'applied' ? (
                    <span className="inline-flex items-center text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Applied
                    </span>
                  ) : (
                    <button
                      onClick={() => onApplyRecommendation(rec.id)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold transition cursor-pointer shadow-xs"
                    >
                      Apply Action
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
