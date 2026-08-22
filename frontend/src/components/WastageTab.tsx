import React from 'react';
import {
  Flame,
  Fan,
  Lightbulb,
  Cpu,
  Layers,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { DashboardSummary, WastageRecord } from '../types.ts';

interface WastageTabProps {
  summary: DashboardSummary | null;
  onNavigateToRecommendations: () => void;
}

export const WastageTab: React.FC<WastageTabProps> = ({
  summary,
  onNavigateToRecommendations,
}) => {
  if (!summary) return null;

  const wastages: any[] = (summary as any).wastages || summary.building?.wastages || [];
  const tariff = summary.tariff_rate || summary.tariff_rate_usd_per_kwh || 0.18;
  const totalWastedKw = wastages.reduce((acc, w) => acc + (w.wasted_kw || w.wasted_power_kw || 0), 0);
  const totalWastedHourlyKwh = totalWastedKw;
  const monthlyCostWaste = totalWastedHourlyKwh * 24 * 30 * tariff;

  const hvacWastages = wastages.filter((w) => w.type === 'hvac_wastage' || w.hvac_status === 'ON');
  const lightingWastages = wastages.filter((w) => w.type === 'lighting_wastage' || w.lighting_status === 'ON');
  const equipmentWastages = wastages.filter((w) => w.type === 'equipment_abnormal_load');
  const utilizationWastages = wastages.filter((w) => w.type === 'low_utilization_high_energy' || w.type === 'empty_room_active_equipment');

  return (
    <div className="space-y-6">
      {/* Top Loss & Wastage KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Active Wastage Events</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{wastages.length}</span>
            <span className="text-xs font-semibold text-slate-500">Zones</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">Identified through presence & power correlation</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated Lost Power</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-amber-700">{totalWastedKw.toFixed(1)}</span>
            <span className="text-xs font-semibold text-slate-500">kW</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">Continuous non-productive draw</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Estimated Monthly Financial Loss</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-rose-700">${monthlyCostWaste.toFixed(0)}</span>
            <span className="text-xs font-semibold text-slate-500">/ month</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">At ${summary.tariff_rate_usd_per_kwh.toFixed(2)}/kWh tariff rate</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Resolvable via Eco Controls</span>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-700">100%</span>
            <span className="text-xs font-semibold text-slate-500">Comfort Safe</span>
          </div>
          <button
            onClick={onNavigateToRecommendations}
            className="mt-2 text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center cursor-pointer"
          >
            Review AI Recommendations <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      </div>

      {/* Wastage Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* HVAC Wastage Card */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-blue-700">
            <div className="flex items-center space-x-2">
              <Fan className="w-4 h-4" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">HVAC Wastage</h4>
            </div>
            <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
              {hvacWastages.length} Zones
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Occurs when presence = 0, HVAC is high (&gt;4.0 kW), and zone is not critical.
          </p>
        </div>

        {/* Lighting Wastage Card */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-amber-700">
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-4 h-4" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Lighting Wastage</h4>
            </div>
            <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md">
              {lightingWastages.length} Zones
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Occurs when presence = 0 and lighting power remains high (&gt;1.0 kW).
          </p>
        </div>

        {/* Equipment Load Card */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-purple-700">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Equipment / Plug Loads</h4>
            </div>
            <span className="text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md">
              {equipmentWastages.length} Zones
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Occurs when energy is abnormal while HVAC and lighting appear normal.
          </p>
        </div>
      </div>

      {/* Wastage Events Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active Wastage Incidents</h3>
              <p className="text-xs text-slate-500">Real-time breakdown of unneeded power dissipation</p>
            </div>
          </div>
        </div>

        {wastages.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-2.5 px-3 font-semibold">Wastage Type</th>
                  <th className="py-2.5 px-3 font-semibold">Affected Zone</th>
                  <th className="py-2.5 px-3 font-semibold">Vacancy Duration</th>
                  <th className="py-2.5 px-3 font-semibold">HVAC Power</th>
                  <th className="py-2.5 px-3 font-semibold">Lighting Power</th>
                  <th className="py-2.5 px-3 font-semibold">Power Lost (kW)</th>
                  <th className="py-2.5 px-3 font-semibold">Severity</th>
                  <th className="py-2.5 px-3 font-semibold">Recommended Remedy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {wastages.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-slate-900 flex items-center">
                        {w.type === 'hvac_wastage' && <Fan className="w-3.5 h-3.5 mr-1.5 text-blue-600" />}
                        {w.type === 'lighting_wastage' && <Lightbulb className="w-3.5 h-3.5 mr-1.5 text-amber-600" />}
                        {w.type === 'equipment_abnormal_load' && <Cpu className="w-3.5 h-3.5 mr-1.5 text-purple-600" />}
                        {w.title}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                      {w.zone_name}
                    </td>

                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1 text-slate-400" /> {w.vacancy_duration_min} min vacant
                      </span>
                    </td>

                    <td className="py-3 px-3 text-blue-700 font-bold whitespace-nowrap">
                      {w.hvac_power_kw.toFixed(1)} kW
                    </td>

                    <td className="py-3 px-3 text-amber-700 font-bold whitespace-nowrap">
                      {w.lighting_power_kw.toFixed(1)} kW
                    </td>

                    <td className="py-3 px-3 font-bold text-rose-700 whitespace-nowrap">
                      +{w.wasted_power_kw.toFixed(1)} kW
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          w.severity === 'high'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {w.severity}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap font-medium">
                      {w.type === 'hvac_wastage' && 'Set Eco Setback (-40% power)'}
                      {w.type === 'lighting_wastage' && 'Automated Turn Off / Dimming'}
                      {w.type === 'equipment_abnormal_load' && 'Inspect Plug Load Appliances'}
                      {w.type === 'low_utilization_high_energy' && 'Consolidate Occupied Wings'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            <h4 className="text-sm font-semibold text-slate-800">No Energy Wastage Detected</h4>
            <p className="text-xs max-w-sm text-slate-500">All vacant zones have been properly switched to low-power standby modes.</p>
          </div>
        )}
      </div>
    </div>
  );
};
