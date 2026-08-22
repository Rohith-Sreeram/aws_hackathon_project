import React from 'react';
import {
  Building2,
  RefreshCw,
  SlidersHorizontal,
  Zap,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Flame,
  SunMedium,
  CheckCircle2,
} from 'lucide-react';
import { ScenarioMeta } from '../../server/scenarioEngine.ts';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeScenario: string;
  onSelectScenario: (id: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenSettings: () => void;
  outdoorTemp?: number;
  tariffRate?: number;
  activeAnomaliesCount: number;
  activeWastagesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeScenario,
  onSelectScenario,
  onRefresh,
  isLoading,
  onOpenSettings,
  outdoorTemp = 26.0,
  tariffRate = 0.18,
  activeAnomaliesCount,
  activeWastagesCount,
}) => {
  const tabs = [
    { id: 'overview', label: 'Dashboard Overview', icon: Activity },
    { id: 'energy', label: 'Energy Forecasting', icon: Zap },
    { id: 'utilization', label: 'Occupancy & Zones', icon: Building2 },
    {
      id: 'anomalies',
      label: 'Anomaly Center',
      icon: AlertTriangle,
      badge: activeAnomaliesCount > 0 ? activeAnomaliesCount : undefined,
      badgeColor: 'bg-red-500 text-white',
    },
    {
      id: 'wastage',
      label: 'Wastage Analysis',
      icon: Flame,
      badge: activeWastagesCount > 0 ? activeWastagesCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    { id: 'recommendations', label: 'Comfort Recommendations', icon: ShieldCheck },
    { id: 'sensor-input', label: 'Sensor Data & CSV', icon: SlidersHorizontal },
    { id: 'model-api', label: 'Model API Sandbox', icon: RefreshCw },
  ];

  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-30 shadow-xs">
      {/* Top Utility Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 flex items-center justify-center shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-base tracking-tight text-slate-900">
                Apex Tower BEMS
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5 animate-pulse"></span>
                AI Active
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Commercial Smart Building • 4 Floors • 24 Active Zones
            </p>
          </div>
        </div>

        {/* Center Live Environmental Telemetry */}
        <div className="hidden lg:flex items-center space-x-4 text-xs text-slate-600">
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-xs">
            <SunMedium className="w-4 h-4 text-amber-500" />
            <span>Outdoor: <strong className="text-slate-900 font-semibold">{outdoorTemp.toFixed(1)}°C</strong></span>
          </div>
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-xs">
            <Zap className="w-4 h-4 text-emerald-600" />
            <span>Tariff: <strong className="text-slate-900 font-semibold">${tariffRate.toFixed(2)} / kWh</strong></span>
          </div>
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-sky-600" />
            <span>Interval: <strong className="text-slate-900 font-semibold">15-min cadence</strong></span>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Quick Scenario Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 px-2 font-medium hidden sm:inline">Scenario:</span>
            <select
              id="scenario-selector-nav"
              value={activeScenario}
              onChange={(e) => onSelectScenario(e.target.value)}
              aria-label="Select simulation scenario"
              className="bg-white text-xs text-slate-800 font-medium rounded-md px-2.5 py-1 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer shadow-xs"
            >
              <option value="empty_room_wastage">2. Vacant Room Wastage (HVAC+Lights)</option>
              <option value="normal">1. Normal Peak Operation</option>
              <option value="underutilized_floor">3. Underutilized Floor (15% Occ)</option>
              <option value="high_heat_demand">4. Legitimate Heatwave Demand</option>
              <option value="equipment_anomaly">5. Equipment / Plug Load Anomaly</option>
            </select>
          </div>

          <button
            id="btn-settings-nav"
            onClick={onOpenSettings}
            title="Configure Tariff & Comfort Bounds"
            className="p-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 shadow-xs transition cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <button
            id="btn-refresh-nav"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh BEMS Inferences"
            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition flex items-center justify-center shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1.5 overflow-x-auto py-2 scrollbar-thin" aria-label="Main Navigation">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`ml-1.5 inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : tab.badgeColor
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
