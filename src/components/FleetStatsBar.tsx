import React from 'react';
import { BusVehicle, ConnectionMode } from '../types/fleet';
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
  onFilterStatus,
  activeFilter,
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
      className={`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 p-3 rounded-2xl border font-mono ${
        isDarkMode
          ? 'bg-white/[0.04] border-white/10 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]'
          : 'bg-white/80 border-slate-200 backdrop-blur-md shadow-sm'
      }`}
    >
      {/* 1. Total Fleet */}
      <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all hover:bg-white/[0.08] ${
        isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between text-slate-400 text-[10px]">
          <span>FLEET TOTAL</span>
          <Bus className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <div className="text-lg font-bold text-white mt-1">{totalBuses} Nodes</div>
        <div className="text-[9px] text-slate-500">RPi4 Vehicle OBUs</div>
      </div>

      {/* 2. Normal Status */}
      <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all hover:bg-green-500/10 ${
        isDarkMode ? 'bg-green-500/[0.06] border-green-500/20 text-green-300' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between text-green-400/80 text-[10px]">
          <span>NORMAL</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
        </div>
        <div className="text-lg font-bold text-green-400 mt-1">{normalCount}</div>
        <div className="text-[9px] text-green-400/70">EAR &gt; 0.28 Normal</div>
      </div>

      {/* 3. Drowsy / Caution */}
      <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all hover:bg-yellow-500/10 ${
        cautionCount > 0 ? 'border-yellow-500/40 bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between text-slate-400 text-[10px]">
          <span>DROWSY</span>
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
        </div>
        <div className={`text-lg font-bold mt-1 ${cautionCount > 0 ? 'text-yellow-400' : 'text-slate-200'}`}>
          {cautionCount}
        </div>
        <div className="text-[9px] text-yellow-500/80">Yawn / PERCLOS 10-15%</div>
      </div>

      {/* 4. Critical Fatigue & Alcohol */}
      <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all hover:bg-red-500/15 ${
        criticalCount > 0 ? 'border-red-500/50 bg-red-500/15 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.35)]' : isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between text-slate-400 text-[10px]">
          <span>CRITICAL</span>
          <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
        </div>
        <div className={`text-lg font-bold mt-1 ${criticalCount > 0 ? 'text-red-400 font-extrabold' : 'text-slate-200'}`}>
          {criticalCount}
        </div>
        <div className="text-[9px] text-red-400/90">Microsleep / MQ-3 Alert</div>
      </div>

      {/* 5. LoRa Rescued Nodes */}
      <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all hover:bg-purple-500/10 ${
        loraRescueCount > 0 ? 'border-purple-500/40 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between text-slate-400 text-[10px]">
          <span>LORA RESCUE</span>
          <Radio className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div className="text-lg font-bold text-purple-300 mt-1">{loraRescueCount} Active</div>
        <div className="text-[9px] text-purple-400/80">Multi-Hub Forwarding</div>
      </div>

      {/* 6. Fleet PDR % */}
      <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all hover:bg-white/[0.08] ${
        isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between text-slate-400 text-[10px]">
          <span>FLEET PDR</span>
          <Activity className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <div className="text-lg font-bold text-slate-100 mt-1">{avgPdr}%</div>
        <div className="text-[9px] text-slate-500">Packet Delivery Ratio</div>
      </div>

      {/* 7. Channel Collision Risk (ALOHA) */}
      <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all hover:bg-white/[0.08] ${
        isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between text-slate-400 text-[10px]">
          <span>COLLISION P_coll</span>
          <Percent className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="text-lg font-bold text-amber-300 mt-1">{avgCollisionProb}%</div>
        <div className="text-[9px] text-slate-500">LoRa SF10 Airtime</div>
      </div>

      {/* 8. Total Fleet Power */}
      <div className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all hover:bg-white/[0.08] ${
        isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between text-slate-400 text-[10px]">
          <span>POWER DEMAND</span>
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
        </div>
        <div className="text-lg font-bold text-yellow-300 mt-1">{totalPowerWatts} W</div>
        <div className="text-[9px] text-slate-500">Avg ~5.06W / OBU Node</div>
      </div>
    </div>
  );
};
