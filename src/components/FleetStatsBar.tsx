import React from 'react';
import { BusVehicle } from '../types/fleet';
import { 
  Bus, 
  CheckCircle2, 
  AlertTriangle, 
  Radio, 
  Zap, 
  Activity, 
  ShieldAlert,
  Percent
} from 'lucide-react';

interface FleetStatsBarProps {
  buses: BusVehicle[];
  isDarkMode: boolean;
  onFilterStatus?: (status: string | null) => void;
  activeFilter?: string | null;
}

export const FleetStatsBar: React.FC<FleetStatsBarProps> = ({
  buses,
  isDarkMode,
}) => {
  const totalBuses = buses.length;
  const normalCount = buses.filter((b) => b.status === 'NORMAL').length;
  const cautionCount = buses.filter((b) => b.status === 'CAUTION' || b.status === 'DROWSY').length;
  const criticalCount = buses.filter((b) => b.status === 'CRITICAL_FATIGUE' || b.status === 'ALCOHOL_ALERT').length;
  const loraRescueCount = buses.filter((b) => b.telemetry.mode === 'LORA_RESCUE').length;

  const avgPdr = totalBuses > 0
    ? (buses.reduce((acc, b) => acc + b.telemetry.pdrEstimate, 0) / totalBuses).toFixed(1)
    : '94.8';

  const avgCollisionProb = totalBuses > 0
    ? (buses.reduce((acc, b) => acc + b.telemetry.collisionProbability, 0) / totalBuses).toFixed(1)
    : '1.2';

  const totalPowerWatts = buses.reduce((acc, b) => acc + b.hardware.powerDrawWatts, 0).toFixed(1);

  return (
    <div
      id="fleet-stats-bar"
      className={`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 p-3 rounded-2xl border font-mono transition-colors duration-300 ${
        isDarkMode
          ? 'bg-white/[0.04] border-white/10 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]'
          : 'bg-white border-slate-200/90 shadow-sm'
      }`}
    >
      {/* 1. Total Fleet */}
      <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
        isDarkMode 
          ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08]' 
          : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80 shadow-xs'
      }`}>
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
          <span>FLEET TOTAL</span>
          <Bus className="w-3.5 h-3.5 text-blue-500" />
        </div>
        <div className={`text-lg font-extrabold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {totalBuses} Nodes
        </div>
        <div className="text-[9px] text-slate-500 font-medium">RPi4 Vehicle OBUs</div>
      </div>

      {/* 2. Normal Status */}
      <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
        isDarkMode 
          ? 'bg-green-500/[0.06] border-green-500/20 text-green-300 hover:bg-green-500/10' 
          : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900 hover:bg-emerald-50 shadow-xs'
      }`}>
        <div className={`flex items-center justify-between text-[10px] font-semibold ${
          isDarkMode ? 'text-green-400/80' : 'text-emerald-700'
        }`}>
          <span>NORMAL</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        </div>
        <div className="text-lg font-extrabold text-emerald-600 mt-1">{normalCount}</div>
        <div className={`text-[9px] font-medium ${isDarkMode ? 'text-green-400/70' : 'text-emerald-700'}`}>
          EAR &gt; 0.28 Normal
        </div>
      </div>

      {/* 3. Drowsy / Caution */}
      <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
        cautionCount > 0 
          ? isDarkMode 
            ? 'border-yellow-500/40 bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
            : 'border-amber-300 bg-amber-50 text-amber-900 shadow-xs'
          : isDarkMode 
            ? 'bg-white/[0.03] border-white/10 hover:bg-yellow-500/10' 
            : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80 shadow-xs'
      }`}>
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
          <span>DROWSY</span>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <div className={`text-lg font-extrabold mt-1 ${
          cautionCount > 0 
            ? 'text-amber-500 font-black' 
            : isDarkMode ? 'text-slate-300' : 'text-slate-800'
        }`}>
          {cautionCount}
        </div>
        <div className="text-[9px] text-amber-600 font-medium">Yawn / PERCLOS 10-15%</div>
      </div>

      {/* 4. Critical Fatigue & Alcohol */}
      <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
        criticalCount > 0 
          ? isDarkMode
            ? 'border-red-500/50 bg-red-500/15 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.35)]'
            : 'border-rose-300 bg-rose-50 text-rose-900 shadow-xs animate-pulse'
          : isDarkMode 
            ? 'bg-white/[0.03] border-white/10 hover:bg-red-500/15' 
            : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80 shadow-xs'
      }`}>
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
          <span>CRITICAL</span>
          <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
        </div>
        <div className={`text-lg font-black mt-1 ${
          criticalCount > 0 
            ? 'text-rose-600' 
            : isDarkMode ? 'text-slate-300' : 'text-slate-800'
        }`}>
          {criticalCount}
        </div>
        <div className="text-[9px] text-rose-600 font-medium">Microsleep / MQ-3 Alert</div>
      </div>

      {/* 5. LoRa Rescued Nodes */}
      <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
        loraRescueCount > 0 
          ? isDarkMode
            ? 'border-purple-500/40 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
            : 'border-purple-300 bg-purple-50 text-purple-900 shadow-xs'
          : isDarkMode 
            ? 'bg-white/[0.03] border-white/10 hover:bg-purple-500/10' 
            : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80 shadow-xs'
      }`}>
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
          <span>LORA RESCUE</span>
          <Radio className="w-3.5 h-3.5 text-purple-500" />
        </div>
        <div className={`text-lg font-extrabold mt-1 ${
          loraRescueCount > 0 
            ? 'text-purple-600' 
            : isDarkMode ? 'text-purple-300' : 'text-purple-700'
        }`}>
          {loraRescueCount} Active
        </div>
        <div className="text-[9px] text-purple-600 font-medium">Multi-Hub Forwarding</div>
      </div>

      {/* 6. Fleet PDR % */}
      <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
        isDarkMode 
          ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08]' 
          : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80 shadow-xs'
      }`}>
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
          <span>FLEET PDR</span>
          <Activity className="w-3.5 h-3.5 text-blue-500" />
        </div>
        <div className={`text-lg font-extrabold mt-1 ${isDarkMode ? 'text-slate-100' : 'text-blue-600'}`}>
          {avgPdr}%
        </div>
        <div className="text-[9px] text-slate-500 font-medium">Packet Delivery Ratio</div>
      </div>

      {/* 7. Channel Collision Risk (ALOHA) */}
      <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
        isDarkMode 
          ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08]' 
          : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80 shadow-xs'
      }`}>
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
          <span>COLLISION P_coll</span>
          <Percent className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <div className={`text-lg font-extrabold mt-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
          {avgCollisionProb}%
        </div>
        <div className="text-[9px] text-slate-500 font-medium">LoRa SF10 Airtime</div>
      </div>

      {/* 8. Total Fleet Power */}
      <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
        isDarkMode 
          ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08]' 
          : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80 shadow-xs'
      }`}>
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
          <span>POWER DEMAND</span>
          <Zap className="w-3.5 h-3.5 text-yellow-500" />
        </div>
        <div className={`text-lg font-extrabold mt-1 ${isDarkMode ? 'text-yellow-300' : 'text-slate-900'}`}>
          {totalPowerWatts} W
        </div>
        <div className="text-[9px] text-slate-500 font-medium">Avg ~5.06W / OBU Node</div>
      </div>
    </div>
  );
};
