import net from 'net';
import express from 'express';
import cors from 'cors';
import { Aedes } from 'aedes';

// Configuration
const MQTT_PORT = parseInt(process.env.MQTT_PORT || '1883', 10);
const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3001', 10);

// Initialize Express App
const app = express();
app.use(express.json());

// Enable CORS for local Vite dev server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Id, X-Client-Version');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Telemetry state store & deduplication
const seenMessageIds = new Map<string, number>(); // messageId -> timestamp
const activeVehicles = new Map<string, any>(); // deviceId -> vehicleState
const recentAlerts: any[] = [];
let totalPacketsReceived = 0;
let lastPacketTime: number | null = null;

// Server-Sent Events (SSE) active subscriber connections
const sseClients = new Set<express.Response>();

function broadcastSse(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Clean up seen message IDs older than 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, ts] of seenMessageIds.entries()) {
    if (now - ts > 120_000) {
      seenMessageIds.delete(id);
    }
  }
}, 30_000);

// Validate Telemetry Payload against Hardware Integration Specification
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateTelemetryPayload(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Payload is not a valid JSON object'] };
  }

  if (!data.deviceId || typeof data.deviceId !== 'string') {
    errors.push('Missing or invalid "deviceId" (string required)');
  }
  if (!data.messageId || typeof data.messageId !== 'string') {
    errors.push('Missing or invalid "messageId" (string required)');
  }
  if (!data.timestamp || typeof data.timestamp !== 'number') {
    errors.push('Missing or invalid "timestamp" (numeric timestamp required)');
  }
  if (!data.location || typeof data.location !== 'object') {
    errors.push('Missing or invalid "location" object');
  } else {
    if (data.location.lat !== null && typeof data.location.lat !== 'number') {
      errors.push('location.lat must be float or null');
    }
    if (data.location.lng !== null && typeof data.location.lng !== 'number') {
      errors.push('location.lng must be float or null');
    }
  }
  if (!data.biometrics || typeof data.biometrics !== 'object') {
    errors.push('Missing or invalid "biometrics" object');
  }
  if (!data.hardware || typeof data.hardware !== 'object') {
    errors.push('Missing or invalid "hardware" object');
  }
  if (!data.transport || typeof data.transport !== 'object') {
    errors.push('Missing or invalid "transport" object');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Core ingestion pipeline (Used by both MQTT and HTTP POST)
function ingestTelemetry(payload: any, source: 'MQTT' | 'HTTP_POST'): { success: boolean; error?: string; duplicate?: boolean } {
  const validation = validateTelemetryPayload(payload);
  if (!validation.valid) {
    console.warn(`[INGEST REJECTED (${source})] Validation errors:`, validation.errors);
    return { success: false, error: validation.errors.join('; ') };
  }

  // Deduplication
  if (seenMessageIds.has(payload.messageId)) {
    console.log(`[DEDUPLICATION (${source})] Dropping duplicate messageId: ${payload.messageId}`);
    return { success: true, duplicate: true };
  }
  seenMessageIds.set(payload.messageId, Date.now());

  totalPacketsReceived++;
  lastPacketTime = Date.now();

  const deviceId = payload.deviceId;
  activeVehicles.set(deviceId, {
    ...payload,
    _ingestSource: source,
    _ingestedAt: Date.now(),
  });

  // Evaluate alerts
  const driverState = payload.biometrics?.driverState || 'NORMAL';
  const isAlcoholAlert = driverState === 'ALCOHOL_ALERT' || (payload.biometrics?.alcoholRiskScore > 0.4);
  const isFatigueAlert = driverState === 'CRITICAL_FATIGUE' || driverState === 'DROWSY';
  
  if (isFatigueAlert || isAlcoholAlert) {
    const alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      busId: deviceId,
      busPlate: `NG-MN-${deviceId.replace(/\D/g, '') || '401'}`,
      driverName: 'Ibrahim Danladi',
      routeName: 'Arterial 1 (Chanchaga - Western Bypass)',
      timestamp: payload.timestamp || Date.now(),
      severity: driverState === 'CRITICAL_FATIGUE' || isAlcoholAlert ? 'CRITICAL' : 'WARNING',
      type: isAlcoholAlert ? 'ALCOHOL_DETECTED' : 'FATIGUE_MICROSLEEP',
      message: isAlcoholAlert 
        ? `BAC alert: Alcohol risk score ${(payload.biometrics?.alcoholRiskScore * 100).toFixed(0)}%` 
        : `Severe driver fatigue detected: EAR ${payload.biometrics?.ear?.toFixed(3)}, PERCLOS ${payload.biometrics?.perclos?.toFixed(1)}%`,
      location: payload.location,
      acknowledged: false,
      connectionMode: payload.transport?.mode === 'LORA' ? 'LORA_RESCUE' : 'WIFI',
      valuesSnapshot: {
        ear: payload.biometrics?.ear || 0.18,
        mar: payload.biometrics?.mar || 0.35,
        perclos: payload.biometrics?.perclos || 22.0,
        alcoholVolt: payload.biometrics?.alcoholVoltage || 0.4,
        hopCount: payload.transport?.loraHopCount || 0,
      }
    };
    recentAlerts.unshift(alert);
    if (recentAlerts.length > 50) recentAlerts.pop();

    console.log(`[ALERT TRIGGERED] Bus ${deviceId} -> ${alert.severity} (${alert.type}): ${alert.message}`);
    broadcastSse('alert', alert);
  }

  console.log(
    `[TELEMETRY INGESTED (${source})] ${deviceId} | State: ${driverState} | ` +
    `GPS: (${payload.location?.lat?.toFixed(5)}, ${payload.location?.lng?.toFixed(5)}) | ` +
    `Speed: ${payload.location?.speed?.toFixed(1)} km/h | Mode: ${payload.transport?.mode}`
  );

  // Broadcast live telemetry update to all connected frontend browsers
  broadcastSse('telemetry', payload);

  return { success: true };
}

// -------------------------------------------------------------
// 1. MQTT Broker Setup (Aedes)
// -------------------------------------------------------------
async function startMqttBroker() {
  const aedes = await Aedes.createBroker();
  const mqttServer = net.createServer(aedes.handle);

  aedes.on('client', (client) => {
    console.log(`[MQTT BROKER] Client connected: ${client.id}`);
  });

  aedes.on('clientDisconnect', (client) => {
    console.log(`[MQTT BROKER] Client disconnected: ${client.id}`);
  });

  aedes.on('publish', (packet, client) => {
    // Ignore internal Aedes broker system packets ($SYS/...)
    if (packet.topic.startsWith('$SYS/')) return;
    if (!client) return; // Ignore internal broker publishes

    const topic = packet.topic;
    // Check if topic is a TransitGuard telemetry topic
    if (topic.startsWith('transitguard/')) {
      try {
        const payloadStr = packet.payload.toString('utf-8');
        const payloadJson = JSON.parse(payloadStr);
        ingestTelemetry(payloadJson, 'MQTT');
      } catch (err: any) {
        console.error(`[MQTT BROKER] Error parsing JSON from topic ${topic}:`, err.message);
      }
    }
  });

  mqttServer.listen(MQTT_PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`>>> TransitGuard MQTT Broker listening on port ${MQTT_PORT} (tcp://0.0.0.0:${MQTT_PORT})`);
    console.log(`=======================================================`);
  });
}

// -------------------------------------------------------------
// 2. HTTP REST & SSE Endpoints (Express)
// -------------------------------------------------------------

// Health & System Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    mqttBroker: {
      port: MQTT_PORT,
      status: 'active',
    },
    httpServer: {
      port: HTTP_PORT,
      status: 'active',
    },
    stats: {
      totalPacketsReceived,
      lastPacketTime,
      activeVehiclesCount: activeVehicles.size,
      connectedSseClients: sseClients.size,
    },
    activeDeviceIds: Array.from(activeVehicles.keys()),
  });
});

// SSE Live Stream for Frontend Dashboard
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);
  console.log(`[SSE] Dashboard client connected. Total connected clients: ${sseClients.size}`);

  // Send initial connected acknowledgement with current fleet snapshot
  res.write(`event: connected\ndata: ${JSON.stringify({
    message: 'TransitGuard Live MQTT Stream Connected',
    totalPacketsReceived,
    vehicles: Array.from(activeVehicles.values()),
    alerts: recentAlerts.slice(0, 10),
  })}\n\n`);

  // Heartbeat ping every 10s to keep connection alive through proxies
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(pingInterval);
    }
  }, 10_000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseClients.delete(res);
    console.log(`[SSE] Dashboard client disconnected. Total clients: ${sseClients.size}`);
  });
});

// Wi-Fi HTTP Direct POST API (PDF Spec Page 10-11)
app.post('/api/telemetry', (req, res) => {
  const result = ingestTelemetry(req.body, 'HTTP_POST');
  if (!result.success) {
    return res.status(400).json({
      status: 'error',
      message: result.error,
    });
  }

  if (result.duplicate) {
    return res.status(409).json({
      status: 'duplicate',
      message: 'Message already received and processed',
    });
  }

  // Specification response (PDF page 11)
  return res.status(200).json({
    status: 'success',
    receivedTimestamp: Date.now(),
    commands: {
      remoteBuzzer: false,
      lcdMessage: null,
    },
  });
});

// Fleet latest state
app.get('/api/fleet', (req, res) => {
  res.json({
    count: activeVehicles.size,
    vehicles: Array.from(activeVehicles.values()),
  });
});

// Recent alerts
app.get('/api/alerts', (req, res) => {
  res.json({
    alerts: recentAlerts,
  });
});

// Start HTTP Server
app.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`>>> TransitGuard HTTP/SSE Backend listening on port ${HTTP_PORT} (http://0.0.0.0:${HTTP_PORT})`);
});

// Launch MQTT Broker
startMqttBroker().catch((err) => {
  console.error('[MQTT BROKER ERROR] Failed to start MQTT broker:', err);
});
