import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { OverviewTab } from './components/OverviewTab.tsx';

import { UtilizationTab } from './components/UtilizationTab.tsx';
import { AnomalyTab } from './components/AnomalyTab.tsx';
import { WastageTab } from './components/WastageTab.tsx';
import { RecommendationsTab } from './components/RecommendationsTab.tsx';
import { SensorInputTab } from './components/SensorInputTab.tsx';
import { ModelApiTab } from './components/ModelApiTab.tsx';
import { FloorViewTab } from './components/FloorViewTab.tsx';
import { TariffModal } from './components/TariffModal.tsx';
import {
  fetchDashboardSummary,
  controlHvacApi,
  controlLightingApi,
  applyRecommendationActionApi,
  updateSettingsApi,
  toggleSimulationApi,
  triggerSimulationTickApi,
} from './services/api.ts';
import { DashboardSummary, ConfigSettings } from './types.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string>('all');
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLiveSimulating, setIsLiveSimulating] = useState<boolean>(true);
  const [simulationSpeedMs, setSimulationSpeedMs] = useState<number>(1000);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const isFirstLoad = useRef<boolean>(true);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setErrorBanner(null);
    try {
      const sumData = await fetchDashboardSummary();
      setSummary(sumData);
      if (sumData.simulation) {
        setIsLiveSimulating(sumData.simulation.is_simulating);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setErrorBanner(err.message || 'Error connecting to BEMS backend. Is Flask running on port 3000?');
    } finally {
      if (!isSilent) setIsLoading(false);
      isFirstLoad.current = false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Dynamic real-time simulation polling: fast interval (1000ms by default)
  useEffect(() => {
    if (!isLiveSimulating) return;
    const interval = setInterval(() => {
      loadData(true); // Silent high-speed dynamic update
    }, simulationSpeedMs);
    return () => clearInterval(interval);
  }, [isLiveSimulating, simulationSpeedMs, loadData]);

  const handleSelectSpeed = async (speedMs: number) => {
    setSimulationSpeedMs(speedMs);
    try {
      await toggleSimulationApi(isLiveSimulating, speedMs / 1000);
      await loadData(true);
    } catch (err: any) {
      console.error('Failed to update simulation speed:', err);
    }
  };

  const handleToggleSimulation = async () => {
    try {
      const nextState = !isLiveSimulating;
      setIsLiveSimulating(nextState);
      await toggleSimulationApi(nextState, simulationSpeedMs / 1000);
      await loadData(true);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to toggle simulation state');
    }
  };

  const handleTriggerTick = async () => {
    try {
      await triggerSimulationTickApi();
      await loadData(true);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to trigger simulation tick');
    }
  };

  const handleControlHvac = async (floorId: string, zoneId: string, mode: 'energy_saving' | 'normal' | 'off') => {
    try {
      await controlHvacApi({ floor_id: floorId, zone_id: zoneId, mode });
      await loadData(true);
    } catch (err: any) {
      setErrorBanner(err.message || 'HVAC control action failed');
    }
  };

  const handleControlLighting = async (floorId: string, zoneId: string, mode: 'off' | 'dimmed' | 'on') => {
    try {
      await controlLightingApi({ floor_id: floorId, zone_id: zoneId, mode });
      await loadData(true);
    } catch (err: any) {
      setErrorBanner(err.message || 'Lighting control action failed');
    }
  };

  const handleApplyRecommendation = async (recId: string) => {
    try {
      await applyRecommendationActionApi(recId, 'apply');
      await loadData(true);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to apply recommendation');
    }
  };

  const handleAcknowledgeRecommendation = async (recId: string) => {
    try {
      await applyRecommendationActionApi(recId, 'acknowledge');
      await loadData(true);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to acknowledge recommendation');
    }
  };

  const handleSaveSettings = async (newConfig: ConfigSettings) => {
    await updateSettingsApi(newConfig);
    await loadData(true);
  };

  const floorsList = summary?.building?.floors.map((f) => ({
    id: f.id,
    name: f.name,
    floorNumber: f.floorNumber || 1,
  })) || [
    { id: 'floor-1', name: 'Floor 1 - Executive & Ops', floorNumber: 1 },
    { id: 'floor-2', name: 'Floor 2 - Tech & Engineering', floorNumber: 2 },
    { id: 'floor-3', name: 'Floor 3 - Product & Marketing', floorNumber: 3 },
    { id: 'floor-4', name: 'Floor 4 - Research & Lab', floorNumber: 4 },
  ];

  const getFloorForTab = (tabId: string) => {
    const fNum = tabId.replace('floor-', '');
    const floors = summary?.building?.floors || summary?.floors || [];
    return floors.find((f) => f.id === tabId || String(f.floorNumber) === fNum) || floors[0] || null;
  };

  const activeAnomaliesCount = summary?.active_anomalies_count || summary?.active_wastages_count || 0;
  const activeWastagesCount = summary?.active_wastages_count || 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-emerald-600 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedFloorId={selectedFloorId}
        onSelectFloor={(fId) => {
          setSelectedFloorId(fId);
          if (fId !== 'all') {
            setActiveTab(fId);
          } else {
            setActiveTab('overview');
          }
        }}
        onRefresh={() => loadData(false)}
        isLoading={isLoading}
        onOpenSettings={() => setIsSettingsOpen(true)}
        tariffRate={summary?.tariff_rate || summary?.tariff_rate_usd_per_kwh || 0.18}
        activeAnomaliesCount={activeAnomaliesCount}
        activeWastagesCount={activeWastagesCount}
        floorsList={floorsList}
        isSimulating={isLiveSimulating}
        simulationSpeedMs={simulationSpeedMs}
        onSelectSpeed={handleSelectSpeed}
        onToggleSimulation={handleToggleSimulation}
        onTriggerTick={handleTriggerTick}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {errorBanner && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>Backend Connection Alert: {errorBanner}</span>
              </div>
              <button
                onClick={() => setErrorBanner(null)}
                className="text-rose-600 hover:text-rose-900 text-xs underline cursor-pointer ml-4 font-medium"
              >
                Dismiss
              </button>
            </div>
            <div className="pt-2 border-t border-rose-200/60 flex flex-wrap items-center gap-2">
              <span className="text-slate-700 font-medium">Backend URL:</span>
              <input
                id="backend-url-input"
                type="text"
                defaultValue={
                  (typeof window !== 'undefined' && localStorage.getItem('BEMS_BACKEND_URL')) ||
                  (import.meta.env.VITE_API_URL as string) ||
                  ''
                }
                placeholder="e.g. https://bems-backend.onrender.com"
                className="flex-1 min-w-[280px] px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => {
                  const input = document.getElementById('backend-url-input') as HTMLInputElement;
                  if (input) {
                    if (input.value.trim()) {
                      localStorage.setItem('BEMS_BACKEND_URL', input.value.trim().replace(/\/+$/, ''));
                    } else {
                      localStorage.removeItem('BEMS_BACKEND_URL');
                    }
                    loadData(false);
                  }
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-xs"
              >
                Connect & Save
              </button>
              <button
                onClick={() => loadData(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-xs"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* 1. Building & Floor Overview Tab */}
        {activeTab === 'overview' && (
          <OverviewTab
            summary={summary}
            onNavigateTab={setActiveTab}
            onSelectFloor={setSelectedFloorId}
            onApplyRecommendation={handleApplyRecommendation}
          />
        )}

        {/* 2. Individual Floor Tabs (Floor 1, Floor 2, Floor 3, Floor 4) with Category & Instance Hierarchy, Simulate vs Manual Input & Actions */}
        {(activeTab === 'floor-1' || activeTab === 'floor-2' || activeTab === 'floor-3' || activeTab === 'floor-4') && (
          <FloorViewTab
            floor={getFloorForTab(activeTab)}
            onControlHvac={handleControlHvac}
            onControlLighting={handleControlLighting}
            onRefresh={() => loadData(true)}
            isSimulating={isLiveSimulating}
            onToggleSimulation={handleToggleSimulation}
          />
        )}


        {activeTab === 'utilization' && (
          <UtilizationTab
            summary={summary}
            onControlHvac={handleControlHvac}
            onControlLighting={handleControlLighting}
          />
        )}

        {activeTab === 'anomalies' && (
          <AnomalyTab summary={summary} />
        )}

        {activeTab === 'wastage' && (
          <WastageTab
            summary={summary}
            onNavigateToRecommendations={() => setActiveTab('recommendations')}
          />
        )}

        {activeTab === 'recommendations' && (
          <RecommendationsTab
            summary={summary}
            onApplyAction={handleApplyRecommendation}
            onAcknowledgeAction={handleAcknowledgeRecommendation}
          />
        )}

        {activeTab === 'sensor-input' && (
          <SensorInputTab onDataIngested={() => loadData(true)} />
        )}

        {activeTab === 'model-api' && (
          <ModelApiTab />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-slate-600">
            Apex Corporate Tower BEMS • 1 Building • 4 Floors • Live SVR AI + SHAP Sensor Stream
          </span>
          <span className="text-slate-400">
            4 Offices • 2 Meeting Halls per Floor (24 Zones Total)
          </span>
        </div>
      </footer>

      <TariffModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={
          summary?.config || {
            electricityTariff: 0.18,
            minComfortTemp: 20.0,
            maxComfortTemp: 25.5,
            workHoursStart: 8,
            workHoursEnd: 18,
            anomalySensitivity: 0.75,
          }
        }
        onSave={handleSaveSettings}
      />
    </div>
  );
}
