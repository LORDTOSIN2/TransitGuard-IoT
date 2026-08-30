import React from 'react';
import { soundFx } from '../utils/audio';
import { X, FileText, CheckCircle2, ShieldAlert, Cpu, Radio, Zap, Activity } from 'lucide-react';

interface AssumptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export const AssumptionsModal: React.FC<AssumptionsModalProps> = ({
  isOpen,
  onClose,
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
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-white">System Thresholds & Mathematical Models</h2>
              <p className="text-xs text-slate-400 font-mono">
                Source of Truth: FUT Minna B.Eng Project Thesis Specifications
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono flex-1">
          {/* Section 1: Driver Fatigue & Computer Vision */}
          <div className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <h3 className="text-sm font-bold text-blue-400 mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              1. MediaPipe Computer Vision & Fatigue Thresholds
            </h3>
            <div className="space-y-2 text-slate-300">
              <p>
                <strong className="text-slate-100">Eye Aspect Ratio (EAR):</strong> Computed from 6 eye landmark points:
                <br />
                <code className="text-cyan-300 bg-black/40 border border-white/10 px-2 py-0.5 rounded-lg inline-block my-1">
                  EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
                </code>
                <br />
                • Normal: <span className="text-green-400">EAR &gt; 0.28</span> | Drowsy/Caution: <span className="text-yellow-400">0.20 - 0.28</span> | Critical Microsleep: <span className="text-red-400">&lt; 0.20</span> for consecutive frames (&gt;0.8s).
              </p>
              <p>
                <strong className="text-slate-100">PERCLOS (Percentage of Eye Closure):</strong> Percentage of sliding 60-frame window where eyes are closed:
                <br />
                • Normal: <span className="text-green-400">&lt; 10%</span> | Caution: <span className="text-yellow-400">10% - 15%</span> | Critical Fatigue: <span className="text-red-400">&gt; 15%</span>.
              </p>
              <p>
                <strong className="text-slate-100">Mouth Aspect Ratio (MAR):</strong> Yawning metric: Normal <span className="text-slate-200">&lt; 0.50</span>, Sustained Yawn <span className="text-yellow-400">&gt; 0.65</span>.
              </p>
              <p>
                <strong className="text-slate-100">3D Head Pose (solvePnP):</strong> Pitch nodding <span className="text-red-400">&gt; 20°</span>, Off-road glance deviation <span className="text-yellow-400">&gt; 25°</span>.
              </p>
            </div>
          </div>

          {/* Section 2: MQ-3 Alcohol Gas Sensor */}
          <div className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <h3 className="text-sm font-bold text-purple-400 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              2. MQ-3 Alcohol Screening & ADC Conversion
            </h3>
            <div className="space-y-1.5 text-slate-300">
              <p>
                Analogue voltage converted via 10-bit MCP3008 ADC:
                <code className="text-purple-300 bg-black/40 border border-white/10 px-2 py-0.5 rounded-lg inline-block ml-1">
                  V_out = (ADC_value / 1023) * V_ref
                </code>
              </p>
              <p>
                • Safe baseline: <span className="text-green-400">0.20V - 0.45V</span> (ADC 60-140)
                <br />
                • Alert threshold: <span className="text-red-400">&gt; 0.90V</span> (ADC &gt; 280, indicative screening vapour).
                <br />
                <span className="text-slate-400 italic text-[11px]">
                  *Note: Indicative screening sensor, not a certified evidentiary blood-alcohol measurement device.
                </span>
              </p>
            </div>
          </div>

          {/* Section 3: LoRa Multi-Hub & ALOHA Collision Modeling */}
          <div className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <h3 className="text-sm font-bold text-cyan-400 mb-2 flex items-center gap-2">
              <Radio className="w-4 h-4" />
              3. LoRa Multi-Hub Rescue & Channel Collision Model
            </h3>
            <div className="space-y-2 text-slate-300">
              <p>
                <strong className="text-slate-100">Default Radio Configuration:</strong> RFM95W (868 MHz), Bandwidth 125 kHz, Coding Rate 4/5, SF10.
                <br />
                • SF10 Time-on-Air: <span className="text-cyan-300 font-bold">169 ms</span> | Urban Modeled Range: <span className="text-cyan-300 font-bold">8.6 km</span>.
              </p>
              <p>
                <strong className="text-slate-100">Pure-ALOHA Collision Probability:</strong>
                <br />
                <code className="text-cyan-300 bg-black/40 border border-white/10 px-2 py-0.5 rounded-lg inline-block my-1">
                  P_coll = 1 - exp(-2 * N * T_air / T_int)
                </code>
                <br />
                Where N is number of contending buses, T_air is packet airtime (169ms), and T_int is the 30s reporting interval.
              </p>
            </div>
          </div>

          {/* Section 4: Power Budget (Raspberry Pi 4) */}
          <div className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <h3 className="text-sm font-bold text-yellow-400 mb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              4. Power Budget & Thermal Architecture (Table 3.6 / Table 4.5)
            </h3>
            <div className="text-slate-300 space-y-1">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>• Raspberry Pi 4 Model B: <strong>3.50W</strong> (MediaPipe inference)</div>
                <div>• SIM800L GSM/GPRS: <strong>0.15W avg</strong> (2.0W TX peak)</div>
                <div>• RFM95W LoRa Transceiver: <strong>0.03W avg</strong> (0.40W TX)</div>
                <div>• MQ-3 Alcohol Sensor Heater: <strong>0.75W</strong></div>
                <div>• Camera Module v2: <strong>0.30W</strong></div>
                <div>• NEO-6M GPS Receiver: <strong>0.15W</strong></div>
                <div>• 16x2 LCD, Fan & LEDs: <strong>0.18W</strong></div>
              </div>
              <div className="pt-2 border-t border-white/10 text-yellow-300 font-bold flex justify-between">
                <span>Estimated Average Continuous Demand:</span>
                <span>~5.06 Watts (7.50W Peak)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-3.5 border-t text-xs font-mono flex items-center justify-between ${
          isDarkMode ? 'border-white/10 bg-white/[0.02] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}>
          <span>Department of Computer Engineering, Federal University of Technology, Minna</span>
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold rounded-lg transition-colors shadow-[0_0_12px_rgba(59,130,246,0.3)]"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
