import React, { useEffect, useState, useCallback } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { OverviewTab } from './components/OverviewTab.tsx';
import { EnergyTab } from './components/EnergyTab.tsx';
import { UtilizationTab } from './components/UtilizationTab.tsx';
import { AnomalyTab } from './components/AnomalyTab.tsx';
import { WastageTab } from './components/WastageTab.tsx';
import { RecommendationsTab } from './components/RecommendationsTab.tsx';
import { SensorInputTab } from './components/SensorInputTab.tsx';
import { ModelApiTab } from './components/ModelApiTab.tsx';
import { TariffModal } from './components/TariffModal.tsx';
import {
  fetchDashboardSummary,
  fetchDashboardHistory,
  applyScenarioApi,
  controlHvacApi,
  controlLightingApi,
  applyRecommendationActionApi,
  updateSettingsApi,
} from './services/api.ts';
import { DashboardSummary, ConfigSettings } from './types.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorBanner(null);
    try {
      const [sumData, histData] = await Promise.all([
        fetchDashboardSummary(),
        fetchDashboardHistory(),
      ]);
      setSummary(sumData);
      setHistory(histData.history || []);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setErrorBanner(err.message || 'Error connecting to BEMS backend');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Periodic refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSelectScenario = async (scenarioId: string) => {
    try {
      setIsLoading(true);
      await applyScenarioApi(scenarioId);
      await loadData();
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to switch scenario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleControlHvac = async (floorId: string, zoneId: string, mode: 'energy_saving' | 'normal' | 'off') => {
    try {
      await controlHvacApi({ floor_id: floorId, zone_id: zoneId, mode });
      await loadData();
    } catch (err: any) {
      setErrorBanner(err.message || 'HVAC control action failed');
    }
  };

  const handleControlLighting = async (floorId: string, zoneId: string, mode: 'off' | 'dimmed' | 'on') => {
    try {
      await controlLightingApi({ floor_id: floorId, zone_id: zoneId, mode });
      await loadData();
    } catch (err: any) {
      setErrorBanner(err.message || 'Lighting control action failed');
    }
  };

  const handleApplyRecommendation = async (recId: string) => {
    try {
      await applyRecommendationActionApi(recId, 'apply');
      await loadData();
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to apply recommendation');
    }
  };

  const handleAcknowledgeRecommendation = async (recId: string) => {
    try {
      await applyRecommendationActionApi(recId, 'acknowledge');
      await loadData();
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to acknowledge recommendation');
    }
  };

  const handleSaveSettings = async (newConfig: ConfigSettings) => {
    await updateSettingsApi(newConfig);
    await loadData();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-emerald-600 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeScenario={summary?.active_scenario || 'empty_room_wastage'}
        onSelectScenario={handleSelectScenario}
        onRefresh={loadData}
        isLoading={isLoading}
        onOpenSettings={() => setIsSettingsOpen(true)}
        outdoorTemp={summary ? (summary as any).outdoor_temp : 26.0}
        tariffRate={summary?.tariff_rate_usd_per_kwh || 0.18}
        activeAnomaliesCount={summary?.active_anomalies_count || 0}
        activeWastagesCount={summary?.active_wastages_count || 0}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {errorBanner && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center justify-between shadow-xs">
            <span>{errorBanner}</span>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-rose-600 hover:text-rose-900 text-xs underline cursor-pointer ml-4 font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Views */}
        {activeTab === 'overview' && (
          <OverviewTab
            summary={summary}
            onNavigateTab={setActiveTab}
            onSelectScenario={handleSelectScenario}
            onApplyRecommendation={handleApplyRecommendation}
          />
        )}

        {activeTab === 'energy' && (
          <EnergyTab summary={summary} history={history} />
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
          <SensorInputTab onDataIngested={loadData} />
        )}

        {activeTab === 'model-api' && (
          <ModelApiTab />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-slate-600">
            Smart Building Energy Management System • Model Interface Layer Active
          </span>
          <span className="text-slate-400">
            Comfort Preservation Guaranteed • 15-Minute Sensor Telemetry
          </span>
        </div>
      </footer>

      {/* Settings / Tariff Modal */}
      {summary && (
        <TariffModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          config={(summary as any).config || {
            electricityTariff: 0.18,
            minComfortTemp: 20.0,
            maxComfortTemp: 25.5,
            workHoursStart: 8,
            workHoursEnd: 18,
            anomalySensitivity: 0.75,
          }}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  );
}
