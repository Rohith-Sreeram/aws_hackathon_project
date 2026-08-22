import React, { useState } from 'react';
import { X, DollarSign, Thermometer, Clock, ShieldCheck, Check } from 'lucide-react';
import { ConfigSettings } from '../types.ts';

interface TariffModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfigSettings;
  onSave: (newConfig: ConfigSettings) => Promise<void>;
}

export const TariffModal: React.FC<TariffModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [tariff, setTariff] = useState(config.electricityTariff);
  const [minTemp, setMinTemp] = useState(config.minComfortTemp);
  const [maxTemp, setMaxTemp] = useState(config.maxComfortTemp);
  const [startHour, setStartHour] = useState(config.workHoursStart);
  const [endHour, setEndHour] = useState(config.workHoursEnd);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        electricityTariff: Number(tariff),
        minComfortTemp: Number(minTemp),
        maxComfortTemp: Number(maxTemp),
        workHoursStart: Number(startHour),
        workHoursEnd: Number(endHour),
        anomalySensitivity: config.anomalySensitivity,
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 800);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl relative text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <button
          id="btn-close-tariff-modal"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 shadow-xs">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tariff & Comfort Guardrails</h2>
            <p className="text-xs text-slate-500">Configure financial savings rates and occupant comfort boundaries</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Electricity Tariff */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Electricity Tariff Rate ($ / kWh)
            </label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">$</span>
              <input
                id="input-tariff-rate"
                type="number"
                step="0.01"
                min="0.01"
                max="2.00"
                value={tariff}
                onChange={(e) => setTariff(parseFloat(e.target.value))}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Used to compute all estimated potential cost savings ($/hr & $/month).</p>
          </div>

          {/* Comfort Bounds */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 mb-2">
              <Thermometer className="w-4 h-4 text-sky-600" />
              <span>Thermal Comfort Envelope (°C)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Minimum Temp (°C)</label>
                <input
                  id="input-min-temp"
                  type="number"
                  step="0.5"
                  min="16"
                  max="24"
                  value={minTemp}
                  onChange={(e) => setMinTemp(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Maximum Temp (°C)</label>
                <input
                  id="input-max-temp"
                  type="number"
                  step="0.5"
                  min="22"
                  max="30"
                  value={maxTemp}
                  onChange={(e) => setMaxTemp(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-xs"
                  required
                />
              </div>
            </div>
            <div className="mt-2.5 flex items-start space-x-2 text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span><strong>Comfort Guarantee:</strong> The AI recommendation engine will never suggest HVAC throttling if zone temperature is outside this envelope.</span>
            </div>
          </div>

          {/* Operating Hours */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Core Business Operating Hours (24h)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Start Hour</label>
                <input
                  id="input-start-hour"
                  type="number"
                  min="0"
                  max="23"
                  value={startHour}
                  onChange={(e) => setStartHour(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">End Hour</label>
                <input
                  id="input-end-hour"
                  type="number"
                  min="0"
                  max="23"
                  value={endHour}
                  onChange={(e) => setEndHour(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
                  required
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition shadow-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-save-tariff-settings"
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>{isSaving ? 'Saving...' : 'Apply Guardrails'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
