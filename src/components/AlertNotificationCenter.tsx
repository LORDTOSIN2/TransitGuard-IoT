import React, { useState } from 'react';
import { AlertIncident } from '../types/fleet';
import { simulationEngine } from '../services/simulationEngine';
import { soundFx } from '../utils/audio';
import {
  X,
  Bell,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Info,
  Radio,
  Clock,
  Eye,
  MapPin,
  CheckCheck
} from 'lucide-react';

interface AlertNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertIncident[];
  onSelectBus: (busId: string) => void;
  isDarkMode: boolean;
}

export const AlertNotificationCenter: React.FC<AlertNotificationCenterProps> = ({
  isOpen,
  onClose,
  alerts,
  onSelectBus,
  isDarkMode,
}) => {
  if (!isOpen) return null;

  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'CAUTION' | 'INFO'>('ALL');

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter === 'ALL') return true;
    return a.severity === severityFilter;
  });

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  const handleAcknowledge = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    simulationEngine.acknowledgeAlert(id, 'Control Room Dispatcher');
  };

  const handleAcknowledgeAll = () => {
    alerts.forEach((a) => {
      if (!a.acknowledged) {
        simulationEngine.acknowledgeAlert(a.id, 'Control Room Dispatcher');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-end p-0 sm:p-4 bg-[#05070A]/80 backdrop-blur-sm">
      <div
        className={`w-full sm:w-[480px] lg:w-[540px] h-full sm:h-[92vh] sm:rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
          isDarkMode
            ? 'bg-[#080B11]/90 border-white/10 text-[#E0E6ED] backdrop-blur-2xl shadow-[-16px_0_40px_rgba(0,0,0,0.6)]'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.3)]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono text-white">Incident Alert Feed</h2>
                {unacknowledgedCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-red-500 text-white animate-pulse shadow-sm">
                    {unacknowledgedCount} New
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Real-time safety events & cellular fallback alerts
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

        {/* Filter Controls & Bulk Action */}
        <div className={`p-3 border-b flex items-center justify-between gap-2 text-xs font-mono ${
          isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-100/50'
        }`}>
          <div className="flex items-center gap-1">
            {(['ALL', 'CRITICAL', 'CAUTION', 'INFO'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => {
                  soundFx.playClick();
                  setSeverityFilter(sev);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                  severityFilter === sev
                    ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                    : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/5'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {unacknowledgedCount > 0 && (
            <button
              onClick={handleAcknowledgeAll}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Ack All</span>
            </button>
          )}
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="py-16 text-center text-slate-500 font-mono text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto text-green-500/50 mb-2" />
              <p>No active alerts matching filter.</p>
              <p className="text-[11px] text-slate-600 mt-1">Fleet biometrics operating within normal thresholds.</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const isCrit = alert.severity === 'CRITICAL';
              const isCaut = alert.severity === 'CAUTION';

              return (
                <div
                  key={alert.id}
                  onClick={() => {
                    soundFx.playClick();
                    onSelectBus(alert.busId);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                    alert.acknowledged
                      ? 'opacity-60 bg-white/[0.02] border-white/5'
                      : isCrit
                      ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                      : isCaut
                      ? 'bg-yellow-500/10 border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.15)]'
                      : 'bg-white/[0.04] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`p-1 rounded-lg ${
                        isCrit ? 'bg-red-500/20 text-red-400' :
                        isCaut ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {isCrit ? <ShieldAlert className="w-4 h-4" /> : isCaut ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                      </span>
                      <span className="font-mono font-bold text-xs text-slate-100">
                        {alert.busPlate} ({alert.busId})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 mb-2 leading-relaxed font-sans">
                    {alert.message}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] font-mono">
                    <div className="flex items-center gap-2 text-slate-400">
                      <span>Driver: <strong className="text-slate-200">{alert.driverName}</strong></span>
                      <span>•</span>
                      <span className="text-cyan-400">{alert.connectionMode}</span>
                    </div>

                    {!alert.acknowledged ? (
                      <button
                        onClick={(e) => handleAcknowledge(alert.id, e)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10px] transition-colors flex items-center gap-1 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Acknowledge</span>
                      </button>
                    ) : (
                      <span className="text-slate-500 text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                        Ack'd
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
