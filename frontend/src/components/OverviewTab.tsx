import React from 'react';
import {
  Building2,
  Zap,
  TrendingDown,
  AlertTriangle,
  Flame,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Layers,
  PowerOff,
  Sliders,
  TrendingUp,
} from 'lucide-react';
import { DashboardSummary } from '../types.ts';

interface OverviewTabProps {
  summary: DashboardSummary | null;
  onNavigateTab: (tab: string) => void;
  onSelectFloor?: (floorId: string) => void;
  onApplyRecommendation?: (recId: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  summary,
  onNavigateTab,
  onSelectFloor,
  onApplyRecommendation,
}) => {
  const building = summary?.building;
  const floors = building?.floors || [];
  const totalKw = building?.total_predicted_energy_kw || summary?.total_predicted_energy_kw || 0;
  const actualKw = building?.total_actual_energy_kw || totalKw;
  const savingsKw = building?.savings_potential_kw || summary?.total_savings_potential_kw || 0;
  const monthlySavings = building?.monthly_savings_cost || summary?.monthly_savings_cost || 0;
  const activeWastages = summary?.wastages || building?.wastages || [];
  const activeRecs = summary?.recommendations || [];
  const topDriver = building?.top_shap_driver || summary?.top_shap_driver;

  return (
    <div className="space-y-6">
      {/* 1. Single Building Executive Hero Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-md border border-slate-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Single Building Architecture
              </span>
              <span className="text-xs text-slate-300">
                • 4 Floors • 24 Zones (4 Offices + 2 Meeting Halls each)
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {building?.name || 'Apex Corporate Tower'}
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Real-time SVR energy prediction compared with 1-hour actual consumption. Floor-level and zone-level SHAP attributions identify increasing parameters and direct energy-saving actions.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-xs text-slate-400 block">SVR Predicted</span>
              <strong className="text-xl font-extrabold text-white">
                {totalKw.toFixed(1)}
              </strong>
              <span className="text-[11px] text-slate-400 block">kWh / hr</span>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-xs text-slate-400 block">1-Hr Actual</span>
              <strong className="text-xl font-extrabold text-amber-300">
                {actualKw.toFixed(1)}
              </strong>
              <span className="text-[11px] text-slate-400 block">kWh / hr</span>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-xs text-slate-400 block">Savings Potential</span>
              <strong className="text-xl font-extrabold text-emerald-400">
                {savingsKw.toFixed(1)}
              </strong>
              <span className="text-[11px] text-slate-400 block">kW (~${monthlySavings.toFixed(0)}/mo)</span>
            </div>
          </div>
        </div>

        {/* Top SHAP Energy Driver Callout */}
        {topDriver && (
          <div className="mt-4 p-3.5 bg-white/5 border border-white/10 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5">
              <Sparkles className="w-4 h-4 text-indigo-300 shrink-0" />
              <span className="text-slate-300">
                <strong className="text-white">SHAP Key Contributor:</strong>{' '}
                {topDriver.description}
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('shap-explainer')}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center space-x-1 cursor-pointer transition shrink-0"
            >
              <span>View SHAP Attribution</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Four Floors Grid with E_pred vs E_actual, Status, SHAP & Actions to Minimize Energy */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Floor-Level Energy Hierarchy & Actions (4 Floors • 6 Zones Each)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Hierarchy: Floor → Category (Office / Meeting Hall) → Zone Instance
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {floors.map((floor) => {
            const isIncreasing = floor.status === 'Energy Consumption Increasing' || (floor.difference_kw || 0) > 8;
            const statusBg = isIncreasing
              ? 'bg-rose-50 border-rose-200 text-rose-700 ring-1 ring-rose-300/50'
              : floor.status === 'Eco Optimized'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-cyan-50 border-cyan-200 text-cyan-700';

            const diff = floor.difference_kw || ((floor.total_actual_energy_kw || floor.total_predicted_energy_kw || 0) - (floor.total_predicted_energy_kw || 0));

            return (
              <div
                key={floor.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      Floor {floor.floorNumber || floor.id.replace('floor-', '')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${statusBg}`}>
                      {isIncreasing ? 'Energy Usage Increasing' : floor.status || 'Normal'}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm mb-0.5">{floor.name}</h4>
                  <p className="text-[11px] text-slate-500 mb-3">
                    4 Offices • 2 Meeting Halls (6 Zones)
                  </p>

                  <div className="space-y-2 py-2.5 border-y border-slate-100 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Predicted (E_pred):</span>
                      <strong className="text-slate-900 font-bold">
                        {(floor.total_predicted_energy_kw || 0).toFixed(1)} kWh
                      </strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">1-Hr Actual (E_actual):</span>
                      <strong className="text-slate-900 font-bold">
                        {(floor.total_actual_energy_kw || floor.total_predicted_energy_kw || 0).toFixed(1)} kWh
                      </strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Difference (Δ):</span>
                      <span className={`font-extrabold ${diff > 3 ? 'text-rose-600' : diff < -3 ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} kWh
                      </span>
                    </div>
                    {floor.top_shap_driver && (
                      <div className="flex justify-between items-center text-indigo-700 pt-1">
                        <span className="text-slate-500">Top SHAP Param:</span>
                        <span className="font-medium truncate max-w-[120px]" title={floor.top_shap_driver.description}>
                          {floor.top_shap_driver.feature}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Floor-Level Actions to Minimize Energy Consumption */}
                  {floor.actions_to_take && floor.actions_to_take.length > 0 && (
                    <div className="mt-3 bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 text-[11px]">
                      <div className="flex items-center space-x-1.5 text-amber-800 font-bold mb-1">
                        <PowerOff className="w-3.5 h-3.5 text-amber-600" />
                        <span>Action to Minimize Energy:</span>
                      </div>
                      <p className="text-slate-700 leading-snug">
                        {floor.actions_to_take[0].action}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      if (onSelectFloor) onSelectFloor(floor.id);
                      onNavigateTab(floor.id);
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center space-x-1 transition shadow-xs"
                  >
                    <span>Inspect {floor.name}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (onSelectFloor) onSelectFloor(floor.id);
                      onNavigateTab('shap-explainer');
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    SHAP Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Action Recommendations Table: Switch off unwanted items */}
      {activeRecs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Instant Actions to Minimize Energy Consumption (Switch Unwanted Electrical Items)
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('recommendations')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center space-x-1 cursor-pointer"
            >
              <span>View All ({activeRecs.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeRecs.slice(0, 3).map((rec: any) => (
              <div
                key={rec.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700">
                      {rec.floorName} • {rec.zoneName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                      -{rec.estimated_saving_kw} kW
                    </span>
                  </div>
                  <h5 className="font-semibold text-slate-900 text-xs mb-1">
                    {rec.recommendation}
                  </h5>
                  <p className="text-[11px] text-slate-600 mb-2">
                    {rec.reason}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-700">
                    Saves ${rec.estimated_monthly_saving_cost}/mo
                  </span>
                  {onApplyRecommendation && (
                    <button
                      onClick={() => onApplyRecommendation(rec.id)}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold cursor-pointer transition shadow-xs"
                    >
                      Apply Fix
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
