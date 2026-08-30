import React, { useState, useEffect, useCallback } from 'react';
import { BusVehicle, AlertIncident, SimulationPreset } from './types/fleet';
import { simulationEngine } from './services/simulationEngine';
import { soundFx } from './utils/audio';
import { Header } from './components/Header';
import { FleetStatsBar } from './components/FleetStatsBar';
import { MapView } from './components/MapView';
import { BusDetailPanel } from './components/BusDetailPanel';
import { FleetListSidebar } from './components/FleetListSidebar';
import { ScenarioControlModal } from './components/ScenarioControlModal';
import { AlertNotificationCenter } from './components/AlertNotificationCenter';
import { AssumptionsModal } from './components/AssumptionsModal';
import { ExportTelemetryModal } from './components/ExportTelemetryModal';
import { CartoModal } from './components/CartoModal';

export default function App() {
  const [buses, setBuses] = useState<BusVehicle[]>([]);
  const [alerts, setAlerts] = useState<AlertIncident[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [activePreset, setActivePreset] = useState<SimulationPreset>(simulationEngine.getActivePreset());

  // Visual & HUD states
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showMeshLines, setShowMeshLines] = useState<boolean>(true);
  const [showDeadzones, setShowDeadzones] = useState<boolean>(true);
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Modals
  const [isPresetsOpen, setIsPresetsOpen] = useState<boolean>(false);
  const [isAssumptionsOpen, setIsAssumptionsOpen] = useState<boolean>(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isCartoOpen, setIsCartoOpen] = useState<boolean>(false);

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstallPwa, setCanInstallPwa] = useState<boolean>(false);

  // PWA Service Worker Registration & Install Event
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('TransitGuard ServiceWorker registered'))
        .catch((err) => console.log('ServiceWorker registration error:', err));
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPwa(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstallPwa(false);
    }
    setDeferredPrompt(null);
  };

  // Initialize Simulation Engine & Updates listener
  useEffect(() => {
    simulationEngine.setUpdateListener((updatedBuses, updatedAlerts) => {
      setBuses([...updatedBuses]);
      setAlerts([...updatedAlerts]);
    });

    simulationEngine.start();

    return () => {
      simulationEngine.pause();
    };
  }, []);

  // Handle Play/Pause
  const handleTogglePlay = () => {
    if (isRunning) {
      simulationEngine.pause();
      setIsRunning(false);
    } else {
      simulationEngine.start();
      setIsRunning(true);
    }
  };

  // Handle Speed Change
  const handleSetSpeed = (speed: number) => {
    setSpeedMultiplier(speed);
    simulationEngine.setSpeedMultiplier(speed);
  };

  // Handle Preset Change
  const handleSelectPreset = (preset: SimulationPreset) => {
    setActivePreset(preset);
    simulationEngine.initPreset(preset);
    setSelectedBusId(null);
  };

  // Theme Toggle
  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Find selected bus
  const selectedBus = buses.find((b) => b.id === selectedBusId) || null;
  const unacknowledgedAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div
      id="transitguard-app-root"
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
        isDarkMode ? 'bg-[#05070A] text-[#E0E6ED] bg-frosted-dots' : 'bg-slate-100 text-slate-900 bg-frosted-dots-light'
      }`}
    >
      {/* Top Application Header & Live Simulation Toolbar */}
      <Header
        isRunning={isRunning}
        onTogglePlay={handleTogglePlay}
        speedMultiplier={speedMultiplier}
        onSetSpeed={handleSetSpeed}
        activePreset={activePreset}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenAssumptions={() => setIsAssumptionsOpen(true)}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        unacknowledgedAlertsCount={unacknowledgedAlertsCount}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted((prev) => !prev)}
        canInstallPwa={canInstallPwa}
        onInstallPwa={handleInstallPwa}
        onOpenCarto={() => setIsCartoOpen(true)}
      />

      {/* Main Operator Dashboard Workspace */}
      <main className="flex-1 p-3 sm:p-4 flex flex-col gap-3 max-w-[1920px] w-full mx-auto">
        {/* Top Fleet KPI Telemetry Bar */}
        <FleetStatsBar buses={buses} isDarkMode={isDarkMode} />

        {/* Geospatial Map + Side Fleet Roster Layout */}
        <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-[520px]">
          {/* Collapsible Fleet Roster Sidebar */}
          <FleetListSidebar
            buses={buses}
            selectedBusId={selectedBusId}
            onSelectBus={(id) => setSelectedBusId(id)}
            isDarkMode={isDarkMode}
            isOpen={isSidebarOpen}
            onToggleOpen={() => setIsSidebarOpen((prev) => !prev)}
          />

          {/* Interactive Leaflet Map View */}
          <div className="flex-1 flex flex-col min-h-[460px]">
            <MapView
              buses={buses}
              selectedBusId={selectedBusId}
              onSelectBus={(id) => setSelectedBusId(id)}
              isDarkMode={isDarkMode}
              showMeshLines={showMeshLines}
              setShowMeshLines={setShowMeshLines}
              showDeadzones={showDeadzones}
              setShowDeadzones={setShowDeadzones}
              showRoutes={showRoutes}
              setShowRoutes={setShowRoutes}
              onOpenCartoModal={() => setIsCartoOpen(true)}
            />
          </div>
        </div>
      </main>

      {/* Bottom Frosted Operational Status Bar */}
      <footer
        id="frosted-status-bar"
        className={`h-9 px-4 border-t flex items-center justify-between text-[11px] font-mono select-none ${
          isDarkMode
            ? 'bg-black/40 backdrop-blur-md border-white/10 text-slate-400'
            : 'bg-white/70 backdrop-blur-md border-slate-200 text-slate-600'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            SYS NORMAL
          </span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="hidden sm:inline">LoRa Store-and-Forward Mesh: <strong className="text-cyan-400">ONLINE</strong></span>
          <span className="text-slate-600 hidden md:inline">|</span>
          <span className="hidden md:inline">MediaPipe Vision Pipeline: <strong className="text-slate-200">30 FPS</strong></span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-slate-500">PDR Target: 98.6%</span>
          <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold">
            FUT MINNA IOT-CORE
          </span>
        </div>
      </footer>

      {/* Slide-In Deep Vehicle & Driver Telemetry Drawer */}
      <BusDetailPanel
        bus={selectedBus}
        onClose={() => setSelectedBusId(null)}
        isDarkMode={isDarkMode}
      />

      {/* 5 Integrated Simulation Scenarios Modal (from Chapter 4) */}
      <ScenarioControlModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        activePreset={activePreset}
        onSelectPreset={handleSelectPreset}
        isDarkMode={isDarkMode}
      />

      {/* Real-Time Safety Incidents & Alerts Center */}
      <AlertNotificationCenter
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        onSelectBus={(id) => setSelectedBusId(id)}
        isDarkMode={isDarkMode}
      />

      {/* Research Methodology & Thresholds Reference Modal */}
      <AssumptionsModal
        isOpen={isAssumptionsOpen}
        onClose={() => setIsAssumptionsOpen(false)}
        isDarkMode={isDarkMode}
      />

      {/* Export Telemetry Logs Modal */}
      <ExportTelemetryModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        buses={buses}
        alerts={alerts}
        isDarkMode={isDarkMode}
      />

      {/* CARTO Data Warehouse API Hub Modal */}
      <CartoModal
        isOpen={isCartoOpen}
        onClose={() => setIsCartoOpen(false)}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
