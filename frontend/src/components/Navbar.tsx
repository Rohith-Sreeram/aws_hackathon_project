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
  Sparkles,
  Layers,
  Play,
  Pause,
  Radio,
  FastForward,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedFloorId: string;
  onSelectFloor: (id: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenSettings: () => void;
  outdoorTemp?: number;
  tariffRate?: number;
  activeAnomaliesCount: number;
  activeWastagesCount: number;
  floorsList?: Array<{ id: string; name: string; floorNumber: number }>;
  isSimulating: boolean;
  simulationSpeedMs: number;
  onSelectSpeed: (speedMs: number) => void;
  onToggleSimulation: () => void;
  onTriggerTick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedFloorId,
  onSelectFloor,
  onRefresh,
  isLoading,
  onOpenSettings,
  outdoorTemp = 26.0,
  tariffRate = 0.18,
  activeAnomaliesCount,
  activeWastagesCount,
  floorsList = [
    { id: 'floor-1', name: 'Floor 1 - Executive & Ops', floorNumber: 1 },
    { id: 'floor-2', name: 'Floor 2 - Tech & Engineering', floorNumber: 2 },
    { id: 'floor-3', name: 'Floor 3 - Product & Marketing', floorNumber: 3 },
    { id: 'floor-4', name: 'Floor 4 - Research & Lab', floorNumber: 4 },
  ],
  isSimulating,
  simulationSpeedMs,
  onSelectSpeed,
  onToggleSimulation,
  onTriggerTick,
}) => {
  const tabs = [
    { id: 'overview', label: 'Building & Floor Overview', icon: Activity },
    { id: 'floor-1', label: 'Floor 1', icon: Layers, badge: '4 Off + 2 Halls' },
    { id: 'floor-2', label: 'Floor 2', icon: Layers, badge: '4 Off + 2 Halls' },
    { id: 'floor-3', label: 'Floor 3', icon: Layers, badge: '4 Off + 2 Halls' },
    { id: 'floor-4', label: 'Floor 4', icon: Layers, badge: '4 Off + 2 Halls' },
    { id: 'shap-explainer', label: 'SHAP Explainability', icon: Sparkles, badge: 'SVR ML', badgeColor: 'bg-indigo-600 text-white' },
    { id: 'energy', label: 'Energy Forecasting', icon: Zap },
    {
      id: 'anomalies',
      label: 'Anomaly Center',
      icon: AlertTriangle,
      badge: activeAnomaliesCount > 0 ? activeAnomaliesCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'wastage',
      label: 'Wastage Analysis',
      icon: Flame,
      badge: activeWastagesCount > 0 ? activeWastagesCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    { id: 'recommendations', label: 'Comfort Recommendations', icon: ShieldCheck },
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
                Apex Corporate Tower BEMS
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5 animate-pulse"></span>
                SVR + SHAP
              </span>
            </div>
            <p className="text-xs text-slate-500">
              1 Building • 4 Floors • 4 Offices & 2 Meeting Halls per floor (24 Zones Total)
            </p>
          </div>
        </div>

        {/* Center Live Environmental Telemetry & Simulation Pulse */}
        <div className="hidden lg:flex items-center space-x-4 text-xs text-slate-600">
          {/* Live Sensor Stream Badge with Speed Indicator */}
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border shadow-xs transition ${
            isSimulating ? 'bg-emerald-50 text-emerald-800 border-emerald-200 ring-1 ring-emerald-400/30' : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}>
            <Radio className={`w-3.5 h-3.5 ${isSimulating ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
            <span className="font-bold">
              {isSimulating ? `⚡ Live: ${(simulationSpeedMs / 1000).toFixed(1)}s Real-Time` : 'Stream Paused'}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-xs">
            <SunMedium className="w-4 h-4 text-amber-500" />
            <span>Outdoor: <strong className="text-slate-900 font-semibold">{outdoorTemp.toFixed(1)}°C</strong></span>
          </div>
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-xs">
            <Zap className="w-4 h-4 text-emerald-600" />
            <span>Tariff: <strong className="text-slate-900 font-semibold">${tariffRate.toFixed(2)}/kWh</strong></span>
          </div>
        </div>

        {/* Action Controls, Floor Selector & Sensor Stream Controls */}
        <div className="flex items-center space-x-2">
          {/* Simulation Speed Dropdown */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <FastForward className="w-3.5 h-3.5 text-slate-500 ml-1" />
            <select
              value={simulationSpeedMs}
              onChange={(e) => onSelectSpeed(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden pr-1 cursor-pointer py-0.5"
              title="Simulation Streaming Refresh Rate"
            >
              <option value={800}>⚡ 0.8s (Ultra-Fast)</option>
              <option value={1000}>⚡ 1.0s (Fast)</option>
              <option value={2000}>2.0s (Medium)</option>
              <option value={3000}>3.0s (Standard)</option>
            </select>
          </div>

          {/* Simulation Toggle Button */}
          <button
            onClick={onToggleSimulation}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 shadow-xs cursor-pointer border ${
              isSimulating
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-700 ring-2 ring-emerald-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title={isSimulating ? 'Pause Live Sensor Simulation' : 'Resume Live Sensor Simulation'}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
            <span className="hidden sm:inline">{isSimulating ? 'Streaming' : 'Start'}</span>
          </button>

          {/* Quick Step / Tick Button */}
          <button
            onClick={onTriggerTick}
            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center space-x-1 shadow-xs cursor-pointer active:scale-95"
            title="Trigger an immediate sensor fluctuation tick"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline">Tick</span>
          </button>

          {/* Floor Navigation Dropdown */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <Layers className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            <select
              value={selectedFloorId}
              onChange={(e) => onSelectFloor(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden pr-2 cursor-pointer py-0.5"
            >
              <option value="all">🏢 All 4 Floors (24 Zones)</option>
              {floorsList.map((f) => (
                <option key={f.id} value={f.id}>
                  Floor {f.floorNumber} ({f.name})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onOpenSettings}
            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
            title="Configure Tariff & Comfort Parameters"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden xl:inline">Tariff</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 sm:px-3 sm:py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            title="Refresh All 24 Zones"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-emerald-500 text-white' : tab.badgeColor || 'bg-slate-200 text-slate-700'
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
