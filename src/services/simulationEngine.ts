import { 
  BusVehicle, 
  GeoLocation, 
  DriverBiometrics, 
  TelemetryLink, 
  VehicleHardwareStatus, 
  DriverAlertLevel, 
  AlertIncident, 
  SimulationPreset, 
  LoRaSpreadingFactor,
  ConnectionMode 
} from '../types/fleet';
import { TRANSIT_ROUTES, BASE_STATIONS, SIMULATION_PRESETS } from '../data/mockRoutes';
import { soundFx } from '../utils/audio';

// Helper for geographical distance calculation (Haversine formula in km)
export function getDistanceKm(loc1: GeoLocation, loc2: GeoLocation): number {
  const R = 6371; // Earth radius in km
  const dLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const dLng = ((loc2.lng - loc1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((loc1.lat * Math.PI) / 180) *
      Math.cos((loc2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate interpolated point along path
export function interpolatePath(waypoints: GeoLocation[], progress: number): { location: GeoLocation; heading: number } {
  if (waypoints.length === 0) return { location: { lat: 9.6178, lng: 6.5564 }, heading: 0 };
  if (waypoints.length === 1) return { location: waypoints[0], heading: 0 };

  const totalSegments = waypoints.length - 1;
  const scaledProgress = Math.max(0, Math.min(0.9999, progress)) * totalSegments;
  const segIndex = Math.floor(scaledProgress);
  const segFraction = scaledProgress - segIndex;

  const p1 = waypoints[segIndex];
  const p2 = waypoints[Math.min(segIndex + 1, waypoints.length - 1)];

  const lat = p1.lat + (p2.lat - p1.lat) * segFraction;
  const lng = p1.lng + (p2.lng - p1.lng) * segFraction;

  // Heading calculation
  const y = Math.sin(((p2.lng - p1.lng) * Math.PI) / 180) * Math.cos((p2.lat * Math.PI) / 180);
  const x =
    Math.cos((p1.lat * Math.PI) / 180) * Math.sin((p2.lat * Math.PI) / 180) -
    Math.sin((p1.lat * Math.PI) / 180) * Math.cos((p2.lat * Math.PI) / 180) * Math.cos(((p2.lng - p1.lng) * Math.PI) / 180);
  let heading = (Math.atan2(y, x) * 180) / Math.PI;
  heading = (heading + 360) % 360;

  return { location: { lat, lng }, heading: Math.round(heading) };
}

// Driver mock roster
const MOCK_DRIVERS = [
  { name: 'Ibrahim Danladi', id: 'DRV-401', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { name: 'Musa Garba', id: 'DRV-402', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { name: 'Chukwuma Eze', id: 'DRV-403', photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
  { name: 'Aliyu Mohammed', id: 'DRV-404', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
  { name: 'Emmanuel Bamidele', id: 'DRV-405', photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { name: 'Yakubu Sani', id: 'DRV-406', photo: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80' },
  { name: 'Sunday Obinna', id: 'DRV-407', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { name: 'Tanimu Bello', id: 'DRV-408', photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { name: 'David Tanko', id: 'DRV-409', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
  { name: 'Haruna Usman', id: 'DRV-410', photo: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80' },
  { name: 'Adebayo Fatai', id: 'DRV-411', photo: 'https://images.unsplash.com/photo-1528892952291-009c663ce843?w=150&auto=format&fit=crop&q=80' },
  { name: 'Salisu Abubakar', id: 'DRV-412', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
];

export const SF_AIRTIME_MAP: Record<LoRaSpreadingFactor, { airtimeMs: number; rangeKm: number; pdr: number }> = {
  SF7: { airtimeMs: 30, rangeKm: 4.3, pdr: 91.2 },
  SF8: { airtimeMs: 52, rangeKm: 5.4, pdr: 92.2 },
  SF9: { airtimeMs: 94, rangeKm: 6.8, pdr: 93.1 },
  SF10: { airtimeMs: 169, rangeKm: 8.6, pdr: 94.8 },
  SF11: { airtimeMs: 337, rangeKm: 10.4, pdr: 97.4 },
  SF12: { airtimeMs: 675, rangeKm: 12.6, pdr: 96.2 },
};

export class FleetSimulationEngine {
  private buses: BusVehicle[] = [];
  private alerts: AlertIncident[] = [];
  private activePreset: SimulationPreset = SIMULATION_PRESETS[0];
  private isRunning: boolean = true;
  private timeMultiplier: number = 1.0;
  private intervalId: number | null = null;
  private onUpdateCallback: ((buses: BusVehicle[], alerts: AlertIncident[]) => void) | null = null;
  private frameCounter: number = 0;

  constructor() {
    this.initPreset(this.activePreset);
  }

  public setUpdateListener(cb: (buses: BusVehicle[], alerts: AlertIncident[]) => void) {
    this.onUpdateCallback = cb;
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.buses, this.alerts);
    }
  }

  public initPreset(preset: SimulationPreset) {
    this.activePreset = preset;
    this.buses = [];
    const count = preset.busCount;

    for (let i = 0; i < count; i++) {
      const route = TRANSIT_ROUTES[i % TRANSIT_ROUTES.length];
      const driver = MOCK_DRIVERS[i % MOCK_DRIVERS.length];
      const progress = (i * (1.0 / count) + 0.05) % 1.0;
      const { location, heading } = interpolatePath(route.waypoints, progress);
      const sf = preset.spreadingFactor;
      const sfInfo = SF_AIRTIME_MAP[sf];

      const initialBiometrics: DriverBiometrics = {
        ear: 0.32 + (Math.random() * 0.04 - 0.02),
        mar: 0.28 + (Math.random() * 0.08 - 0.04),
        perclos: 4.2 + (Math.random() * 2.0 - 1.0),
        headPitch: 2.5 + (Math.random() * 4.0 - 2.0),
        headYaw: 1.0 + (Math.random() * 3.0 - 1.5),
        headRoll: 0.5 + (Math.random() * 2.0 - 1.0),
        alcoholRawADC: 110 + Math.floor(Math.random() * 40),
        alcoholVoltage: 0.35 + Math.random() * 0.08,
        alcoholRiskScore: 0.05,
        isYawning: false,
        isNodding: false,
        isOffRoadGlance: false,
        driverState: 'NORMAL',
      };

      const initialTelemetry: TelemetryLink = {
        mode: 'GSM',
        rssi: -72 - Math.floor(Math.random() * 15),
        snr: 8.5 + Math.random() * 3,
        hopCount: 0,
        spreadingFactor: sf,
        timeOnAirMs: sfInfo.airtimeMs,
        packetSequence: 100 + i * 50,
        bufferedPacketsCount: 0,
        pdrEstimate: preset.modelPdr,
        collisionProbability: 1.2,
      };

      const initialHw: VehicleHardwareStatus = {
        piCpuLoad: 24 + Math.floor(Math.random() * 10),
        piTemperature: 48.2 + Math.random() * 3.0,
        powerDrawWatts: 5.06 + (Math.random() * 0.4 - 0.2),
        batteryVoltage: 12.35 + Math.random() * 0.2,
        satelliteCount: 9 + Math.floor(Math.random() * 3),
        isLocalBuzzerActive: false,
        lcdMessage: 'SYS: OK | GSM LIVE',
      };

      const bus: BusVehicle = {
        id: `BUS-${100 + i + 1}`,
        plateNumber: `NG-MN-${420 + i + 1}`,
        routeId: route.id,
        routeName: route.name,
        driverName: driver.name,
        driverId: driver.id,
        driverPhotoUrl: driver.photo,
        location,
        speed: 38 + Math.floor(Math.random() * 18),
        heading,
        status: 'NORMAL',
        lastUpdated: Date.now(),
        biometrics: initialBiometrics,
        telemetry: initialTelemetry,
        hardware: initialHw,
        routeProgress: progress,
        routeDirection: 1,
        history: [location],
      };

      this.buses.push(bus);
    }

    // Seed a couple of initial incidents to demonstrate alerting
    if (preset.fatigueRiskLevel === 'HIGH' || preset.fatigueRiskLevel === 'EXTREME') {
      this.triggerMicrosleep(this.buses[0]?.id || 'BUS-101', false);
    }

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.buses, this.alerts);
    }
  }

  public start() {
    this.isRunning = true;
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = window.setInterval(() => {
      this.tick();
    }, 1000);
  }

  public pause() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public setSpeedMultiplier(multiplier: number) {
    this.timeMultiplier = multiplier;
  }

  public getSpeedMultiplier(): number {
    return this.timeMultiplier;
  }

  public getBuses(): BusVehicle[] {
    return this.buses;
  }

  public getAlerts(): AlertIncident[] {
    return this.alerts;
  }

  public getActivePreset(): SimulationPreset {
    return this.activePreset;
  }

  /**
   * Main simulation step (called every second)
   */
  public tick() {
    if (!this.isRunning) return;
    this.frameCounter++;

    const now = Date.now();
    const routeSpeedFactor = 0.0008 * this.timeMultiplier;

    // Calculate pure-ALOHA channel collision risk for the entire fleet:
    // P_coll = 1 - exp(-2 * N * T_air / T_int)
    const sfInfo = SF_AIRTIME_MAP[this.activePreset.spreadingFactor];
    const nNodes = this.buses.length;
    const tAirSec = sfInfo.airtimeMs / 1000.0;
    const tIntSec = 30.0; // 30 second standard update interval
    const fleetCollisionProb = Math.min(99.9, Math.max(0.2, (1 - Math.exp((-2 * nNodes * tAirSec) / tIntSec)) * 100));

    // Update each bus
    this.buses = this.buses.map((bus) => {
      const route = TRANSIT_ROUTES.find((r) => r.id === bus.routeId) || TRANSIT_ROUTES[0];
      
      // Advance route progress
      let newProgress = bus.routeProgress + routeSpeedFactor * bus.routeDirection;
      let newDirection = bus.routeDirection;
      if (newProgress >= 1.0) {
        newProgress = 1.0;
        newDirection = -1;
      } else if (newProgress <= 0.0) {
        newProgress = 0.0;
        newDirection = 1;
      }

      const { location: newLocation, heading: newHeading } = interpolatePath(route.waypoints, newProgress);

      // Check if bus is in any Cellular Dead-zone
      let inDeadzone = false;
      let deadzoneName = '';
      for (const dz of route.deadzones) {
        const distToDzCenterKm = getDistanceKm(newLocation, dz.center);
        if (distToDzCenterKm * 1000 <= dz.radiusMeters) {
          inDeadzone = true;
          deadzoneName = dz.name;
          break;
        }
      }

      // Check communication mode & LoRa rescue multi-hop logic
      let newMode: ConnectionMode = bus.telemetry.mode;
      let newRssi = bus.telemetry.rssi;
      let newHopCount = bus.telemetry.hopCount;
      let relayedViaId: string | undefined = undefined;
      let bufferedPackets = bus.telemetry.bufferedPacketsCount;

      if (inDeadzone) {
        if (newMode !== 'LORA_RESCUE') {
          newMode = 'LORA_RESCUE';
          soundFx.playLoRaRescuePing();
          this.createAlert({
            busId: bus.id,
            busPlate: bus.plateNumber,
            driverName: bus.driverName,
            routeName: bus.routeName,
            severity: 'INFO',
            type: 'GSM_BLACKOUT_RESCUED',
            message: `GSM Blackout in ${deadzoneName}. LoRa Store-and-Forward Rescue link established.`,
            location: newLocation,
            connectionMode: 'LORA_RESCUE',
            valuesSnapshot: {
              ear: bus.biometrics.ear,
              mar: bus.biometrics.mar,
              perclos: bus.biometrics.perclos,
              alcoholVolt: bus.biometrics.alcoholVoltage,
              hopCount: 1,
            },
          });
        }

        // LoRa RSSI drops based on distance to nearest relay/hub
        newRssi = -95 - Math.floor(Math.random() * 20);

        // Find nearest peer bus to act as Relay
        const otherBuses = this.buses.filter((b) => b.id !== bus.id);
        let nearestDist = Infinity;
        let nearestPeer: BusVehicle | null = null;
        for (const peer of otherBuses) {
          const d = getDistanceKm(newLocation, peer.location);
          if (d < nearestDist) {
            nearestDist = d;
            nearestPeer = peer;
          }
        }

        // SF10 maximum range is 8.6km from paper
        if (nearestPeer && nearestDist <= sfInfo.rangeKm) {
          relayedViaId = nearestPeer.id;
          newHopCount = nearestPeer.telemetry.mode === 'GSM' ? 1 : 2;
          if (bufferedPackets > 0) {
            bufferedPackets = Math.max(0, bufferedPackets - 1); // Flush buffer through relay
          }
        } else {
          // No peer in range; buffer packet locally in SQLite
          newHopCount = 0;
          relayedViaId = undefined;
          bufferedPackets = Math.min(50, bufferedPackets + 1);
        }
      } else {
        // Normal GSM / Wi-Fi coverage
        newMode = 'GSM';
        newRssi = -68 - Math.floor(Math.random() * 14);
        newHopCount = 0;
        relayedViaId = undefined;
        if (bufferedPackets > 0) {
          bufferedPackets = 0; // Immediate flush upon GSM reconnect
        }
      }

      // Biometrics continuous realistic variance
      let ear = bus.biometrics.ear;
      let mar = bus.biometrics.mar;
      let perclos = bus.biometrics.perclos;
      let headPitch = bus.biometrics.headPitch;
      let headYaw = bus.biometrics.headYaw;
      let alcoholVolt = bus.biometrics.alcoholVoltage;
      let alcoholRaw = bus.biometrics.alcoholRawADC;
      let alcoholRisk = bus.biometrics.alcoholRiskScore;
      let driverState: DriverAlertLevel = bus.status;

      // Handle ongoing transient state decay back to normal if not explicitly forced
      if (bus.biometrics.driverState === 'CRITICAL_FATIGUE') {
        // Slowly recover or remain critical for demo
        ear = Math.min(0.31, ear + 0.005);
        if (ear > 0.28) {
          driverState = 'NORMAL';
          perclos = Math.max(5.0, perclos - 1.5);
        }
      } else if (bus.biometrics.driverState === 'DROWSY' || bus.biometrics.driverState === 'CAUTION') {
        ear = 0.23 + (Math.random() * 0.04 - 0.02);
        perclos = Math.min(18.0, Math.max(10.0, perclos + 0.2));
      } else if (bus.biometrics.driverState === 'ALCOHOL_ALERT') {
        // High alcohol remains until cleared
        alcoholVolt = 1.15 + (Math.random() * 0.1 - 0.05);
        alcoholRaw = Math.floor((alcoholVolt / 3.3) * 1023);
        alcoholRisk = 0.88;
      } else {
        // Normal state subtle organic fluctuations
        ear = Math.max(0.29, Math.min(0.36, ear + (Math.random() * 0.02 - 0.01)));
        mar = Math.max(0.20, Math.min(0.45, mar + (Math.random() * 0.03 - 0.015)));
        perclos = Math.max(3.0, Math.min(8.5, perclos + (Math.random() * 0.5 - 0.25)));
        headPitch = Math.max(-10, Math.min(12, headPitch + (Math.random() * 1.5 - 0.75)));
        headYaw = Math.max(-15, Math.min(15, headYaw + (Math.random() * 2.0 - 1.0)));
        alcoholVolt = Math.max(0.25, Math.min(0.42, alcoholVolt + (Math.random() * 0.02 - 0.01)));
        alcoholRaw = Math.floor((alcoholVolt / 3.3) * 1023);
        alcoholRisk = 0.04;
        driverState = 'NORMAL';
      }

      // Random spontaneous event injector based on preset fatigue risk
      if (this.frameCounter % 15 === 0 && Math.random() < 0.35) {
        if (this.activePreset.fatigueRiskLevel === 'HIGH' || this.activePreset.fatigueRiskLevel === 'EXTREME') {
          if (Math.random() < 0.25 && bus.status === 'NORMAL') {
            // Spontaneous yawn or microsleep
            if (Math.random() < 0.5) {
              this.triggerYawn(bus.id);
            } else {
              this.triggerMicrosleep(bus.id);
            }
          }
        }
      }

      // Hardware status updates
      const powerBase = newMode === 'LORA_RESCUE' ? 4.95 : 5.08;
      const powerPeak = driverState === 'CRITICAL_FATIGUE' || driverState === 'ALCOHOL_ALERT' ? 6.8 : powerBase;

      const updatedHistory = [...bus.history.slice(-25), newLocation];

      const lcdMsg = driverState === 'CRITICAL_FATIGUE' 
        ? '!! FATIGUE ALERT !!' 
        : driverState === 'ALCOHOL_ALERT' 
        ? '!! ALCOHOL WARNING !!' 
        : newMode === 'LORA_RESCUE' 
        ? `LORA RESCUE h=${newHopCount}` 
        : 'SYS: OK | GSM LIVE';

      return {
        ...bus,
        location: newLocation,
        heading: newHeading,
        speed: Math.max(20, Math.min(75, bus.speed + Math.floor(Math.random() * 5 - 2))),
        status: driverState,
        lastUpdated: now,
        routeProgress: newProgress,
        routeDirection: newDirection,
        history: updatedHistory,
        biometrics: {
          ...bus.biometrics,
          ear: parseFloat(ear.toFixed(3)),
          mar: parseFloat(mar.toFixed(3)),
          perclos: parseFloat(perclos.toFixed(1)),
          headPitch: parseFloat(headPitch.toFixed(1)),
          headYaw: parseFloat(headYaw.toFixed(1)),
          headRoll: parseFloat((Math.random() * 2 - 1).toFixed(1)),
          alcoholVoltage: parseFloat(alcoholVolt.toFixed(2)),
          alcoholRawADC: alcoholRaw,
          alcoholRiskScore: parseFloat(alcoholRisk.toFixed(2)),
          isYawning: mar > 0.65,
          isNodding: headPitch > 20,
          isOffRoadGlance: Math.abs(headYaw) > 25,
          driverState,
        },
        telemetry: {
          ...bus.telemetry,
          mode: newMode,
          rssi: newRssi,
          snr: parseFloat((7.0 + Math.random() * 4).toFixed(1)),
          hopCount: newHopCount,
          relayedViaNodeId: relayedViaId,
          packetSequence: bus.telemetry.packetSequence + 1,
          bufferedPacketsCount: bufferedPackets,
          pdrEstimate: this.activePreset.modelPdr,
          collisionProbability: parseFloat(fleetCollisionProb.toFixed(1)),
        },
        hardware: {
          ...bus.hardware,
          piCpuLoad: Math.floor(22 + (driverState !== 'NORMAL' ? 25 : 0) + Math.random() * 8),
          piTemperature: parseFloat((48.0 + (driverState !== 'NORMAL' ? 4.5 : 0) + Math.random() * 2).toFixed(1)),
          powerDrawWatts: parseFloat((powerPeak + (Math.random() * 0.3 - 0.15)).toFixed(2)),
          batteryVoltage: parseFloat((12.35 + Math.random() * 0.1).toFixed(2)),
          satelliteCount: inDeadzone ? 8 : 10 + Math.floor(Math.random() * 2),
          isLocalBuzzerActive: driverState === 'CRITICAL_FATIGUE' || driverState === 'ALCOHOL_ALERT',
          lcdMessage: lcdMsg,
        },
      };
    });

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.buses, this.alerts);
    }
  }

  /**
   * Inject Microsleep on a bus
   */
  public triggerMicrosleep(busId: string, playSound = true) {
    const bus = this.buses.find((b) => b.id === busId);
    if (!bus) return;

    bus.status = 'CRITICAL_FATIGUE';
    bus.biometrics.driverState = 'CRITICAL_FATIGUE';
    bus.biometrics.ear = 0.14; // Extreme eye closure
    bus.biometrics.perclos = 28.5; // High PERCLOS > 15%
    bus.biometrics.headPitch = 26.0; // Head nodding down
    bus.biometrics.isNodding = true;
    bus.hardware.isLocalBuzzerActive = true;
    bus.hardware.lcdMessage = 'CRITICAL FATIGUE!';

    if (playSound) soundFx.playCriticalAlarm();

    this.createAlert({
      busId: bus.id,
      busPlate: bus.plateNumber,
      driverName: bus.driverName,
      routeName: bus.routeName,
      severity: 'CRITICAL',
      type: 'FATIGUE_MICROSLEEP',
      message: `CRITICAL: Microsleep detected on ${bus.plateNumber} (Driver: ${bus.driverName}). EAR=0.14, PERCLOS=28.5%. In-Cabin buzzer active.`,
      location: bus.location,
      connectionMode: bus.telemetry.mode,
      valuesSnapshot: {
        ear: 0.14,
        mar: bus.biometrics.mar,
        perclos: 28.5,
        alcoholVolt: bus.biometrics.alcoholVoltage,
        hopCount: bus.telemetry.hopCount,
      },
    });

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.buses, this.alerts);
    }
  }

  /**
   * Inject Alcohol Alert on a bus
   */
  public triggerAlcoholAlert(busId: string) {
    const bus = this.buses.find((b) => b.id === busId);
    if (!bus) return;

    bus.status = 'ALCOHOL_ALERT';
    bus.biometrics.driverState = 'ALCOHOL_ALERT';
    bus.biometrics.alcoholVoltage = 1.35; // Above calibrated 0.9V alert threshold
    bus.biometrics.alcoholRawADC = 720;
    bus.biometrics.alcoholRiskScore = 0.92;
    bus.hardware.isLocalBuzzerActive = true;
    bus.hardware.lcdMessage = 'ALCOHOL RISK ALERT';

    soundFx.playCriticalAlarm();

    this.createAlert({
      busId: bus.id,
      busPlate: bus.plateNumber,
      driverName: bus.driverName,
      routeName: bus.routeName,
      severity: 'CRITICAL',
      type: 'ALCOHOL_DETECTED',
      message: `ALCOHOL VAPOUR ALERT: MQ-3 output 1.35V (ADC: 720) on ${bus.plateNumber}. Above safety screening limit.`,
      location: bus.location,
      connectionMode: bus.telemetry.mode,
      valuesSnapshot: {
        ear: bus.biometrics.ear,
        mar: bus.biometrics.mar,
        perclos: bus.biometrics.perclos,
        alcoholVolt: 1.35,
        hopCount: bus.telemetry.hopCount,
      },
    });

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.buses, this.alerts);
    }
  }

  /**
   * Inject Yawn (MAR) on a bus
   */
  public triggerYawn(busId: string) {
    const bus = this.buses.find((b) => b.id === busId);
    if (!bus) return;

    bus.biometrics.mar = 0.78;
    bus.biometrics.isYawning = true;
    bus.status = 'CAUTION';
    bus.biometrics.driverState = 'CAUTION';
    bus.hardware.lcdMessage = 'CAUTION: YAWN DETECTED';

    soundFx.playCautionAlert();

    this.createAlert({
      busId: bus.id,
      busPlate: bus.plateNumber,
      driverName: bus.driverName,
      routeName: bus.routeName,
      severity: 'CAUTION',
      type: 'YAWNING_MAR',
      message: `Prolonged yawning detected on ${bus.plateNumber}. MAR=0.78 for consecutive frames.`,
      location: bus.location,
      connectionMode: bus.telemetry.mode,
      valuesSnapshot: {
        ear: bus.biometrics.ear,
        mar: 0.78,
        perclos: bus.biometrics.perclos,
        alcoholVolt: bus.biometrics.alcoholVoltage,
        hopCount: bus.telemetry.hopCount,
      },
    });

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.buses, this.alerts);
    }
  }

  /**
   * Clear or Acknowledge Alert
   */
  public acknowledgeAlert(alertId: string, operatorName: string = 'HQ Operator') {
    this.alerts = this.alerts.map((a) => (a.id === alertId ? { ...a, acknowledged: true, acknowledgedBy: operatorName } : a));
    soundFx.playClick();
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.buses, this.alerts);
    }
  }

  /**
   * Clear Driver State back to Normal
   */
  public resetDriverState(busId: string) {
    const bus = this.buses.find((b) => b.id === busId);
    if (!bus) return;

    bus.status = 'NORMAL';
    bus.biometrics.driverState = 'NORMAL';
    bus.biometrics.ear = 0.33;
    bus.biometrics.mar = 0.28;
    bus.biometrics.perclos = 4.5;
    bus.biometrics.headPitch = 2.0;
    bus.biometrics.headYaw = 0.0;
    bus.biometrics.alcoholVoltage = 0.32;
    bus.biometrics.alcoholRawADC = 105;
    bus.biometrics.alcoholRiskScore = 0.04;
    bus.hardware.isLocalBuzzerActive = false;
    bus.hardware.lcdMessage = 'SYS: OK | GSM LIVE';

    soundFx.playClick();

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.buses, this.alerts);
    }
  }

  /**
   * Dispatch remote In-Cabin Buzzer
   */
  public dispatchInCabinBuzzer(busId: string) {
    const bus = this.buses.find((b) => b.id === busId);
    if (!bus) return;

    bus.hardware.isLocalBuzzerActive = true;
    bus.hardware.lcdMessage = 'HQ DISPATCH ALERT';
    soundFx.playCautionAlert();

    setTimeout(() => {
      if (bus.status === 'NORMAL') {
        bus.hardware.isLocalBuzzerActive = false;
        bus.hardware.lcdMessage = 'SYS: OK | GSM LIVE';
      }
      if (this.onUpdateCallback) {
        this.onUpdateCallback(this.buses, this.alerts);
      }
    }, 4000);

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.buses, this.alerts);
    }
  }

  /**
   * Update LCD Message
   */
  public sendLcdMessage(busId: string, message: string) {
    const bus = this.buses.find((b) => b.id === busId);
    if (!bus) return;
    bus.hardware.lcdMessage = message.slice(0, 16).toUpperCase();
    soundFx.playClick();
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.buses, this.alerts);
    }
  }

  /**
   * Update Spreading Factor (SF7 - SF12)
   */
  public setSpreadingFactor(busId: string, sf: LoRaSpreadingFactor) {
    const bus = this.buses.find((b) => b.id === busId);
    if (!bus) return;
    const sfInfo = SF_AIRTIME_MAP[sf];
    bus.telemetry.spreadingFactor = sf;
    bus.telemetry.timeOnAirMs = sfInfo.airtimeMs;
    bus.telemetry.pdrEstimate = sfInfo.pdr;
    soundFx.playClick();
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.buses, this.alerts);
    }
  }

  private createAlert(alertData: Omit<AlertIncident, 'id' | 'timestamp' | 'acknowledged'>) {
    const newAlert: AlertIncident = {
      ...alertData,
      id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      acknowledged: false,
    };
    this.alerts = [newAlert, ...this.alerts.slice(0, 49)];
  }
}

export const simulationEngine = new FleetSimulationEngine();
