import React, { useState } from 'react';
import { cartoService, CartoExecutionResult, DEFAULT_CARTO_CONFIG } from '../services/cartoService';
import { soundFx } from '../utils/audio';
import { 
  Database, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  X, 
  Layers, 
  Key, 
  Clock, 
  Zap, 
  Copy, 
  Check,
  RotateCcw,
  Save
} from 'lucide-react';

interface CartoModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export const CartoModal: React.FC<CartoModalProps> = ({ isOpen, onClose, isDarkMode }) => {
  const [config, setConfig] = useState(cartoService.getConfig());
  const [queryInput, setQueryInput] = useState(config.defaultQuery);
  const [tokenInput, setTokenInput] = useState(config.token);
  const [basemapsKeyInput, setBasemapsKeyInput] = useState(config.basemapsApiKey);
  const [apiUrlInput, setApiUrlInput] = useState(config.apiUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<CartoExecutionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sync' | 'config' | 'response'>('sync');

  if (!isOpen) return null;

  const handleRunSync = async () => {
    setIsLoading(true);
    soundFx.playClick();
    
    // Save updated config first
    cartoService.setConfig({
      token: tokenInput,
      defaultQuery: queryInput,
      basemapsApiKey: basemapsKeyInput,
      apiUrl: apiUrlInput
    });

    const result = await cartoService.executeWorkflow(queryInput);
    setLastResult(result);
    setIsLoading(false);

    if (result.success) {
      soundFx.playSuccess();
    } else {
      soundFx.playCautionAlert();
    }
  };

  const handleSaveConfig = () => {
    cartoService.setConfig({
      token: tokenInput,
      defaultQuery: queryInput,
      basemapsApiKey: basemapsKeyInput,
      apiUrl: apiUrlInput
    });
    soundFx.playSuccess();
    setSaveStatus('All CARTO API keys & configuration saved persistently!');
    setTimeout(() => setSaveStatus(null), 3500);
  };

  const handleResetDefaults = () => {
    cartoService.resetToDefaults();
    const def = cartoService.getConfig();
    setConfig(def);
    setQueryInput(def.defaultQuery);
    setTokenInput(def.token);
    setBasemapsKeyInput(def.basemapsApiKey);
    setApiUrlInput(def.apiUrl);
    soundFx.playClick();
    setSaveStatus('Reset to environment defaults.');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleCopyResponse = () => {
    if (!lastResult) return;
    navigator.clipboard.writeText(JSON.stringify(lastResult, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
        isDarkMode 
          ? 'bg-[#080D1A] border-cyan-500/30 text-slate-100' 
          : 'bg-white border-slate-300 text-slate-900 shadow-2xl'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDarkMode ? 'bg-cyan-950/30 border-cyan-500/20' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-base tracking-wide">CARTO Data Warehouse API Hub</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Persistent Storage Active
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Execute cloud workflows & synchronize IoT transit data
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`flex border-b px-4 gap-4 text-xs font-mono ${
          isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-100/50'
        }`}>
          <button
            onClick={() => setActiveTab('sync')}
            className={`py-2.5 border-b-2 font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'sync'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Workflow Trigger</span>
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`py-2.5 border-b-2 font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'config'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Persistent API Keys</span>
          </button>
          <button
            onClick={() => setActiveTab('response')}
            className={`py-2.5 border-b-2 font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'response'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Raw Response</span>
            {lastResult && (
              <span className={`w-2 h-2 rounded-full ${lastResult.success ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'sync' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${
                isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-1">
                      Active BigQuery Routine
                    </h3>
                    <code className="text-xs font-mono text-slate-300 break-all bg-black/40 px-2 py-1 rounded block mt-1">
                      {queryInput}
                    </code>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Target: CARTO DW (gcp-us-east1 / BigQuery)</span>
                  </div>

                  <button
                    onClick={handleRunSync}
                    disabled={isLoading}
                    className={`px-4 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-lg ${
                      isLoading
                        ? 'bg-cyan-600/50 text-white cursor-wait'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-cyan-500/20'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Executing Routine...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Run CARTO Workflow</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Execution Status Feedback */}
              {lastResult && (
                <div className={`p-4 rounded-xl border ${
                  lastResult.success
                    ? isDarkMode ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : isDarkMode ? 'bg-rose-950/30 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 font-mono font-bold text-xs">
                      {lastResult.success ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>CARTO Job Execution Completed Successfully</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                          <span>CARTO Execution Failed</span>
                        </>
                      )}
                    </div>
                    {lastResult.durationMs !== undefined && (
                      <span className="text-[11px] font-mono opacity-80">
                        {lastResult.durationMs} ms
                      </span>
                    )}
                  </div>

                  {lastResult.data?.meta && (
                    <div className="mt-2 text-xs font-mono space-y-1 opacity-90">
                      <div>Output Table: <span className="font-bold underline">{lastResult.data.meta.workflowOutputTableName || 'N/A'}</span></div>
                      <div>Location: <span className="font-bold">{lastResult.data.meta.location}</span> | Provider: <span className="font-bold">{lastResult.data.meta.providerId}</span></div>
                    </div>
                  )}

                  {lastResult.error && (
                    <div className="mt-2 text-xs font-mono text-rose-300 bg-black/40 p-2 rounded">
                      {lastResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-4 font-mono text-xs">
              {saveStatus && (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{saveStatus}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">CARTO Basemaps API Key (Raster Tiles & Watermark Removal)</label>
                <input
                  type="text"
                  value={basemapsKeyInput}
                  onChange={(e) => setBasemapsKeyInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-slate-700 text-emerald-400 font-bold focus:border-emerald-500 outline-none"
                  placeholder="e.g. cb1_2la0_1_..."
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Persisted locally in .env and localStorage for all CARTO Voyager, Dark Matter, and Positron tile URLs.</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">CARTO SQL API URL</label>
                <input
                  type="text"
                  value={apiUrlInput}
                  onChange={(e) => setApiUrlInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-slate-700 text-slate-300 focus:border-cyan-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Authorization Token (Bearer JWT)</label>
                <textarea
                  rows={2}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-slate-700 text-cyan-300 focus:border-cyan-500 outline-none text-[11px]"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">SQL / Procedure Query</label>
                <textarea
                  rows={3}
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-slate-700 text-emerald-300 focus:border-cyan-500 outline-none text-[11px]"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <button
                  onClick={handleResetDefaults}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                  title="Reset to .env defaults"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Defaults</span>
                </button>

                <button
                  onClick={handleSaveConfig}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-emerald-900/30"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'response' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Latest API Response Payload</span>
                {lastResult && (
                  <button
                    onClick={handleCopyResponse}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                )}
              </div>

              <pre className="p-3 rounded-xl bg-black/70 border border-slate-800 text-[11px] font-mono text-slate-200 overflow-x-auto max-h-[350px]">
                {lastResult ? JSON.stringify(lastResult, null, 2) : '// No CARTO query executed yet. Click "Run CARTO Workflow" in the Workflow Trigger tab.'}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-3 border-t flex items-center justify-between text-xs font-mono ${
          isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>CARTO v3 Engine Online (Persistent)</span>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
