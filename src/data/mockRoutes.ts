import { TransitRoute, BaseStationHub, SimulationPreset } from '../types/fleet';

/**
 * Realistic transit routes, waypoints, cellular dead-zones, and MQTT Hub Base Stations.
 * Contextualized to the Minna - Abuja public transport artery & Minna Central transit network (FUT Minna study).
 */

export const TRANSIT_ROUTES: TransitRoute[] = [
  {
    id: 'ROUTE-101',
    name: 'Minna City Express (Gidan Kwano - Bosso)',
    code: 'MC-1',
    color: '#06b6d4', // Cyan
    lengthKm: 16.4,
    waypoints: [
      { lat: 9.5305, lng: 6.4485 }, // Gidan Kwano Campus Terminal
      { lat: 9.5442, lng: 6.4678 },
      { lat: 9.5601, lng: 6.4952 }, // Western Bypass Junction
      { lat: 9.5823, lng: 6.5210 }, // Chanchaga Bridge
      { lat: 9.6015, lng: 6.5412 }, // Mobil Roundabout
      { lat: 9.6178, lng: 6.5564 }, // Central Market Hub
      { lat: 9.6380, lng: 6.5702 }, // Bosso Campus Terminal
      { lat: 9.6480, lng: 6.5520 }, // Bosso Estate
      { lat: 9.6250, lng: 6.5310 }, // Maitumbi Link
      { lat: 9.5823, lng: 6.5210 }, // Chanchaga Loop
      { lat: 9.5442, lng: 6.4678 },
      { lat: 9.5305, lng: 6.4485 },
    ],
    deadzones: [
      {
        id: 'DZ-1',
        name: 'Chanchaga Valley GSM Deadzone',
        center: { lat: 9.5750, lng: 6.5120 },
        radiusMeters: 1400,
        gsmCoveragePercent: 5,
      },
      {
        id: 'DZ-2',
        name: 'Western Bypass Low-Signal Sector',
        center: { lat: 9.5520, lng: 6.4810 },
        radiusMeters: 1100,
        gsmCoveragePercent: 12,
      },
    ],
  },
  {
    id: 'ROUTE-202',
    name: 'Inter-State Commercial Arterial (Minna - Suleja - Abuja)',
    code: 'NA-2',
    color: '#3b82f6', // Blue
    lengthKm: 28.5,
    waypoints: [
      { lat: 9.6178, lng: 6.5564 }, // Minna Central Hub
      { lat: 9.6050, lng: 6.5920 }, // Paiko Road Junction
      { lat: 9.5620, lng: 6.6450 }, // Paiko Town Depot
      { lat: 9.5100, lng: 6.7200 }, // Gurara Escarpment
      { lat: 9.4600, lng: 6.7900 }, // Lambata Bypass
      { lat: 9.4100, lng: 6.8600 }, // Suleja West
      { lat: 9.3800, lng: 6.9200 }, // Madalla Toll Corridor
      { lat: 9.4100, lng: 6.8600 },
      { lat: 9.4600, lng: 6.7900 },
      { lat: 9.5620, lng: 6.6450 },
      { lat: 9.6178, lng: 6.5564 },
    ],
    deadzones: [
      {
        id: 'DZ-3',
        name: 'Gurara Forest Inter-Hub Deadzone',
        center: { lat: 9.5250, lng: 6.7000 },
        radiusMeters: 2800,
        gsmCoveragePercent: 0,
      },
      {
        id: 'DZ-4',
        name: 'Lambata Hills Cellular Shadow',
        center: { lat: 9.4750, lng: 6.7750 },
        radiusMeters: 2200,
        gsmCoveragePercent: 8,
      },
    ],
  },
  {
    id: 'ROUTE-303',
    name: 'Rural Feeder Corridor (Bida - Minna Link)',
    code: 'RF-3',
    color: '#10b981', // Emerald
    lengthKm: 22.0,
    waypoints: [
      { lat: 9.5305, lng: 6.4485 }, // Gidan Kwano
      { lat: 9.4850, lng: 6.3980 }, // Kataeregi Outpost
      { lat: 9.4200, lng: 6.3250 }, // Garatu Rural Depot
      { lat: 9.3500, lng: 6.2400 }, // Bida North Gate
      { lat: 9.4200, lng: 6.3250 },
      { lat: 9.4850, lng: 6.3980 },
      { lat: 9.5305, lng: 6.4485 },
    ],
    deadzones: [
      {
        id: 'DZ-5',
        name: 'Kataeregi Sparse Coverage Gap',
        center: { lat: 9.4500, lng: 6.3600 },
        radiusMeters: 3200,
        gsmCoveragePercent: 0,
      },
    ],
  },
];

export const BASE_STATIONS: BaseStationHub[] = [
  {
    id: 'HUB-CENTRAL',
    name: 'Minna Transit Operations Hub (MQTT Primary)',
    location: { lat: 9.6178, lng: 6.5564 },
    type: 'CENTRAL_MQTT_HUB',
    activeConnections: 14,
    status: 'ONLINE',
  },
  {
    id: 'HUB-KWANO',
    name: 'Gidan Kwano Terminal Gateway (LoRa Multi-Hub)',
    location: { lat: 9.5305, lng: 6.4485 },
    type: 'ROADSIDE_LORA_GATEWAY',
    activeConnections: 6,
    status: 'ONLINE',
  },
  {
    id: 'HUB-PAIKO',
    name: 'Paiko Sub-Station Relay',
    location: { lat: 9.5620, lng: 6.6450 },
    type: 'ROADSIDE_LORA_GATEWAY',
    activeConnections: 4,
    status: 'ONLINE',
  },
  {
    id: 'HUB-BOSSO',
    name: 'Bosso Depot Wi-Fi / MQTT Server',
    location: { lat: 9.6380, lng: 6.5702 },
    type: 'DEPOT_WIFI',
    activeConnections: 8,
    status: 'ONLINE',
  },
];

/**
 * 5 Integrated Simulation Scenarios directly from Thesis Chapter 4 (Table 4.6)
 */
export const SIMULATION_PRESETS: SimulationPreset[] = [
  {
    id: 'SCENARIO-CITY',
    name: 'Baseline City Corridor',
    description: '5 buses on 8km urban route with 80% GSM coverage. High PDR (99.1%), fast direct delivery, minimal LoRa rescue required.',
    busCount: 5,
    routeLengthKm: 8.0,
    gsmCoveragePercent: 80,
    fatigueRiskLevel: 'LOW',
    spreadingFactor: 'SF10',
    modelPdr: 99.1,
    modelDelayMs: 77,
    loraRescuePercent: 19.2,
  },
  {
    id: 'SCENARIO-PEAK',
    name: 'Peak-Hour Dense Fleet Traffic',
    description: '12 buses in high density corridor. Evaluates LoRa channel collision probability ($P_{coll}$) and store-and-forward relay mesh throughput.',
    busCount: 12,
    routeLengthKm: 8.0,
    gsmCoveragePercent: 80,
    fatigueRiskLevel: 'MEDIUM',
    spreadingFactor: 'SF10',
    modelPdr: 99.1,
    modelDelayMs: 77,
    loraRescuePercent: 19.1,
  },
  {
    id: 'SCENARIO-RURAL',
    name: 'Rural Poor-Coverage Route (25km)',
    description: '3 sparse buses in 30% GSM coverage. Demonstrates LoRa multi-hop store-and-forward rescue across cellular dead-zones.',
    busCount: 3,
    routeLengthKm: 25.0,
    gsmCoveragePercent: 30,
    fatigueRiskLevel: 'LOW',
    spreadingFactor: 'SF10',
    modelPdr: 52.9,
    modelDelayMs: 378,
    loraRescuePercent: 42.4,
  },
  {
    id: 'SCENARIO-NIGHT',
    name: 'Night Shift Fatigue-Risk Route',
    description: '4 buses on late-night highway. Active driver monitoring test with simulated microsleeps, yawning, and PERCLOS escalation.',
    busCount: 4,
    routeLengthKm: 10.0,
    gsmCoveragePercent: 60,
    fatigueRiskLevel: 'HIGH',
    spreadingFactor: 'SF10',
    modelPdr: 93.4,
    modelDelayMs: 102,
    loraRescuePercent: 35.9,
  },
  {
    id: 'SCENARIO-WORST',
    name: 'Combined Worst-Case Stress Test',
    description: '20 buses, 15km mixed terrain, 50% GSM coverage with high fatigue events and LoRa channel contention under multi-hop mesh.',
    busCount: 20,
    routeLengthKm: 15.0,
    gsmCoveragePercent: 50,
    fatigueRiskLevel: 'EXTREME',
    spreadingFactor: 'SF10',
    modelPdr: 86.0,
    modelDelayMs: 119,
    loraRescuePercent: 42.7,
  },
];
