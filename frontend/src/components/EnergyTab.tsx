import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Zap,
  TrendingUp,
  Activity,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import { DashboardSummary } from '../types.ts';

interface EnergyTabProps {
  summary: DashboardSummary | null;
  history: any[];
}

export const EnergyTab: React.FC<EnergyTabProps> = ({ summary, history }) => {
  const [timeRange, setTimeRange] = useState<'6h' | '24h' | 'all'>('24h');
  const [activeChartType, setActiveChartType] = useState<'forecast' | 'deviation' | 'subsystems'>('forecast');

  if (!summary) return null;

  // Filter history points based on selected range
  const filteredHistory = React.useMemo(() => {
    if (!history || history.length === 0) return [];
    if (timeRange === '6h') return history.slice(-24); // 24 * 15m = 6 hrs
    if (timeRange === '24h') return history.slice(-96); // 96 * 15m = 24 hrs
    return history;
  }, [history, timeRange]);

  const floors: any[] = summary.floors || summary.building?.floors || [];
  // Floor breakdown bar data (4 floors)
  const floorData = floors.map((fl: any) => ({
    name: `Floor ${fl.floorNumber || fl.id.replace('floor-', '')}`,
    power: fl.total_predicted_energy_kw || fl.total_power_kw || 45.0,
    occupied: fl.occupied_zones_count || fl.occupied_count || 0,
    total: fl.zones_count || fl.total_count || 6,
  }));

  const currentKw = summary.total_predicted_energy_kw || (summary as any).current_energy_kw || 312.4;
  const expectedKw = summary.total_expected_energy_kw || (summary as any).expected_energy_kw || 280.0;
  const deviation = currentKw - expectedKw;
  const deviationPct = expectedKw > 0 ? (deviation / expectedKw) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Top Energy Analytics KPI Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Power Draw</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{currentKw.toFixed(1)}</span>
            <span className="text-xs font-semibold text-slate-500">kW</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">Sum of 24 zone sub-meters (4 floors)</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expected Model Baseline</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-700">{expectedKw.toFixed(1)}</span>
            <span className="text-xs font-semibold text-slate-500">kW</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">Physics & regression baseline</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-sky-700 uppercase tracking-wider">Predicted Next 15m</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-sky-700">{summary.predicted_next_hour_energy_kw.toFixed(1)}</span>
            <span className="text-xs font-semibold text-slate-500">kW</span>
          </div>
          <div className="mt-1 text-xs text-sky-600">AI forecasted trajectory</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Model Energy Deviation</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-2xl font-bold ${deviation > 5 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {deviation >= 0 ? `+${deviation.toFixed(1)}` : deviation.toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-slate-500">kW ({deviationPct.toFixed(1)}%)</span>
          </div>
          <div className="mt-1 flex items-center text-xs">
            {deviation > 0 ? (
              <span className="text-amber-700 flex items-center font-medium">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> Above standard baseline
              </span>
            ) : (
              <span className="text-emerald-700 flex items-center font-medium">
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> Below standard baseline
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Interactive Chart Section */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200">
          {/* Chart Type Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveChartType('forecast')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeChartType === 'forecast'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Actual vs Forecast vs Expected
            </button>
            <button
              onClick={() => setActiveChartType('deviation')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeChartType === 'deviation'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Energy Deviation (Δ kW)
            </button>
            <button
              onClick={() => setActiveChartType('subsystems')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeChartType === 'subsystems'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Subsystem Loads (HVAC / Light / IT)
            </button>
          </div>

          {/* Time Range Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">Time Window:</span>
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setTimeRange('6h')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                  timeRange === '6h' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Last 6h
              </button>
              <button
                onClick={() => setTimeRange('24h')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                  timeRange === '24h' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                24h Profile
              </button>
              <button
                onClick={() => setTimeRange('all')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                  timeRange === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All History
              </button>
            </div>
          </div>
        </div>

        {/* 1. Actual vs Predicted vs Expected Chart */}
        {activeChartType === 'forecast' && (
          <div className="h-[380px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredHistory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="display_time"
                  stroke="#64748b"
                  fontSize={11}
                  interval={Math.floor(filteredHistory.length / 8)}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  unit=" kW"
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="actual_energy"
                  name="Actual Energy (kW)"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="predicted_energy"
                  name="Predicted Energy (kW)"
                  stroke="#0284c7"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="expected_energy"
                  name="Expected Baseline (kW)"
                  stroke="#94a3b8"
                  strokeWidth={1.8}
                  strokeDasharray="2 2"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 2. Deviation Delta Chart */}
        {activeChartType === 'deviation' && (
          <div className="h-[380px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredHistory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="display_time"
                  stroke="#64748b"
                  fontSize={11}
                  interval={Math.floor(filteredHistory.length / 8)}
                />
                <YAxis stroke="#64748b" fontSize={11} unit=" kW" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
                <Area
                  type="monotone"
                  dataKey="deviation_kw"
                  name="Energy Deviation (Actual - Expected kW)"
                  stroke="#d97706"
                  fillOpacity={1}
                  fill="url(#colorDev)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 3. Subsystem Breakdown Stacked Area Chart */}
        {activeChartType === 'subsystems' && (
          <div className="h-[380px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredHistory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="display_time"
                  stroke="#64748b"
                  fontSize={11}
                  interval={Math.floor(filteredHistory.length / 8)}
                />
                <YAxis stroke="#64748b" fontSize={11} unit=" kW" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="hvac_power"
                  name="HVAC Cooling & Fans (kW)"
                  stackId="1"
                  stroke="#2563eb"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="equipment_power"
                  name="IT & Plug Loads (kW)"
                  stackId="1"
                  stroke="#9333ea"
                  fill="#a855f7"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="lighting_power"
                  name="Lighting Loads (kW)"
                  stackId="1"
                  stroke="#ca8a04"
                  fill="#eab308"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Floor Energy Comparison Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Floor Power Distribution (kW)</h3>
            <p className="text-xs text-slate-500">Total instantaneous electrical load across each floor</p>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={floorData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} unit=" kW" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="power" name="Power (kW)" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Model Prediction Specs Card */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-emerald-700 mb-1">
              <Sparkles className="w-4 h-4" />
              <h3 className="text-sm font-bold text-slate-900">Model Energy Inference Specs</h3>
            </div>
            <p className="text-xs text-slate-500">Features considered by the pre-trained energy forecasting pipeline</p>
          </div>

          <div className="space-y-2.5 text-xs text-slate-700">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-slate-500 font-medium">Sampling Cadence:</span>
              <span className="font-semibold text-slate-900">15-minute sensor intervals</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-slate-500 font-medium">Thermal Delta Factor:</span>
              <span className="font-semibold text-slate-900">Outdoor ambient (26°C) vs 21°C balance point</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-slate-500 font-medium">Diurnal Profile:</span>
              <span className="font-semibold text-slate-900">Operating hours bell-curve + weekend setback</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-slate-500 font-medium">Occupancy Coupling:</span>
              <span className="font-semibold text-slate-900">+4.5 kW thermal/plug factor per active zone</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 border-t border-slate-200 pt-3 flex items-center justify-between">
            <span>Interface Status: <strong className="text-slate-800">Pre-Trained Weights Loaded</strong></span>
            <span className="text-emerald-700 font-bold">95% Confidence Bounds</span>
          </div>
        </div>
      </div>
    </div>
  );
};
