import React, { useState } from 'react';
import { BusVehicle, AlertIncident } from '../types/fleet';
import { soundFx } from '../utils/audio';
import { X, Download, Copy, Check, FileJson, FileSpreadsheet } from 'lucide-react';

interface ExportTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  buses: BusVehicle[];
  alerts: AlertIncident[];
  isDarkMode: boolean;
}

export const ExportTelemetryModal: React.FC<ExportTelemetryModalProps> = ({
  isOpen,
  onClose,
  buses,
  alerts,
  isDarkMode,
}) => {
  if (!isOpen) return null;

  const [exportFormat, setExportFormat] = useState<'JSON' | 'CSV'>('JSON');
  const [copied, setCopied] = useState(false);

  const generateJson = () => {
    return JSON.stringify(
      {
        exportTimestamp: new Date().toISOString(),
        activeFleetCount: buses.length,
        totalAlertsCount: alerts.length,
        fleetTelemetry: buses,
        incidentAlerts: alerts,
      },
      null,
      2
    );
  };

  const generateCsv = () => {
    const headers = [
      'busId',
      'plateNumber',
      'driverName',
      'status',
      'lat',
      'lng',
      'speed_kmh',
      'heading',
      'commMode',
      'hopCount',
      'rssi_dbm',
      'ear',
      'mar',
      'perclos_pct',
      'headPitch_deg',
      'headYaw_deg',
      'alcohol_volt',
      'power_watts',
      'timestamp',
    ];

    const rows = buses.map((b) => [
      b.id,
      b.plateNumber,
      `"${b.driverName}"`,
      b.status,
      b.location.lat.toFixed(6),
      b.location.lng.toFixed(6),
      b.speed,
      b.heading,
      b.telemetry.mode,
      b.telemetry.hopCount,
      b.telemetry.rssi,
      b.biometrics.ear,
      b.biometrics.mar,
      b.biometrics.perclos,
      b.biometrics.headPitch,
      b.biometrics.headYaw,
      b.biometrics.alcoholVoltage,
      b.hardware.powerDrawWatts,
      new Date(b.lastUpdated).toISOString(),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  };

  const exportData = exportFormat === 'JSON' ? generateJson() : generateCsv();

  const handleDownload = () => {
    soundFx.playClick();
    const mimeType = exportFormat === 'JSON' ? 'application/json' : 'text/csv';
    const extension = exportFormat === 'JSON' ? 'json' : 'csv';
    const blob = new Blob([exportData], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transitguard-telemetry-${Date.now()}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    soundFx.playClick();
    navigator.clipboard.writeText(exportData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-[#05070A]/80 backdrop-blur-md">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDarkMode
            ? 'bg-[#080B11]/90 border-white/10 text-[#E0E6ED] backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.8)]'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-white">Export Fleet Telemetry Logs</h2>
              <p className="text-xs text-slate-400 font-mono">
                Download structured records for post-route analysis
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

        {/* Format Selector */}
        <div className={`p-3 border-b flex items-center justify-between gap-2 text-xs font-mono ${
          isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-100/50'
        }`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundFx.playClick();
                setExportFormat('JSON');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all border ${
                exportFormat === 'JSON'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/5'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>JSON Payload</span>
            </button>

            <button
              onClick={() => {
                soundFx.playClick();
                setExportFormat('CSV');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all border ${
                exportFormat === 'CSV'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/5'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV Spreadsheet</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-blue-300 font-bold rounded-lg border border-white/10 transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
          </button>
        </div>

        {/* Preview Area */}
        <div className="p-4 flex-1 overflow-hidden flex flex-col">
          <div className="text-[11px] font-mono text-slate-400 mb-1.5">Raw Telemetry Preview:</div>
          <pre className="flex-1 bg-black/50 p-3 rounded-xl border border-white/10 text-[11px] font-mono text-blue-300 overflow-auto max-h-[340px]">
            {exportData}
          </pre>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between text-xs font-mono ${
          isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'
        }`}>
          <span className="text-slate-400">{buses.length} Vehicles • {alerts.length} Incidents</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 border border-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors flex items-center gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
