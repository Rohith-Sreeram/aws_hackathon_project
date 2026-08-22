import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  Filter,
  Search,
  ArrowUpRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react';
import { DashboardSummary, AnomalyRecord, AnomalySeverity } from '../types.ts';

interface AnomalyTabProps {
  summary: DashboardSummary | null;
}

export const AnomalyTab: React.FC<AnomalyTabProps> = ({ summary }) => {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!summary) return null;

  const anomalies = (summary as any).anomalies || (summary as any).wastages || [];

  const filteredAnomalies = anomalies.filter((a: any) => {
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const zName = (a.zone_name || a.zoneName || '').toLowerCase();
      const hint = (a.root_cause_hint || a.title || '').toLowerCase();
      const flId = (a.floor_id || a.floorId || '').toLowerCase();
      return zName.includes(q) || hint.includes(q) || flId.includes(q);
    }
    return true;
  });

  const criticalCount = anomalies.filter((a: any) => a.severity === 'critical' || a.wasted_kw > 10).length;
  const highCount = anomalies.filter((a: any) => a.severity === 'high' || a.wasted_kw > 5).length;
  const mediumCount = anomalies.filter((a: any) => a.severity === 'medium' || a.wasted_kw <= 5).length;

  return (
    <div className="space-y-6">
      {/* Top Anomaly Summary Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Active Anomalies</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-2xl font-bold ${anomalies.length > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {anomalies.length}
            </span>
            <span className="text-xs font-semibold text-slate-500">Events</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">Flagged across 24 monitored zones</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Critical Severity</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-rose-700">{criticalCount}</span>
            <span className="text-xs font-semibold text-slate-500">Immediate Action</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">Anomaly score &gt; 0.85 or deviation &gt; 15 kW</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">High / Warning Severity</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-amber-700">{highCount + mediumCount}</span>
            <span className="text-xs font-semibold text-slate-500">Elevated Deviations</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">Unusual HVAC or lighting activity</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-sky-700 uppercase tracking-wider">Model Anomaly Engine</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-xl font-bold text-slate-900">Z-Score & Isolation</span>
          </div>
          <div className="mt-1 text-xs text-emerald-700 font-medium">Auto-evaluating 15-min cadence</div>
        </div>
      </div>

      {/* Anomaly Records Table Section */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
        {/* Table Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Detected Anomaly Telemetry Records</h3>
              <p className="text-xs text-slate-500">Model predicted baseline vs actual real-time meter discrepancies</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search zone or root cause..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 w-52 font-medium"
              />
            </div>

            {/* Severity Filter */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setSeverityFilter('all')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                  severityFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({anomalies.length})
              </button>
              <button
                onClick={() => setSeverityFilter('critical')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                  severityFilter === 'critical' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:text-rose-800'
                }`}
              >
                Critical ({criticalCount})
              </button>
              <button
                onClick={() => setSeverityFilter('high')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                  severityFilter === 'high' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-700 hover:text-amber-800'
                }`}
              >
                High ({highCount})
              </button>
              <button
                onClick={() => setSeverityFilter('medium')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                  severityFilter === 'medium' ? 'bg-yellow-500 text-slate-900 shadow-xs' : 'text-yellow-700 hover:text-yellow-800'
                }`}
              >
                Medium ({mediumCount})
              </button>
            </div>
          </div>
        </div>

        {/* Table / List */}
        {filteredAnomalies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-2.5 px-3 font-semibold">Severity / Status</th>
                  <th className="py-2.5 px-3 font-semibold">Affected Zone / Floor</th>
                  <th className="py-2.5 px-3 font-semibold">Anomaly Score</th>
                  <th className="py-2.5 px-3 font-semibold">Actual vs Expected</th>
                  <th className="py-2.5 px-3 font-semibold">Energy Deviation</th>
                  <th className="py-2.5 px-3 font-semibold">Root Cause Explanation</th>
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredAnomalies.map((anom) => (
                  <tr key={anom.id} className="hover:bg-slate-50/80 transition">
                    {/* Severity Badge */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          anom.severity === 'critical'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : anom.severity === 'high'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                        }`}
                      >
                        {anom.severity} • {anom.anomaly_status}
                      </span>
                    </td>

                    {/* Zone Name */}
                    <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                      {anom.zone_name}
                    </td>

                    {/* Anomaly Score Bar */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-800">{anom.anomaly_score.toFixed(2)}</span>
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                          <div
                            className={`h-1.5 rounded-full ${
                              anom.anomaly_score > 0.8
                                ? 'bg-rose-600'
                                : anom.anomaly_score > 0.6
                                ? 'bg-amber-600'
                                : 'bg-yellow-500'
                            }`}
                            style={{ width: `${anom.anomaly_score * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* Actual vs Expected */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-slate-900">{anom.actual_energy.toFixed(1)} kW</span>{' '}
                      <span className="text-slate-500 text-[11px]">(exp. {anom.expected_energy.toFixed(1)} kW)</span>
                    </td>

                    {/* Deviation */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-semibold text-amber-700 flex items-center">
                        <ArrowUpRight className="w-3 h-3 mr-0.5" /> +{anom.deviation_kw.toFixed(1)} kW (+{anom.deviation_pct.toFixed(0)}%)
                      </span>
                    </td>

                    {/* Root Cause Hint */}
                    <td className="py-3 px-3 text-slate-600 max-w-xs font-medium">
                      {anom.root_cause_hint}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                      {new Date(anom.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            <h4 className="text-sm font-semibold text-slate-800">No Anomalies Found</h4>
            <p className="text-xs max-w-sm text-slate-500">All building zones are currently operating in close agreement with model baselines.</p>
          </div>
        )}
      </div>
    </div>
  );
};
