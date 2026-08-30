import React from 'react';
import { SimulationPreset } from '../types/fleet';
import { SIMULATION_PRESETS } from '../data/mockRoutes';
import { soundFx } from '../utils/audio';
import { X, Play, Sliders, CheckCircle2, Radio, Activity, Clock, ShieldAlert } from 'lucide-react';

interface ScenarioControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePreset: SimulationPreset;
  onSelectPreset: (preset: SimulationPreset) => void;
  isDarkMode: boolean;
}

export const ScenarioControlModal: React.FC<ScenarioControlModalProps> = ({
  isOpen,
  onClose,
  activePreset,
  onSelectPreset,
  isDarkMode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-[#05070A]/80 backdrop-blur-md">
      <div
        className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDarkMode
            ? 'bg-[#080B11]/90 border-white/10 text-[#E0E6ED] backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.8)]'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-white">Integrated Simulation Scenarios</h2>
              <p className="text-xs text-slate-400 font-mono">
                Directly modeled from Thesis Chapter 4 (Table 4.6 Integrated Simulation Results)
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scenarios List */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
          {SIMULATION_PRESETS.map((preset) => {
            const isSelected = activePreset.id === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => {
                  soundFx.playClick();
                  onSelectPreset(preset);
                  onClose();
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.25)]'
                    : isDarkMode
                    ? 'bg-white/[0.04] border-white/10 hover:border-white/20 hover:bg-white/[0.07]'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-blue-400">
                      {preset.name}
                    </span>
                    {isSelected && (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-blue-500 text-white flex items-center gap-1 shadow-sm">
                        <CheckCircle2 className="w-3 h-3" />
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold self-start sm:self-auto ${
                    preset.fatigueRiskLevel === 'EXTREME' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                    preset.fatigueRiskLevel === 'HIGH' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' :
                    'bg-green-500/20 text-green-300 border border-green-500/40'
                  }`}>
                    Fatigue Risk: {preset.fatigueRiskLevel}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                  {preset.description}
                </p>

                {/* Benchmark Metrics from Research Table */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                    <div className="text-[10px] text-slate-400">Fleet Size</div>
                    <div className="text-slate-100 font-bold">{preset.busCount} Buses</div>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                    <div className="text-[10px] text-slate-400">Route Dist</div>
                    <div className="text-slate-100 font-bold">{preset.routeLengthKm} km</div>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                    <div className="text-[10px] text-slate-400">GSM Coverage</div>
                    <div className="text-cyan-300 font-bold">{preset.gsmCoveragePercent}%</div>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                    <div className="text-[10px] text-slate-400">Modeled PDR</div>
                    <div className="text-green-400 font-bold">{preset.modelPdr}%</div>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                    <div className="text-[10px] text-slate-400">LoRa Rescue</div>
                    <div className="text-yellow-300 font-bold">{preset.loraRescuePercent}%</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className={`p-3.5 border-t text-xs font-mono flex items-center justify-between ${
          isDarkMode ? 'border-white/10 bg-white/[0.02] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}>
          <span>Clicking any scenario instantly generates mock buses & route conditions</span>
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-slate-200 font-mono text-xs rounded-lg border border-white/10 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
