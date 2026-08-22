import React, { useState } from 'react';
import {
  ShieldCheck,
  Zap,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Fan,
  Lightbulb,
  Check,
  Clock,
  Layers,
  Thermometer,
  ShieldAlert,
} from 'lucide-react';
import { DashboardSummary, Recommendation, RecommendationPriority } from '../types.ts';

interface RecommendationsTabProps {
  summary: DashboardSummary | null;
  onApplyAction: (recId: string) => Promise<void>;
  onAcknowledgeAction: (recId: string) => Promise<void>;
}

export const RecommendationsTab: React.FC<RecommendationsTabProps> = ({
  summary,
  onApplyAction,
  onAcknowledgeAction,
}) => {
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  if (!summary) return null;

  const recommendations = summary.recommendations;

  const filteredRecs = recommendations.filter((r) => {
    if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
    return true;
  });

  const handleApply = async (id: string) => {
    setActionInProgress(id);
    try {
      await onApplyAction(id);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAcknowledge = async (id: string) => {
    setActionInProgress(id);
    try {
      await onAcknowledgeAction(id);
    } finally {
      setActionInProgress(null);
    }
  };

  const totalSavingKw = recommendations
    .filter((r) => r.status === 'active')
    .reduce((acc, r) => acc + r.estimated_saving_kw, 0);

  const totalMonthlySaving = totalSavingKw * 24 * 30 * summary.tariff_rate_usd_per_kwh;

  return (
    <div className="space-y-6">
      {/* Top Comfort & Savings Banner */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Comfort-Guarded AI Optimization Plan
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-3xl font-medium">
              All recommendations have passed strict environmental comfort constraints (minimum/maximum temperature, ventilation, and critical zone isolation). Throttling is strictly suppressed if zone temperatures breach safe occupant comfort boundaries.
            </p>
          </div>

          <div className="flex items-center space-x-4 bg-slate-50 p-3 rounded-xl border border-slate-200 shrink-0">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Potential Savings</span>
              <span className="text-lg font-bold text-emerald-700">
                {totalSavingKw.toFixed(1)} kW ({totalSavingKw.toFixed(1)} kWh/hr)
              </span>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Financial Impact</span>
              <span className="text-lg font-bold text-slate-900">
                ${totalMonthlySaving.toFixed(0)} <span className="text-xs font-normal text-slate-500">/ mo</span>
              </span>
            </div>
          </div>
        </div>

        {/* Priority Filters */}
        <div className="flex items-center space-x-2 pt-2 border-t border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Filter by Priority:</span>
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setPriorityFilter('all')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                priorityFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({recommendations.length})
            </button>
            <button
              onClick={() => setPriorityFilter('HIGH PRIORITY')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                priorityFilter === 'HIGH PRIORITY' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:text-rose-800'
              }`}
            >
              High Priority
            </button>
            <button
              onClick={() => setPriorityFilter('MEDIUM PRIORITY')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                priorityFilter === 'MEDIUM PRIORITY' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-700 hover:text-amber-800'
              }`}
            >
              Medium Priority
            </button>
            <button
              onClick={() => setPriorityFilter('LOW PRIORITY')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                priorityFilter === 'LOW PRIORITY' ? 'bg-blue-600 text-white shadow-xs' : 'text-blue-700 hover:text-blue-800'
              }`}
            >
              Low / Info
            </button>
          </div>
        </div>
      </div>

      {/* Recommendations List Cards */}
      <div className="space-y-4">
        {filteredRecs.length > 0 ? (
          filteredRecs.map((rec) => {
            const isHigh = rec.priority === 'HIGH PRIORITY';
            const isMed = rec.priority === 'MEDIUM PRIORITY';
            const isApplied = rec.status === 'applied';
            const isAcknowledged = rec.status === 'acknowledged';

            return (
              <div
                key={rec.id}
                className={`p-5 rounded-xl border transition-all shadow-xs ${
                  isHigh
                    ? 'bg-white border-rose-200 hover:border-rose-300'
                    : isMed
                    ? 'bg-white border-amber-200 hover:border-amber-300'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Main Content */}
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isHigh
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : isMed
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}
                      >
                        {rec.priority}
                      </span>
                      <span className="text-xs font-bold text-slate-700 font-mono">
                        {rec.type}
                      </span>
                      {rec.zone_name && (
                        <span className="text-xs text-slate-500 font-medium">
                          • {rec.zone_name}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      {rec.recommendation}
                    </h3>

                    <div className="text-xs text-slate-600">
                      <strong className="text-slate-900">Reason:</strong> {rec.reason}
                    </div>

                    {/* Comfort Guardrails Verification Box (Section 6 requirement) */}
                    <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200/80 text-[11px] text-emerald-950 flex items-start space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-emerald-800 font-semibold">Comfort Protection Check: </strong>
                        {rec.comfort_checks.message} (Safe envelope: {rec.comfort_checks.comfort_range})
                      </div>
                    </div>
                  </div>

                  {/* Right Savings & Action Box (Section 7 requirement) */}
                  <div className="lg:min-w-[260px] bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 shrink-0 flex flex-col justify-between">
                    <div className="space-y-1 text-xs">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Estimated Potential Savings
                      </span>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Current Load:</span>
                        <span className="font-bold text-slate-900">{rec.current_power_kw.toFixed(1)} kW</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Recommended:</span>
                        <span className="font-bold text-slate-700">{rec.recommended_power_kw.toFixed(1)} kW</span>
                      </div>
                      <div className="flex items-center justify-between text-emerald-700 border-t border-slate-200 pt-1">
                        <span className="font-semibold">Estimated Saving:</span>
                        <span className="font-bold text-sm">+{rec.estimated_saving_kw.toFixed(1)} kW</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span>Hourly Savings:</span>
                        <span className="text-slate-800 font-mono font-medium">{rec.estimated_hourly_saving_kwh.toFixed(1)} kWh/hr</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span>Estimated Cost Saving:</span>
                        <span className="text-emerald-700 font-bold font-mono">
                          ${rec.estimated_monthly_saving_cost.toFixed(0)}/mo
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-slate-200 flex items-center space-x-2">
                      {isApplied ? (
                        <div className="w-full py-1.5 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center justify-center space-x-1.5">
                          <Check className="w-4 h-4" />
                          <span>Action Applied (Eco Active)</span>
                        </div>
                      ) : isAcknowledged ? (
                        <div className="w-full py-1.5 px-3 bg-sky-50 border border-sky-200 rounded-lg text-sky-800 text-xs font-semibold flex items-center justify-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Acknowledged by Manager</span>
                        </div>
                      ) : (
                        <>
                          {rec.suggested_action && (
                            <button
                              onClick={() => handleApply(rec.id)}
                              disabled={actionInProgress === rec.id}
                              className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center space-x-1 shadow-xs"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>{actionInProgress === rec.id ? 'Applying...' : 'Apply Eco Action'}</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleAcknowledge(rec.id)}
                            disabled={actionInProgress === rec.id}
                            className="py-1.5 px-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
                          >
                            Acknowledge
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center text-slate-400 bg-white border border-slate-200/80 rounded-xl flex flex-col items-center justify-center space-y-2 shadow-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            <h4 className="text-sm font-semibold text-slate-800">No Intervention Recommended</h4>
            <p className="text-xs max-w-sm text-slate-500">Building HVAC and lighting loads are fully aligned with occupancy and environmental conditions.</p>
          </div>
        )}
      </div>
    </div>
  );
};
