import React from 'react';
import { SimulationPreset } from '../types/fleet';
import { soundFx } from '../utils/audio';
import {
  Radio,
  Play,
  Pause,
  Sun,
  Moon,
  Bell,
  Sliders,
  FileText,
  Download,
  DownloadCloud,
  Volume2,
  VolumeX,
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
  isMqttConnected?: boolean;
  liveMqttPackets?: number;
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
  isMqttConnected = false,
  liveMqttPackets = 0,
}) => {
  return (
    <header
      id="main-app-header"
      className={`border-b px-4 py-3 sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 transition-colors duration-300 ${
        isDarkMode
          ? 'bg-[#05070A]/85 border-white/10 text-[#E0E6ED] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]'
          : 'bg-white/95 border-slate-200 text-slate-900 backdrop-blur-xl shadow-xs'
      }`}
    >
      {/* Brand Identity & MQTT Heartbeat */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-blue-400/40">
          <Radio className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-500 bg-clip-text text-transparent">
              TransitGuard
            </h1>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border hidden sm:inline-block ${
              isDarkMode 
                ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' 
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              OPERATOR HUB
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold transition-all ${
              isMqttConnected
                ? isDarkMode
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                : isDarkMode
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-amber-50 border-amber-300 text-amber-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isMqttConnected ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`}></span>
              <span>
                {liveMqttPackets > 0 
                  ? `MQTT LIVE (${liveMqttPackets} pkts)` 
                  : isMqttConnected 
                  ? 'MQTT BROKER LIVE' 
                  : 'MQTT READY'}
              </span>
            </div>
            <span className="text-slate-400">•</span>
            <span className={`hidden md:inline font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Multi-Hub LoRa/GSM Rescue Active
            </span>
          </div>
        </div>
      </div>

      {/* Center: Real-Time Simulation Engine Controls */}
      <div className={`flex items-center gap-1.5 p-1 rounded-xl border font-mono text-xs shadow-xs ${
        isDarkMode ? 'bg-white/[0.04] border-white/10 backdrop-blur-md' : 'bg-slate-100/90 border-slate-200'
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
              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm'
              : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'
          }`}
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isRunning ? 'Pause Sim' : 'Run Sim'}</span>
        </button>

        {/* Speed Multiplier */}
        <div className={`flex items-center border-l pl-1.5 gap-1 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
          {[1, 2, 5].map((speed) => (
            <button
              key={speed}
              onClick={() => {
                soundFx.playClick();
                onSetSpeed(speed);
              }}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                speedMultiplier === speed
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
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
          className={`ml-1 py-1.5 px-2.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors border ${
            isDarkMode 
              ? 'bg-white/5 hover:bg-white/10 text-cyan-300 border-white/10' 
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-blue-500" />
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
            className="py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-900/30 animate-pulse"
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
          className={`p-2 rounded-lg border transition-colors flex items-center gap-1.5 text-xs font-mono font-semibold shadow-xs ${
            isDarkMode 
              ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30' 
              : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-200'
          }`}
        >
          <Database className="w-4 h-4 text-cyan-500" />
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
          className={`p-2 rounded-lg border transition-colors flex items-center gap-1.5 text-xs font-mono font-semibold shadow-xs ${
            isDarkMode 
              ? 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-300 border-white/10' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-500" />
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
          className={`p-2 rounded-lg border transition-colors shadow-xs ${
            isDarkMode 
              ? 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200'
          }`}
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
          className={`p-2 rounded-lg border transition-colors shadow-xs ${
            isMuted
              ? isDarkMode ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
              : isDarkMode ? 'bg-blue-500/15 border-blue-500/30 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'
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
          className={`p-2 rounded-lg border transition-colors shadow-xs ${
            isDarkMode 
              ? 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10' 
              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
          }`}
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
          className={`relative p-2 rounded-lg border flex items-center gap-1.5 text-xs font-mono font-bold transition-all shadow-xs ${
            unacknowledgedAlertsCount > 0
              ? isDarkMode 
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 animate-pulse' 
                : 'bg-rose-100 border-rose-300 text-rose-800 animate-pulse'
              : isDarkMode 
              ? 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10' 
              : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Bell className="w-4 h-4 text-rose-500" />
          <span className="hidden sm:inline">ALERTS</span>
          {unacknowledgedAlertsCount > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-mono leading-tight">
              {unacknowledgedAlertsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
