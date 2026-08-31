import React, { useState } from 'react';
import { BusVehicle } from '../types/fleet';
import { soundFx } from '../utils/audio';
import {
  Bus,
  Search,
  ChevronRight,
} from 'lucide-react';

interface FleetListSidebarProps {
  buses: BusVehicle[];
  selectedBusId: string | null;
  onSelectBus: (busId: string) => void;
  isDarkMode: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const FleetListSidebar: React.FC<FleetListSidebarProps> = ({
  buses,
  selectedBusId,
  onSelectBus,
  isDarkMode,
  isOpen,
  onToggleOpen,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'DROWSY' | 'LORA_RESCUE'>('ALL');

  const filteredBuses = buses.filter((b) => {
    const matchesSearch =
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.routeName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'CRITICAL') {
      return b.status === 'CRITICAL_FATIGUE' || b.status === 'ALCOHOL_ALERT';
    }
    if (statusFilter === 'DROWSY') {
      return b.status === 'DROWSY' || b.status === 'CAUTION';
    }
    if (statusFilter === 'LORA_RESCUE') {
      return b.telemetry.mode === 'LORA_RESCUE';
    }
    return true;
  });

  return (
    <aside
      id="fleet-list-sidebar"
      className={`transition-all duration-300 flex flex-col border rounded-2xl overflow-hidden ${
        isOpen ? 'w-full lg:w-80 h-[280px] lg:h-full' : 'h-11 lg:w-12 lg:h-full'
      } ${
        isDarkMode
          ? 'bg-white/[0.04] border-white/10 text-[#E0E6ED] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]'
          : 'bg-white border-slate-200/90 text-slate-900 shadow-sm'
      }`}
    >
      {/* Collapsed Header / Toggle */}
      <div className={`p-3 border-b flex items-center justify-between font-mono ${
        isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200/80 bg-slate-50'
      }`}>
        <div className="flex items-center gap-2">
          <Bus className="w-4 h-4 text-blue-500" />
          {isOpen && (
            <span className={`text-xs font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              FLEET ROSTER ({buses.length})
            </span>
          )}
        </div>

        <button
          onClick={() => {
            soundFx.playClick();
            onToggleOpen();
          }}
          className={`p-1 rounded border transition-colors ${
            isDarkMode 
              ? 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border-white/5' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200'
          }`}
          title={isOpen ? 'Collapse Fleet Panel' : 'Expand Fleet Panel'}
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90 lg:rotate-180' : 'rotate-0'}`} />
        </button>
      </div>

      {isOpen && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Search & Filter */}
          <div className={`p-2.5 space-y-2 border-b ${isDarkMode ? 'border-white/10' : 'border-slate-200/80 bg-slate-50/50'}`}>
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search bus, plate, driver..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs font-mono focus:outline-none focus:border-blue-500 transition-colors ${
                  isDarkMode 
                    ? 'bg-white/[0.05] border-white/10 text-white placeholder:text-slate-500 focus:bg-white/[0.08]' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white shadow-xs'
                }`}
              />
            </div>

            {/* Quick Status Filter Pills */}
            <div className="flex items-center gap-1 text-[10px] font-mono overflow-x-auto pb-0.5">
              {(['ALL', 'CRITICAL', 'DROWSY', 'LORA_RESCUE'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    soundFx.playClick();
                    setStatusFilter(filter);
                  }}
                  className={`px-2.5 py-0.5 rounded font-semibold whitespace-nowrap transition-colors ${
                    statusFilter === filter
                      ? 'bg-blue-600 text-white font-bold shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                      : isDarkMode 
                      ? 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/5 hover:bg-white/10' 
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 shadow-xs'
                  }`}
                >
                  {filter === 'LORA_RESCUE' ? 'LoRa Rescue' : filter}
                </button>
              ))}
            </div>
          </div>

          {/* Bus Cards List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredBuses.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 font-mono">
                No vehicles matching search.
              </div>
            ) : (
              filteredBuses.map((bus) => {
                const isSelected = bus.id === selectedBusId;
                const isCrit = bus.status === 'CRITICAL_FATIGUE' || bus.status === 'ALCOHOL_ALERT';
                const isDrowsy = bus.status === 'DROWSY' || bus.status === 'CAUTION';
                const isRescued = bus.telemetry.mode === 'LORA_RESCUE';

                return (
                  <div
                    key={bus.id}
                    onClick={() => {
                      soundFx.playClick();
                      onSelectBus(bus.id);
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? isDarkMode
                          ? 'bg-blue-600/20 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                          : 'bg-blue-50/90 border-blue-500 shadow-xs'
                        : isCrit
                        ? isDarkMode 
                          ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                          : 'bg-rose-50 border-rose-300 shadow-xs'
                        : isDarkMode
                        ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08] hover:border-white/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          isCrit ? 'bg-rose-500 animate-ping' :
                          isDrowsy ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`} />
                        <span className={`font-mono font-bold text-xs ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                          {bus.plateNumber}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">({bus.id})</span>
                      </div>

                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                        isRescued 
                          ? isDarkMode 
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                            : 'bg-purple-100 text-purple-800 border border-purple-200' 
                          : isDarkMode 
                          ? 'bg-white/10 text-slate-300' 
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {isRescued ? `LoRa h=${bus.telemetry.hopCount}` : 'GSM'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className={`truncate max-w-[130px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                        {bus.driverName}
                      </span>
                      <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                        {bus.speed} km/h
                      </span>
                    </div>

                    {/* Biometrics Micro-bar */}
                    <div className={`mt-1.5 pt-1.5 border-t flex items-center justify-between text-[10px] font-mono ${
                      isDarkMode ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-500'
                    }`}>
                      <span>
                        EAR: <strong className={bus.biometrics.ear < 0.20 ? 'text-rose-600' : isDarkMode ? 'text-slate-200' : 'text-slate-800 font-bold'}>{bus.biometrics.ear}</strong>
                      </span>
                      <span>
                        PERCLOS: <strong className={bus.biometrics.perclos > 15 ? 'text-rose-600' : isDarkMode ? 'text-slate-200' : 'text-slate-800 font-bold'}>{bus.biometrics.perclos}%</strong>
                      </span>
                      <span>
                        MQ-3: <strong className={bus.biometrics.alcoholVoltage > 0.9 ? 'text-rose-600' : isDarkMode ? 'text-slate-200' : 'text-slate-800 font-bold'}>{bus.biometrics.alcoholVoltage}V</strong>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
