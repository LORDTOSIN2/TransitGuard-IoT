/**
 * Type definitions for TransitGuard IoT Transport Tracking & Driver Fatigue Monitoring
 * Grounded in the B.Eng Thesis: "Development of a Low-Powered IoT-Based System for Multi-Hub
 * Communication for Public Transport Tracking and Driver Fatigue"
 */

export type ConnectionMode = 'GSM' | 'LORA_RESCUE' | 'WIFI';

export type DriverAlertLevel = 'NORMAL' | 'CAUTION' | 'DROWSY' | 'CRITICAL_FATIGUE' | 'ALCOHOL_ALERT' | 'DISTRACTED';

export type LoRaSpreadingFactor = 'SF7' | 'SF8' | 'SF9' | 'SF10' | 'SF11' | 'SF12';

export interface GeoLocation {
  lat: number;
  lng: number;
  altitude?: number;
}

export interface DriverBiometrics {
  /** Eye Aspect Ratio: Normal > 0.28, Drowsy 0.20-0.28, Critical < 0.20 */
  ear: number;
  /** Mouth Aspect Ratio: Normal < 0.50, Yawning > 0.65 */
  mar: number;
  /** Percentage of Eye Closure (sliding window %): Normal < 10%, Caution 10-15%, Critical > 15% */
  perclos: number;
  /** Head Pose Pitch in degrees (-90 to +90): Positive = Looking down / nodding (>20° is nodding) */
  headPitch: number;
  /** Head Pose Yaw in degrees (-90 to +90): Looking away from road (>25° is distraction) */
  headYaw: number;
  /** Head Pose Roll in degrees */
  headRoll: number;
  /** MQ-3 Alcohol Sensor reading (MCP3008 10-bit ADC 0-1023, 0.0V - 3.3V / 5V scaled) */
  alcoholRawADC: number;
  alcoholVoltage: number;
  /** Indicative BAC equivalent or risk index (0.0 to 1.0) */
  alcoholRiskScore: number;
  isYawning: boolean;
  isNodding: boolean;
  isOffRoadGlance: boolean;
  driverState: DriverAlertLevel;
}

export interface TelemetryLink {
  mode: ConnectionMode;
  /** RSSI in dBm (e.g., -65 dBm strong, -115 dBm poor) */
  rssi: number;
  /** Signal to Noise Ratio (dB) */
  snr: number;
  /** 0 = Direct upload to hub, 1 = Relayed through 1 peer, 2 = 2 hops */
  hopCount: number;
  /** Node ID of relay intermediary if rescued via LoRa */
  relayedViaNodeId?: string;
  /** LoRa Spreading Factor (SF7 - SF12) */
  spreadingFactor: LoRaSpreadingFactor;
  /** LoRa Time-on-Air (ms) e.g., 169ms for SF10, 30ms for SF7 */
  timeOnAirMs: number;
  /** Current packet sequence number */
  packetSequence: number;
  /** SQLite local buffered unsent packets waiting for connectivity flush */
  bufferedPacketsCount: number;
  /** Modeled packet delivery ratio % */
  pdrEstimate: number;
  /** Collision risk % based on local bus density and airtime */
  collisionProbability: number;
}

export interface VehicleHardwareStatus {
  piCpuLoad: number; // %
  piTemperature: number; // °C
  powerDrawWatts: number; // e.g., ~5.06W avg, 7.5W peak
  batteryVoltage: number; // e.g., 12.4V
  satelliteCount: number; // NEO-6M lock (e.g., 8-12)
  isLocalBuzzerActive: boolean;
  lcdMessage: string;
}

export interface BusVehicle {
  id: string; // e.g. "BUS-101"
  plateNumber: string; // e.g. "NGR-MN-428"
  routeId: string;
  routeName: string;
  driverName: string;
  driverId: string;
  driverPhotoUrl?: string;
  location: GeoLocation;
  speed: number; // km/h
  heading: number; // degrees 0-359
  status: DriverAlertLevel;
  lastUpdated: number; // timestamp
  biometrics: DriverBiometrics;
  telemetry: TelemetryLink;
  hardware: VehicleHardwareStatus;
  routeProgress: number; // 0.0 to 1.0 along its route path
  routeDirection: 1 | -1; // forward or reverse loop
  // Route history for breadcrumb path
  history: GeoLocation[];
}

export interface TransitRoute {
  id: string;
  name: string;
  code: string;
  color: string;
  waypoints: GeoLocation[];
  lengthKm: number;
  deadzones: {
    id: string;
    name: string;
    center: GeoLocation;
    radiusMeters: number;
    gsmCoveragePercent: number; // e.g. 0% or 15%
  }[];
}

export interface BaseStationHub {
  id: string;
  name: string;
  location: GeoLocation;
  type: 'CENTRAL_MQTT_HUB' | 'ROADSIDE_LORA_GATEWAY' | 'DEPOT_WIFI';
  activeConnections: number;
  status: 'ONLINE' | 'STANDBY';
}

export interface AlertIncident {
  id: string;
  busId: string;
  busPlate: string;
  driverName: string;
  routeName: string;
  timestamp: number;
  severity: 'INFO' | 'CAUTION' | 'WARNING' | 'CRITICAL';
  type: 'FATIGUE_MICROSLEEP' | 'DROWSINESS_EAR' | 'YAWNING_MAR' | 'HEAD_NODDING' | 'ALCOHOL_DETECTED' | 'GSM_BLACKOUT_RESCUED' | 'LORA_COLLISION_RISK';
  message: string;
  location: GeoLocation;
  acknowledged: boolean;
  acknowledgedBy?: string;
  connectionMode: ConnectionMode;
  valuesSnapshot: {
    ear: number;
    mar: number;
    perclos: number;
    alcoholVolt: number;
    hopCount: number;
  };
}

export interface SimulationPreset {
  id: string;
  name: string;
  description: string;
  busCount: number;
  routeLengthKm: number;
  gsmCoveragePercent: number;
  fatigueRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  spreadingFactor: LoRaSpreadingFactor;
  modelPdr: number;
  modelDelayMs: number;
  loraRescuePercent: number;
}
