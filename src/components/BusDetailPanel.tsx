import React, { useState } from 'react';
import { BusVehicle, LoRaSpreadingFactor } from '../types/fleet';
import { SF_AIRTIME_MAP, simulationEngine } from '../services/simulationEngine';
import { soundFx } from '../utils/audio';
import {
  X,
  Radio,
  Wifi,
  Activity,
  AlertTriangle,
  Battery,
  Cpu,
  Thermometer,
  Eye,
  Smile,
  Compass,
  Zap,
  Volume2,
  Bell,
  CheckCircle2,
  RefreshCw,
  Clock,
  Navigation2,
  Layers,
  Send,
  Sliders,
  Info
} from 'lucide-react';

interface BusDetailPanelProps {
  bus: BusVehicle | null;
  onClose: () => void;
  isDarkMode: boolean;
}

export const BusDetailPanel: React.FC<BusDetailPanelProps> = ({ bus, onClose, isDarkMode }) => {
  if (!bus) return null;

  const [activeTab, setActiveTab] = useState<'DRIVER' | 'TELEMETRY' | 'COMMS' | 'DISPATCH'>('DRIVER');
  const [customLcdText, setCustomLcdText] = useState('PULL OVER SOON');

  const isCritical = bus.status === 'CRITICAL_FATIGUE' || bus.status === 'ALCOHOL_ALERT';
  const isDrowsy = bus.status === 'DROWSY' || bus.status === 'CAUTION';
  const isRescued = bus.telemetry.mode === 'LORA_RESCUE';

  const sfInfo = SF_AIRTIME_MAP[bus.telemetry.spreadingFactor];

  const handleTriggerMicrosleep = () => {
    simulationEngine.triggerMicrosleep(bus.id);
  };

  const handleTriggerAlcohol = () => {
    simulationEngine.triggerAlcoholAlert(bus.id);
  };

  const handleTriggerYawn = () => {
    simulationEngine.triggerYawn(bus.id);
  };

  const handleResetState = () => {
    simulationEngine.resetDriverState(bus.id);
  };

  const handleDispatchBuzzer = () => {
    simulationEngine.dispatchInCabinBuzzer(bus.id);
  };

  const handleSendLcd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLcdText.trim()) return;
    simulationEngine.sendLcdMessage(bus.id, customLcdText);
  };

  const handleSfChange = (sf: LoRaSpreadingFactor) => {
    simulationEngine.setSpreadingFactor(bus.id, sf);
  };

  return (
    <div
      id="bus-detail-panel"
      className={`fixed inset-y-0 right-0 z-[500] w-full sm:w-[480px] lg:w-[540px] shadow-2xl flex flex-col transition-all duration-300 border-l ${
        isDarkMode
          ? 'bg-[#080B11]/90 border-white/10 text-[#E0E6ED] backdrop-blur-2xl shadow-[-16px_0_40px_rgba(0,0,0,0.6)]'
          : 'bg-white/95 border-slate-200 text-slate-900 backdrop-blur-2xl'
      }`}
    >
      {/* Panel Header */}
      <div className={`p-4 border-b flex items-center justify-between ${
        isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-base border shadow-md ${
            isCritical ? 'bg-red-500/20 text-red-300 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.3)]' :
            isDrowsy ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50 shadow-[0_0_12px_rgba(234,179,8,0.3)]' :
            'bg-blue-600/20 text-cyan-300 border-blue-400/40 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
          }`}>
            {bus.id.replace('BUS-', '')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-mono tracking-tight text-white">{bus.plateNumber}</h2>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                isCritical ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                isDrowsy ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
                'bg-green-500/20 text-green-300 border-green-500/40'
              }`}>
                {bus.status.replace('_', ' ')}
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              Route: <span className="text-slate-200">{bus.routeName}</span>
            </div>
          </div>
        </div>

        <button
          id="close-bus-panel-btn"
          onClick={() => {
            soundFx.playClick();
            onClose();
          }}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className={`flex border-b text-xs font-mono font-semibold ${
        isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-100/50'
      }`}>
        <button
          id="tab-driver-monitor"
          onClick={() => {
            soundFx.playClick();
            setActiveTab('DRIVER');
          }}
          className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'DRIVER'
              ? 'border-blue-400 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>DRIVER AI</span>
        </button>

        <button
          id="tab-comms-link"
          onClick={() => {
            soundFx.playClick();
            setActiveTab('COMMS');
          }}
          className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'COMMS'
              ? 'border-blue-400 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>MULTI-HUB</span>
        </button>

        <button
          id="tab-vehicle-telemetry"
          onClick={() => {
            soundFx.playClick();
            setActiveTab('TELEMETRY');
          }}
          className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'TELEMETRY'
              ? 'border-blue-400 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>TELEMETRY</span>
        </button>

        <button
          id="tab-dispatch-actions"
          onClick={() => {
            soundFx.playClick();
            setActiveTab('DISPATCH');
          }}
          className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'DISPATCH'
              ? 'border-blue-400 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>DISPATCH</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ================= TAB 1: DRIVER MONITORING ================= */}
        {activeTab === 'DRIVER' && (
          <div className="space-y-4">
            {/* Driver Profile Card */}
            <div className={`p-3 rounded-xl border flex items-center gap-3.5 ${
              isDarkMode ? 'bg-white/[0.04] border-white/10 backdrop-blur-md' : 'bg-slate-50 border-slate-200'
            }`}>
              <img
                src={bus.driverPhotoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                alt={bus.driverName}
                className="w-12 h-12 rounded-xl object-cover border border-blue-400/40 shadow"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-400 font-mono">Assigned Operator</div>
                <div className="text-sm font-bold text-slate-100 truncate">{bus.driverName}</div>
                <div className="text-[11px] font-mono text-cyan-400 mt-0.5">ID: {bus.driverId} • Shift: 4.2 hrs</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Alert Status</div>
                <span className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                  isCritical ? 'bg-red-500 text-slate-950 animate-pulse' :
                  isDrowsy ? 'bg-yellow-500 text-slate-950' :
                  'bg-green-500/20 text-green-300'
                }`}>
                  {bus.biometrics.driverState}
                </span>
              </div>
            </div>

            {/* In-Cabin MediaPipe Camera HUD Mockup */}
            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/60 aspect-video shadow-inner flex flex-col justify-between p-3">
              {/* Background gradient simulating cabin camera */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

              {/* Simulated MediaPipe facial landmarks overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg className="w-48 h-48 opacity-70" viewBox="0 0 200 200">
                  {/* Face contour */}
                  <ellipse cx="100" cy="100" rx="60" ry="75" fill="none" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="3, 3" />
                  
                  {/* Eyes landmark points */}
                  <ellipse cx="78" cy="88" rx="14" ry={bus.biometrics.ear < 0.20 ? 2 : 7} fill="none" stroke={bus.biometrics.ear < 0.20 ? '#ef4444' : '#38bdf8'} strokeWidth="1.8" />
                  <circle cx="78" cy="88" r={bus.biometrics.ear < 0.20 ? 1 : 3} fill={bus.biometrics.ear < 0.20 ? '#ef4444' : '#60a5fa'} />
                  
                  <ellipse cx="122" cy="88" rx="14" ry={bus.biometrics.ear < 0.20 ? 2 : 7} fill="none" stroke={bus.biometrics.ear < 0.20 ? '#ef4444' : '#38bdf8'} strokeWidth="1.8" />
                  <circle cx="122" cy="88" r={bus.biometrics.ear < 0.20 ? 1 : 3} fill={bus.biometrics.ear < 0.20 ? '#ef4444' : '#60a5fa'} />

                  {/* Mouth landmark points */}
                  <ellipse cx="100" cy="135" rx="18" ry={bus.biometrics.mar > 0.65 ? 16 : 6} fill="none" stroke={bus.biometrics.mar > 0.65 ? '#eab308' : '#38bdf8'} strokeWidth="1.8" />
                  
                  {/* 3D Head Pose Direction Vector */}
                  <line 
                    x1="100" 
                    y1="100" 
                    x2={100 + bus.biometrics.headYaw * 1.5} 
                    y2={100 + bus.biometrics.headPitch * 1.8} 
                    stroke="#facc15" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                  />
                  <circle cx={100 + bus.biometrics.headYaw * 1.5} cy={100 + bus.biometrics.headPitch * 1.8} r="4" fill="#facc15" />
                </svg>
              </div>

              {/* Top Camera HUD Bar */}
              <div className="relative z-10 flex items-center justify-between text-[10px] font-mono">
                <div className="flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded border border-white/10 text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping"></span>
                  <span>CAM-01 • MEDIAPIPE FACE MESH 30 FPS</span>
                </div>
                <div className="bg-black/60 px-2 py-0.5 rounded border border-white/10 text-cyan-300">
                  640×480 RAW
                </div>
              </div>

              {/* Bottom Camera Live Indicators */}
              <div className="relative z-10 flex items-center justify-between text-[11px] font-mono">
                <div className="bg-black/70 px-2 py-1 rounded border border-white/10">
                  <span className="text-slate-400">EAR: </span>
                  <span className={`font-bold ${bus.biometrics.ear < 0.20 ? 'text-red-400' : 'text-cyan-300'}`}>
                    {bus.biometrics.ear.toFixed(3)}
                  </span>
                  <span className="text-slate-500 text-[9px] ml-1">(Thresh: 0.25)</span>
                </div>

                <div className="bg-black/70 px-2 py-1 rounded border border-white/10">
                  <span className="text-slate-400">PERCLOS: </span>
                  <span className={`font-bold ${bus.biometrics.perclos > 15 ? 'text-red-400' : 'text-green-300'}`}>
                    {bus.biometrics.perclos}%
                  </span>
                  <span className="text-slate-500 text-[9px] ml-1">(Crit: &gt;15%)</span>
                </div>
              </div>
            </div>

            {/* Biometric Gauges Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Eye Aspect Ratio (EAR) */}
              <div className={`p-3 rounded-xl border ${
                isDarkMode ? 'bg-white/[0.04] border-white/10 backdrop-blur-md' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    Eye Aspect Ratio (EAR)
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Normal &gt; 0.28</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-mono font-bold ${
                    bus.biometrics.ear < 0.20 ? 'text-red-400' : bus.biometrics.ear < 0.25 ? 'text-yellow-400' : 'text-cyan-300'
                  }`}>
                    {bus.biometrics.ear.toFixed(3)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {bus.biometrics.ear < 0.20 ? 'Closed' : bus.biometrics.ear < 0.25 ? 'Drooping' : 'Open'}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      bus.biometrics.ear < 0.20 ? 'bg-red-500' : bus.biometrics.ear < 0.25 ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, (bus.biometrics.ear / 0.40) * 100)}%` }}
                  />
                </div>
              </div>

              {/* PERCLOS Severity Gauge */}
              <div className={`p-3 rounded-xl border ${
                isDarkMode ? 'bg-white/[0.04] border-white/10 backdrop-blur-md' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-red-400" />
                    PERCLOS Fatigue %
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Crit &gt; 15%</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-mono font-bold ${
                    bus.biometrics.perclos > 15 ? 'text-red-400' : bus.biometrics.perclos > 10 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {bus.biometrics.perclos.toFixed(1)}%
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {bus.biometrics.perclos > 15 ? 'Critical' : bus.biometrics.perclos > 10 ? 'Caution' : 'Normal'}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      bus.biometrics.perclos > 15 ? 'bg-red-500' : bus.biometrics.perclos > 10 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, (bus.biometrics.perclos / 30) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Mouth Aspect Ratio (MAR) & Yawning */}
              <div className={`p-3 rounded-xl border ${
                isDarkMode ? 'bg-white/[0.04] border-white/10 backdrop-blur-md' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                    <Smile className="w-3.5 h-3.5 text-yellow-400" />
                    Mouth Aspect (MAR)
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Yawn &gt; 0.65</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-mono font-bold ${bus.biometrics.mar > 0.65 ? 'text-yellow-400' : 'text-slate-200'}`}>
                    {bus.biometrics.mar.toFixed(3)}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {bus.biometrics.isYawning ? 'Yawn Active' : 'Normal'}
                  </span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${bus.biometrics.mar > 0.65 ? 'bg-yellow-500' : 'bg-slate-500'}`}
                    style={{ width: `${Math.min(100, (bus.biometrics.mar / 1.0) * 100)}%` }}
                  />
                </div>
              </div>

              {/* MQ-3 Alcohol Gas Sensor */}
              <div className={`p-3 rounded-xl border ${
                isDarkMode ? 'bg-white/[0.04] border-white/10 backdrop-blur-md' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    MQ-3 Alcohol Sensor
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Limit &gt; 0.90V</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-mono font-bold ${
                    bus.biometrics.alcoholVoltage > 0.90 ? 'text-red-400' : 'text-slate-200'
                  }`}>
                    {bus.biometrics.alcoholVoltage.toFixed(2)} V
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    (ADC: {bus.biometrics.alcoholRawADC})
                  </span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      bus.biometrics.alcoholVoltage > 0.90 ? 'bg-red-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${Math.min(100, (bus.biometrics.alcoholVoltage / 2.5) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Head Pose solvePnP Angular Deviation */}
            <div className={`p-3.5 rounded-xl border ${
              isDarkMode ? 'bg-white/[0.04] border-white/10 backdrop-blur-md' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-blue-400" />
                  3D Head Pose Orientation (solvePnP)
                </span>
                <span className="text-[10px] font-mono text-slate-500">Nodding &gt;20° | Off-Road &gt;25°</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                  <div className="text-[10px] text-slate-400 font-mono">Pitch (Nod)</div>
                  <div className={`text-base font-bold font-mono ${bus.biometrics.headPitch > 20 ? 'text-red-400' : 'text-cyan-300'}`}>
                    {bus.biometrics.headPitch}°
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                  <div className="text-[10px] text-slate-400 font-mono">Yaw (Glance)</div>
                  <div className={`text-base font-bold font-mono ${Math.abs(bus.biometrics.headYaw) > 25 ? 'text-yellow-400' : 'text-cyan-300'}`}>
                    {bus.biometrics.headYaw}°
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                  <div className="text-[10px] text-slate-400 font-mono">Roll</div>
                  <div className="text-base font-bold font-mono text-slate-300">
                    {bus.biometrics.headRoll}°
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: MULTI-HUB COMMS LINK ================= */}
        {activeTab === 'COMMS' && (
          <div className="space-y-4">
            {/* Active Link Mode Banner */}
            <div className={`p-4 rounded-xl border ${
              isRescued 
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isRescued ? <Radio className="w-5 h-5 text-purple-400 animate-pulse" /> : <Wifi className="w-5 h-5 text-emerald-400" />}
                  <div>
                    <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">Active Communication Path</div>
                    <div className="text-base font-bold font-mono">
                      {isRescued ? 'LoRa Store-and-Forward Rescue Link' : 'GSM/GPRS Direct MQTT Path'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono px-2.5 py-1 rounded bg-black/40 border border-white/10">
                    {isRescued ? `Hop Count: ${bus.telemetry.hopCount}` : 'Direct Link'}
                  </span>
                </div>
              </div>

              {isRescued && bus.telemetry.relayedViaNodeId && (
                <div className="mt-3 pt-3 border-t border-purple-500/20 text-xs font-mono flex items-center justify-between">
                  <span className="text-slate-300">Relayed via Neighbour Node:</span>
                  <span className="text-purple-300 font-bold bg-purple-900/60 px-2 py-0.5 rounded border border-purple-500/40">
                    {bus.telemetry.relayedViaNodeId}
                  </span>
                </div>
              )}
            </div>

            {/* LoRa Physical-Layer Configuration & Spreading Factor */}
            <div className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-white/[0.04] border-white/10 backdrop-blur-md' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  LoRa Spreading Factor & Physical Parameters
                </span>
                <span className="text-[10px] font-mono text-cyan-400">868 MHz Band</span>
              </div>

              {/* SF Buttons */}
              <div className="grid grid-cols-6 gap-1.5 mb-3">
                {(['SF7', 'SF8', 'SF9', 'SF10', 'SF11', 'SF12'] as LoRaSpreadingFactor[]).map((sf) => (
                  <button
                    key={sf}
                    onClick={() => handleSfChange(sf)}
                    className={`py-1.5 text-xs font-mono rounded-lg font-bold transition-all border ${
                      bus.telemetry.spreadingFactor === sf
                        ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                        : 'bg-white/5 text-slate-400 hover:text-slate-200 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    {sf}
                  </button>
                ))}
              </div>

              {/* SF Metrics Grid from Thesis Paper */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                  <div className="text-[10px] text-slate-400">Time-on-Air</div>
                  <div className="text-cyan-300 font-bold">{sfInfo.airtimeMs} ms</div>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                  <div className="text-[10px] text-slate-400">Modeled Range</div>
                  <div className="text-cyan-300 font-bold">{sfInfo.rangeKm} km</div>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                  <div className="text-[10px] text-slate-400">Target PDR</div>
                  <div className="text-green-400 font-bold">{sfInfo.pdr}%</div>
                </div>
              </div>
            </div>

            {/* Signal Strength & Network Health */}
            <div className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-white/[0.04] border-white/10 backdrop-blur-md' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="text-xs font-mono font-bold text-slate-300 mb-3">Link Quality & Collision Risk</h3>
              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Received Signal (RSSI):</span>
                  <span className="text-slate-100 font-bold">{bus.telemetry.rssi} dBm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Signal-to-Noise Ratio (SNR):</span>
                  <span className="text-slate-100 font-bold">+{bus.telemetry.snr} dB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Channel Collision Prob (ALOHA):</span>
                  <span className="text-amber-400 font-bold">{bus.telemetry.collisionProbability}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">SQLite Offline Buffer Queue:</span>
                  <span className="text-cyan-300 font-bold">{bus.telemetry.bufferedPacketsCount} packets</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Tx Packet Sequence:</span>
                  <span className="text-slate-200">#{bus.telemetry.packetSequence}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: VEHICLE TELEMETRY ================= */}
        {activeTab === 'TELEMETRY' && (
          <div className="space-y-4">
            {/* GPS Positioning Card */}
            <div className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-white/[0.04] border-white/10 backdrop-blur-md' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                  <Navigation2 className="w-4 h-4 text-blue-400" />
                  u-blox NEO-6M GPS Position
                </span>
                <span className="text-[10px] font-mono text-green-400">
                  {bus.hardware.satelliteCount} Sats Locked
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/10">
                  <div className="text-[10px] text-slate-400">Latitude</div>
                  <div className="text-sm font-bold text-cyan-300 font-mono">{bus.location.lat.toFixed(6)}° N</div>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/10">
                  <div className="text-[10px] text-slate-400">Longitude</div>
                  <div className="text-sm font-bold text-cyan-300 font-mono">{bus.location.lng.toFixed(6)}° E</div>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/10">
                  <div className="text-[10px] text-slate-400">Speed (GPS)</div>
                  <div className="text-sm font-bold text-slate-100 font-mono">{bus.speed} km/h</div>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/10">
                  <div className="text-[10px] text-slate-400">Heading</div>
                  <div className="text-sm font-bold text-slate-100 font-mono">{bus.heading}° Compass</div>
                </div>
              </div>
            </div>

            {/* Hardware & Power Profiling (Raspberry Pi 4) */}
            <div className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-white/[0.04] border-white/10 backdrop-blur-md' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  Vehicle Node Hardware & Power (Pi 4)
                </span>
                <span className="text-[10px] font-mono text-cyan-300">Model Budget: ~5.06W</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/10">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    Current Power Draw
                  </div>
                  <div className="text-base font-bold text-yellow-300 font-mono">
                    {bus.hardware.powerDrawWatts.toFixed(2)} W
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">Peak cap: 7.50W</div>
                </div>

                <div className="p-2.5 rounded-lg bg-black/40 border border-white/10">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Battery className="w-3 h-3 text-green-400" />
                    Vehicle Rail Voltage
                  </div>
                  <div className="text-base font-bold text-green-300 font-mono">
                    {bus.hardware.batteryVoltage.toFixed(2)} V
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">LM2596 Regulated</div>
                </div>

                <div className="p-2.5 rounded-lg bg-black/40 border border-white/10">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-red-400" />
                    SoC Temperature
                  </div>
                  <div className="text-base font-bold text-slate-100 font-mono">
                    {bus.hardware.piTemperature}°C
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">Fan Active Cooling</div>
                </div>

                <div className="p-2.5 rounded-lg bg-black/40 border border-white/10">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-blue-400" />
                    CPU Load (Quad Core)
                  </div>
                  <div className="text-base font-bold text-slate-100 font-mono">
                    {bus.hardware.piCpuLoad}%
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">MediaPipe + Comms</div>
                </div>
              </div>
            </div>

            {/* In-Cabin LCD Display Live Text */}
            <div className={`p-3.5 rounded-xl border ${
              isDarkMode ? 'bg-white/[0.04] border-white/10 backdrop-blur-md' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="text-xs font-mono text-slate-400 mb-1.5 flex items-center justify-between">
                <span>16×2 In-Cabin I2C LCD Display:</span>
                <span className="text-[10px] text-green-400">ACTIVE</span>
              </div>
              <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-2.5 rounded-lg font-mono text-sm tracking-widest text-center shadow-inner">
                {bus.hardware.lcdMessage}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: DISPATCH & SIMULATION TRIGGERS ================= */}
        {activeTab === 'DISPATCH' && (
          <div className="space-y-4">
            {/* Operator Alert Control Buttons */}
            <div className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-white/[0.04] border-white/10 backdrop-blur-md' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="text-xs font-mono font-bold text-slate-200 mb-3 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-blue-400" />
                Simulate Incident Triggers on {bus.plateNumber}
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                Manually trigger realistic driver biometrics or radio failover to test dashboard reaction.
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  id="trigger-microsleep-btn"
                  onClick={handleTriggerMicrosleep}
                  className="py-2 px-3 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Force Microsleep</span>
                </button>

                <button
                  id="trigger-alcohol-btn"
                  onClick={handleTriggerAlcohol}
                  className="py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Force Alcohol Risk</span>
                </button>

                <button
                  id="trigger-yawn-btn"
                  onClick={handleTriggerYawn}
                  className="py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                >
                  <Smile className="w-3.5 h-3.5" />
                  <span>Force Yawn (MAR)</span>
                </button>

                <button
                  id="reset-driver-state-btn"
                  onClick={handleResetState}
                  className="py-2 px-3 bg-white/5 hover:bg-white/10 text-green-400 font-mono text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-green-500/40"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Reset to Normal</span>
                </button>
              </div>
            </div>

            {/* In-Cabin Operator Interventions */}
            <div className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-white/[0.04] border-white/10 backdrop-blur-md' : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className="text-xs font-mono font-bold text-slate-200 mb-3 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-yellow-400" />
                Remote In-Cabin Interventions
              </h3>

              <div className="space-y-3">
                <button
                  id="dispatch-buzzer-btn"
                  onClick={handleDispatchBuzzer}
                  className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.35)]"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Sound In-Cabin Alarm Buzzer (GPIO)</span>
                </button>

                <form onSubmit={handleSendLcd} className="space-y-2">
                  <label className="text-[11px] font-mono text-slate-400 block">
                    Send 16-Char Alert Message to Vehicle LCD:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={16}
                      value={customLcdText}
                      onChange={(e) => setCustomLcdText(e.target.value)}
                      placeholder="e.g. PULL OVER NOW"
                      className="flex-1 bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-blue-500 uppercase"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-[0_0_12px_rgba(59,130,246,0.4)]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Panel Footer */}
      <div className={`p-3.5 border-t text-xs font-mono flex items-center justify-between ${
        isDarkMode ? 'border-white/10 bg-white/[0.02] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
      }`}>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>Last Telemetry Sync: {new Date(bus.lastUpdated).toLocaleTimeString()}</span>
        </div>
        <div className="text-[11px] text-blue-300 font-semibold">
          Node: RPi4-B (OBU)
        </div>
      </div>
    </div>
  );
};
