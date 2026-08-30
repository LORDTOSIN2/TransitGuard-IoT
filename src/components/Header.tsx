import React from 'react';
import { SimulationPreset } from '../types/fleet';
import { soundFx } from '../utils/audio';
import {
  Radio,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Bell,
  Sliders,
  FileText,
  Download,
  DownloadCloud,
  CheckCircle2,
  Sparkles,
  Database
} from 'lucide-react';

interface HeaderProps {
  isRunning: boolean;
  onTogglePlay: () => void;
  speedMultiplier: number;
  onSetSpeed: (speed: number) => void;
  activePreset: SimulationPreset;
  onOpenPresets: () => void;
  onOpenAssumptions: () => void;
  onOpenAlerts: () => void;
  onOpenExport: () => void;
  unacknowledgedAlertsCount: number;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  canInstallPwa: boolean;
  onInstallPwa: () => void;
  onOpenCarto: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isRunning,
  onTogglePlay,
  speedMultiplier,
  onSetSpeed,
  activePreset,
  onOpenPresets,
  onOpenAssumptions,
  onOpenAlerts,
  onOpenExport,
  unacknowledgedAlertsCount,
  isDarkMode,
  onToggleTheme,
  isMuted,
  onToggleMute,
  canInstallPwa,
  onInstallPwa,
  onOpenCarto,
}) => {
  return (
    <header
      id="main-app-header"
      className={`border-b px-4 py-3 sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 ${
        isDarkMode
          ? 'bg-white/[0.04] border-white/10 text-[#E0E6ED] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]'
          : 'bg-white/80 border-slate-200 text-slate-900 backdrop-blur-xl shadow-sm'
      }`}
    >
      {/* Brand Identity & MQTT Heartbeat */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-blue-400/40">
          <Radio className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-300 bg-clip-text text-transparent">
              TransitGuard
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 hidden sm:inline-block">
              FROSTED OPERATOR HUB
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 font-semibold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping"></span>
              <span>MQTT LIVE</span>
            </div>
            <span>•</span>
            <span className="hidden md:inline text-slate-300">Multi-Hub LoRa/GSM Rescue Active</span>
          </div>
        </div>
      </div>

      {/* Center: Real-Time Simulation Engine Controls */}
      <div className={`flex items-center gap-1.5 p-1 rounded-xl border font-mono text-xs ${
        isDarkMode ? 'bg-white/[0.04] border-white/10 backdrop-blur-md' : 'bg-slate-100 border-slate-200'
      }`}>
        {/* Play/Pause Button */}
        <button
          id="toggle-simulation-btn"
          onClick={() => {
            soundFx.playClick();
            onTogglePlay();
          }}
          className={`py-1.5 px-3 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
            isRunning
              ? 'bg-amber-500/90 text-slate-950 hover:bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
              : 'bg-emerald-600/90 text-white hover:bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
          }`}
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isRunning ? 'Pause Sim' : 'Run Simulation'}</span>
        </button>

        {/* Speed Multiplier */}
        <div className="flex items-center border-l border-white/10 pl-1.5 gap-1">
          {[1, 2, 5].map((speed) => (
            <button
              key={speed}
              onClick={() => {
                soundFx.playClick();
                onSetSpeed(speed);
              }}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                speedMultiplier === speed
                  ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Preset Selector Trigger */}
        <button
          id="open-scenario-presets-btn"
          onClick={() => {
            soundFx.playClick();
            onOpenPresets();
          }}
          className="ml-1 py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 font-semibold flex items-center gap-1.5 transition-colors border border-white/10"
        >
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          <span className="max-w-[130px] truncate hidden sm:inline">{activePreset.name}</span>
          <span className="sm:hidden">Preset</span>
        </button>
      </div>

      {/* Right: Actions, Alerts, Audio, PWA Install, Theme */}
      <div className="flex items-center gap-2">
        {/* PWA Install Button */}
        {canInstallPwa && (
          <button
            id="pwa-install-btn"
            onClick={onInstallPwa}
            className="py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-900/30 animate-pulse"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Install PWA</span>
          </button>
        )}

        {/* CARTO Data Warehouse API Hub */}
        <button
          id="open-carto-hub-btn"
          onClick={() => {
            soundFx.playClick();
            onOpenCarto();
          }}
          title="CARTO Data Warehouse & Cloud Workflow Hub"
          className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors flex items-center gap-1.5 text-xs font-mono"
        >
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="hidden xl:inline">CARTO DW</span>
        </button>

        {/* Research Paper Assumptions Reference */}
        <button
          id="open-assumptions-modal-btn"
          onClick={() => {
            soundFx.playClick();
            onOpenAssumptions();
          }}
          title="Project Methodology & Research Thresholds"
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-300 border border-white/10 transition-colors flex items-center gap-1.5 text-xs font-mono"
        >
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="hidden xl:inline">Research Specs</span>
        </button>

        {/* Export Telemetry */}
        <button
          id="open-export-modal-btn"
          onClick={() => {
            soundFx.playClick();
            onOpenExport();
          }}
          title="Export Telemetry Log"
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Sound Toggle */}
        <button
          id="toggle-audio-mute-btn"
          onClick={() => {
            soundFx.setMuted(!isMuted);
            onToggleMute();
          }}
          title={isMuted ? 'Unmute Dispatch Sounds' : 'Mute Sounds'}
          className={`p-2 rounded-lg border transition-colors ${
            isMuted
              ? 'bg-white/5 border-white/5 text-slate-500'
              : 'bg-blue-500/15 border-blue-500/30 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Dark / Light Mode Toggle */}
        <button
          id="toggle-theme-mode-btn"
          onClick={() => {
            soundFx.playClick();
            onToggleTheme();
          }}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* Incident Alerts Drawer Trigger */}
        <button
          id="open-alerts-feed-btn"
          onClick={() => {
            soundFx.playClick();
            onOpenAlerts();
          }}
          className={`relative p-2 rounded-lg border flex items-center gap-1.5 text-xs font-mono font-bold transition-all ${
            unacknowledgedAlertsCount > 0
              ? 'bg-red-500/15 border-red-500/40 text-red-300 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]'
              : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <Bell className="w-4 h-4 text-red-400" />
          <span className="hidden sm:inline">ALERTS</span>
          {unacknowledgedAlertsCount > 0 && (
            <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px] font-mono leading-tight">
              {unacknowledgedAlertsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
