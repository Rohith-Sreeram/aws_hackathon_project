import React, { useState } from 'react';
import {
  Code2,
  Play,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Cpu,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { predictEnergyApi, detectAnomalyApi, analyzeFullBuildingApi } from '../services/api.ts';

export const ModelApiTab: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<'energy' | 'anomaly' | 'analyze'>('energy');
  const [isLoading, setIsLoading] = useState(false);
  const [responseJson, setResponseJson] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Default Request Payloads
  const [energyPayload, setEnergyPayload] = useState<string>(
    JSON.stringify(
      {
        reading: {
          floor_id: 'floor-2',
          zone_id: 'zone-201',
          zone_type: 'office',
          area_sqm: 400,
          temperature: 22.5,
          humidity: 48,
          presence: 1,
          outdoor_temp: 26.0,
        },
        hourOfDay: 14,
        dayOfWeek: 2,
      },
      null,
      2
    )
  );

  const [anomalyPayload, setAnomalyPayload] = useState<string>(
    JSON.stringify(
      {
        actual_energy: 45.0,
        expected_energy: 22.0,
        reading: {
          zone_type: 'office',
          temperature: 22.5,
          presence: 0,
          hvac_power: 12.0,
          lighting_power: 3.5,
          equipment_power: 29.5,
        },
      },
      null,
      2
    )
  );

  const [analyzePayload, setAnalyzePayload] = useState<string>(
    JSON.stringify(
      {
        outdoor_temp: 28.0,
      },
      null,
      2
    )
  );

  const handleTestApi = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setResponseJson(null);

    try {
      let result;
      if (selectedEndpoint === 'energy') {
        const parsed = JSON.parse(energyPayload);
        result = await predictEnergyApi(parsed);
      } else if (selectedEndpoint === 'anomaly') {
        const parsed = JSON.parse(anomalyPayload);
        result = await detectAnomalyApi(parsed);
      } else {
        const parsed = JSON.parse(analyzePayload);
        result = await analyzeFullBuildingApi(parsed);
      }
      setResponseJson(JSON.stringify(result, null, 2));
    } catch (err: any) {
      setErrorMsg(err.message || 'API Execution Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (responseJson) {
      navigator.clipboard.writeText(responseJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Architecture Banner */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center space-x-2 text-emerald-700">
          <Code2 className="w-5 h-5" />
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Programmer Model Integration Layer & API Sandbox
          </h2>
        </div>
        <p className="text-xs text-slate-500 max-w-4xl font-medium">
          The machine learning inference architecture is decoupled from UI presentation. Models are executed as pure functional pipelines ({' '}
          <code className="text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded font-mono font-semibold">predictEnergyModel</code> &{' '}
          <code className="text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded font-mono font-semibold">detectAnomalyModel</code> in{' '}
          <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono font-semibold">/server/models.ts</code>), enabling engineers to connect external ONNX, PyTorch, or FastAPI endpoints with zero UI code refactoring.
        </p>
      </div>

      {/* Model Spec Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-sky-700">
            <span className="text-xs font-bold uppercase tracking-wider">1. Energy Forecasting Model</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-600 font-medium">
            Multivariate regression integrating diurnal solar loads, zone baseline profiles, occupancy coupling, and outside weather degree days.
          </p>
          <div className="text-[11px] text-slate-500 font-mono">Output: predicted_energy, expected_energy (kW)</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider">2. Anomaly Scoring Model</span>
            <Cpu className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-600 font-medium">
            Composite residual isolation algorithm generating continuous 0.00 - 1.00 risk scores and severity classifications.
          </p>
          <div className="text-[11px] text-slate-500 font-mono">Output: anomaly_status, anomaly_score, root_cause</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold uppercase tracking-wider">3. Comfort Guardrail Engine</span>
            <Layers className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-600 font-medium">
            Rule-based constraint engine checking min/max comfort temperatures (20°C - 25.5°C) and critical zone safety before emitting recommendations.
          </p>
          <div className="text-[11px] text-slate-500 font-mono">Output: comfort_checks (passed: bool)</div>
        </div>
      </div>

      {/* Interactive API Tester Console */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
        {/* Endpoint Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">Target Endpoint:</span>
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setSelectedEndpoint('energy')}
                className={`px-3 py-1 rounded text-xs font-mono font-semibold transition cursor-pointer ${
                  selectedEndpoint === 'energy'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                POST /api/predict/energy
              </button>
              <button
                onClick={() => setSelectedEndpoint('anomaly')}
                className={`px-3 py-1 rounded text-xs font-mono font-semibold transition cursor-pointer ${
                  selectedEndpoint === 'anomaly'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                POST /api/predict/anomaly
              </button>
              <button
                onClick={() => setSelectedEndpoint('analyze')}
                className={`px-3 py-1 rounded text-xs font-mono font-semibold transition cursor-pointer ${
                  selectedEndpoint === 'analyze'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                POST /api/analyze
              </button>
            </div>
          </div>

          <button
            onClick={handleTestApi}
            disabled={isLoading}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isLoading ? 'Executing Inference...' : 'Send Request'}</span>
          </button>
        </div>

        {/* Request & Response Split Screen */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Request Payload Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Request Body (JSON):</span>
              <span className="font-mono text-[11px] text-slate-400">application/json</span>
            </div>
            <textarea
              rows={14}
              value={
                selectedEndpoint === 'energy'
                  ? energyPayload
                  : selectedEndpoint === 'anomaly'
                  ? anomalyPayload
                  : analyzePayload
              }
              onChange={(e) => {
                if (selectedEndpoint === 'energy') setEnergyPayload(e.target.value);
                else if (selectedEndpoint === 'anomaly') setAnomalyPayload(e.target.value);
                else setAnalyzePayload(e.target.value);
              }}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
            />
          </div>

          {/* Response Inspector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Model Inference Response:</span>
              {responseJson && (
                <button
                  onClick={handleCopy}
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              )}
            </div>

            {errorMsg ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs font-mono text-rose-700 h-[290px] overflow-y-auto">
                <AlertCircle className="w-4 h-4 text-rose-600 mb-1" />
                {errorMsg}
              </div>
            ) : responseJson ? (
              <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-emerald-300 h-[290px] overflow-y-auto">
                {responseJson}
              </pre>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 border border-slate-200 rounded-lg h-[290px] flex flex-col items-center justify-center space-y-2">
                <Code2 className="w-6 h-6 text-slate-400" />
                <span>Click "Send Request" to trigger model inference and inspect JSON output.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
