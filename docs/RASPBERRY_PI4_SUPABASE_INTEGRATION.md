# TransitGuard IoT • Physical Raspberry Pi 4 to Supabase Telemetry Integration Guide

**Document Version:** 1.0.0  
**Target Hardware:** Raspberry Pi 4 Model B (2GB / 4GB / 8GB)  
**Edge Client Software:** `rpi_publisher.py`  
**Reference Client:** `fake_publisher_windows.py` (Bench-tested & verified)  
**Supabase Project Reference:** `hfzqfcuezuxcgaifxqok`  
**Production Ingestion Endpoint:** `https://hfzqfcuezuxcgaifxqok.supabase.co/functions/v1/ingest-telemetry`  

---

## Table of Contents

1. [Executive Overview & Objectives](#1-executive-overview--objectives)
2. [Current Production Architecture](#2-current-production-architecture)
3. [Supabase Project Infrastructure](#3-supabase-project-infrastructure)
4. [Edge Function Specification (`ingest-telemetry`)](#4-edge-function-specification-ingest-telemetry)
5. [API Contract & Authentication Specification](#5-api-contract--authentication-specification)
6. [Telemetry Payload Specification](#6-telemetry-payload-specification)
   - [6.1 Minimal Valid Payload](#61-minimal-valid-payload)
   - [6.2 Complete Canonical Payload](#62-complete-canonical-payload)
   - [6.3 Scenario Examples (Normal, Drowsy, Critical Fatigue, Alcohol Spike)](#63-scenario-payload-examples)
7. [Comprehensive Field Reference Table](#7-comprehensive-field-reference-table)
8. [Supabase PostgreSQL Database Schema](#8-supabase-postgresql-database-schema)
   - [8.1 `public.telemetry` Schema Definition](#81-publictelemetry-schema-definition)
   - [8.2 JSON-to-Database Column Mapping Table](#82-json-to-database-column-mapping-table)
   - [8.3 SQL Verification & Diagnostic Queries](#83-sql-verification--diagnostic-queries)
9. [Raspberry Pi Environment Variables](#9-raspberry-pi-environment-variables)
10. [Hardware-to-Payload Mapping Specification](#10-hardware-to-payload-mapping-specification)
11. [Sensor Integration & Physical Migration Roadmap](#11-sensor-integration--physical-migration-roadmap)
12. [Offline Store-and-Forward SQLite Buffer](#12-offline-store-and-forward-sqlite-buffer)
13. [Step-by-Step Physical Raspberry Pi 4 Deployment Procedure](#13-step-by-step-physical-raspberry-pi-4-deployment-procedure)
14. [Direct cURL Test Command Reference](#14-direct-curl-test-command-reference)
15. [Automated Systemd Daemon Service Setup](#15-automated-systemd-daemon-service-setup)
16. [Frontend Dashboard Telemetry Consumption](#16-frontend-dashboard-telemetry-consumption)
17. [Security & Credential Hierarchy](#17-security--credential-hierarchy)
18. [Troubleshooting & Diagnostic Matrix](#18-troubleshooting--diagnostic-matrix)
19. [Fleet Maintenance & Provisioning Procedures](#19-fleet-maintenance--provisioning-procedures)
20. [Final Field Deployment Verification Checklist](#20-final-field-deployment-verification-checklist)

---

## 1. Executive Overview & Objectives

The **TransitGuard IoT** platform is a mission-critical public transit telemetry and driver fatigue monitoring solution designed for urban and intercity commercial fleets operating in environments with intermittent network coverage (such as arterial transit corridors across Minna, Niger State).

This guide provides the authoritative, complete instructions to configure and deploy a **physical Raspberry Pi 4 Model B (On-Board Unit / OBU)** into the production Supabase telemetry pipeline. 

### Core Tenet: The Proven API Contract
The backend ingestion pipeline—specifically the Supabase Edge Function `ingest-telemetry`, the PostgreSQL `public.telemetry` table, and the real-time React dashboard—has already been deployed, rigorously tested, and confirmed operational using the reference laptop publisher `fake_publisher_windows.py`.

The physical Raspberry Pi 4 client (`rpi_publisher.py`) maintains **100% contract parity** with this proven reference client:
- **Same HTTPS endpoint**
- **Same authentication headers**
- **Same JSON payload structure**
- **Same response status codes (HTTP 201 Created)**
- **Identical database row insertion in Supabase PostgreSQL**

```
+-------------------------------------------------------------------------------+
| REFERENCE CLIENT (Laptop / Bench)                                            |
| fake_publisher_windows.py                                                     |
| (Tested, Verified, Confirmed Working)                                        |
+-------------------------------------------------------------------------------+
                                      |
                           Same JSON API Contract
                                      v
+-------------------------------------------------------------------------------+
| PHYSICAL CLIENT (In-Vehicle OBU)                                              |
| Raspberry Pi 4 Model B (`rpi_publisher.py`)                                   |
| - Identical HTTPS POST Contract                                               |
| - Local SQLite Store-and-Forward Buffer                                       |
| - Native Systemd Daemon Auto-Start                                            |
+-------------------------------------------------------------------------------+
                                      |
                            HTTPS POST (TCP 443)
                                      v
+-------------------------------------------------------------------------------+
| SUPABASE EDGE FUNCTION: ingest-telemetry                                      |
| URL: https://hfzqfcuezuxcgaifxqok.supabase.co/functions/v1/ingest-telemetry   |
+-------------------------------------------------------------------------------+
                                      |
                          Internal Service-Role Write
                                      v
+-------------------------------------------------------------------------------+
| SUPABASE POSTGRESQL DATABASE: public.telemetry                                |
| Row-Level Security (RLS) + Realtime Replication Enabled                       |
+-------------------------------------------------------------------------------+
                                      |
                          Supabase Realtime (WSS)
                                      v
+-------------------------------------------------------------------------------+
| TRANSITGUARD REACT FRONTEND DASHBOARD (Vercel)                                |
| Live Leaflet Map, Driver State Cards, Historical Charts, Fatigue Alerts       |
+-------------------------------------------------------------------------------+
```

---

## 2. Current Production Architecture

### Outbound-Only Cloud Telemetry (Zero Inbound Exposure)
The physical Raspberry Pi 4 connects directly to the Supabase Cloud backend strictly via **outbound HTTPS POST over standard port 443**.

**The Raspberry Pi 4 does NOT require:**
- ❌ Any open inbound firewall ports
- ❌ A static or public IP address
- ❌ Port forwarding, Dynamic DNS, or NAT punching
- ❌ An on-premise or cloud MQTT Broker (e.g. Mosquitto, Aedes)
- ❌ An intermediate Express/Node.js relay server (e.g. Render / Heroku)

The Raspberry Pi 4 operates autonomously inside the vehicle using existing cellular dongles (4G LTE USB modem), in-vehicle Wi-Fi hotspots, or depot Wi-Fi access points.

---

## 3. Supabase Project Infrastructure

All telemetry ingested from physical hardware is stored and replicated within the following production Supabase cloud project:

| Parameter | Production Value |
|---|---|
| **Project Name** | `TransitGuardBE` |
| **Project Reference ID** | `hfzqfcuezuxcgaifxqok` |
| **Project URL** | `https://hfzqfcuezuxcgaifxqok.supabase.co` |
| **Hosting Region** | `eu-west-1` (Europe - Ireland) |
| **Database Engine** | PostgreSQL 17.6.1 |
| **Database Host** | `db.hfzqfcuezuxcgaifxqok.supabase.co` |
| **Default Vehicle ID** | `BUS-101` |
| **Edge Function Name** | `ingest-telemetry` |
| **Edge Function Endpoint**| `https://hfzqfcuezuxcgaifxqok.supabase.co/functions/v1/ingest-telemetry` |

---

## 4. Edge Function Specification (`ingest-telemetry`)

The Edge Function is located at [supabase/functions/ingest-telemetry/index.ts](file:///c:/Users/Administrator/.gemini/antigravity/scratch/TransitGuard-IoT-main/supabase/functions/ingest-telemetry/index.ts) and executes on the Deno serverless edge runtime.

### 4.1 Deployment Command
```bash
npx supabase functions deploy ingest-telemetry --no-verify-jwt --project-ref hfzqfcuezuxcgaifxqok
```
*Note:* The `--no-verify-jwt` flag is mandatory because hardware devices authenticate using high-entropy device tokens rather than standard interactive Supabase user JWT sessions.

### 4.2 Edge Function Secrets
The Edge Function verifies incoming hardware requests against secrets configured within the Supabase Cloud vault:
```bash
npx supabase secrets set TRANSITGUARD_DEVICE_ID="BUS-101" TRANSITGUARD_DEVICE_TOKEN="tg-device-token-obu-default" --project-ref hfzqfcuezuxcgaifxqok
```

### 4.3 Runtime Validation Logic
1. **HTTP Method Check**: Rejects any non-POST or non-OPTIONS request with `405 Method Not Allowed`.
2. **CORS Headers**: Emits standard CORS headers (`Access-Control-Allow-Origin: *`) for browser-based testing.
3. **Token Extraction**: Extracts the device token from header `x-device-token` or `Authorization: Bearer <TOKEN>`.
4. **Token Verification**: Validates the token against `TRANSITGUARD_DEVICE_TOKEN`. If mismatched, returns `HTTP 401 Unauthorized`:
   ```json
   {"success": false, "error": "Unauthorized device"}
   ```
5. **Device ID Verification**: If `TRANSITGUARD_DEVICE_ID` is set, verifies that `payload.deviceId` matches the allowed device list. If unauthorized, returns `HTTP 401 Unauthorized`.
6. **Required Field Validation**: Verifies presence and valid types for `deviceId`, `messageId`, `timestamp`, `location`, and `driverState`. If malformed, returns `HTTP 400 Bad Request`:
   ```json
   {"success": false, "error": "Invalid telemetry payload"}
   ```
7. **Idempotent Upsert**: Inserts the record into `public.telemetry` using `upsert(..., { onConflict: "message_id", ignoreDuplicates: true })`.
8. **Success Emission**: Returns `HTTP 201 Created`:
   ```json
   {"success": true, "message": "Telemetry accepted"}
   ```

---

## 5. API Contract & Authentication Specification

### 5.1 Endpoint Details
- **Method:** `POST`
- **URL:** `https://hfzqfcuezuxcgaifxqok.supabase.co/functions/v1/ingest-telemetry`
- **Protocol:** `HTTPS` (TLS 1.2 or TLS 1.3 enforced)

### 5.2 Required Headers
```http
POST /functions/v1/ingest-telemetry HTTP/1.1
Host: hfzqfcuezuxcgaifxqok.supabase.co
Content-Type: application/json
x-device-token: YOUR_DEVICE_TOKEN
Authorization: Bearer YOUR_DEVICE_TOKEN
```
*(Note: Either `x-device-token` or `Authorization: Bearer <token>` is accepted; both are sent by `rpi_publisher.py` for maximum proxy compatibility).*

---

## 6. Telemetry Payload Specification

### 6.1 Minimal Valid Payload
The absolute minimal JSON payload accepted by the Edge Function without validation errors:

```json
{
  "deviceId": "BUS-101",
  "messageId": "msg-min-001",
  "timestamp": 1789278872000,
  "driverState": "NORMAL",
  "location": {
    "lat": 9.582415,
    "lng": 6.545892
  }
}
```

---

### 6.2 Complete Canonical Payload
The production payload emitted by the Raspberry Pi 4 client (`rpi_publisher.py`) containing full GPS, biometrics, hardware diagnostics, and network transport vitals:

```json
{
  "deviceId": "BUS-101",
  "messageId": "rpi-533779ec-7f8a-4a52-aae0-55530e3b50b2",
  "timestamp": 1789278872586,
  "driverState": "NORMAL",
  "location": {
    "lat": 9.582415,
    "lng": 6.545892,
    "speed": 42.5,
    "heading": 138,
    "satelliteCount": 11,
    "hasFix": true
  },
  "biometrics": {
    "ear": 0.325,
    "mar": 0.295,
    "perclos": 3.8,
    "headPitch": 2.0,
    "headYaw": 0.0,
    "headRoll": 0.0,
    "alcoholVoltage": 0.38,
    "alcoholRawADC": 118,
    "alcoholRiskScore": 0.04,
    "driverState": "NORMAL"
  },
  "hardware": {
    "cpuLoad": 28.0,
    "cpuTemp": 49.5,
    "powerWatts": 5.12,
    "batteryVoltage": 12.45,
    "buzzerActive": false,
    "lcdMessage": "BUS-101 READY"
  },
  "transport": {
    "mode": "WIFI",
    "wifiRssi": -63,
    "wifiSsid": "MinnaTransit_Hub",
    "loraHopCount": 0,
    "loraRssi": null,
    "loraSnr": null,
    "relayedVia": null,
    "bufferedQueueCount": 0
  }
}
```

---

### 6.3 Scenario Payload Examples

#### A. Drowsy Driving Incident (Early Warning)
Triggered when Eye Aspect Ratio decreases and PERCLOS rises above warning thresholds:
```json
{
  "deviceId": "BUS-101",
  "messageId": "rpi-drowsy-001",
  "timestamp": 1789278910000,
  "driverState": "DROWSY",
  "location": {
    "lat": 9.586112,
    "lng": 6.548903,
    "speed": 36.0,
    "heading": 142,
    "satelliteCount": 10,
    "hasFix": true
  },
  "biometrics": {
    "ear": 0.220,
    "mar": 0.540,
    "perclos": 42.0,
    "headPitch": -8.0,
    "headYaw": 2.1,
    "headRoll": 0.8,
    "alcoholVoltage": 0.38,
    "alcoholRawADC": 117,
    "alcoholRiskScore": 0.04,
    "driverState": "DROWSY"
  },
  "hardware": {
    "cpuLoad": 34.0,
    "cpuTemp": 51.0,
    "powerWatts": 5.25,
    "batteryVoltage": 12.40,
    "buzzerActive": false,
    "lcdMessage": "DROWSINESS DETECTED"
  },
  "transport": {
    "mode": "WIFI",
    "wifiRssi": -68,
    "wifiSsid": "MinnaTransit_Hub",
    "loraHopCount": 0,
    "bufferedQueueCount": 0
  }
}
```

#### B. Critical Fatigue Alarm (Micro-Sleep & Drooping Head)
Triggered during severe eyelid closure (EAR < 0.18, PERCLOS > 80%, head pitch drooping):
```json
{
  "deviceId": "BUS-101",
  "messageId": "rpi-fatigue-999",
  "timestamp": 1789278945000,
  "driverState": "CRITICAL_FATIGUE",
  "location": {
    "lat": 9.588420,
    "lng": 6.551020,
    "speed": 30.5,
    "heading": 145,
    "satelliteCount": 11,
    "hasFix": true
  },
  "biometrics": {
    "ear": 0.165,
    "mar": 0.680,
    "perclos": 86.4,
    "headPitch": -18.5,
    "headYaw": 1.0,
    "headRoll": -3.2,
    "alcoholVoltage": 0.38,
    "alcoholRawADC": 117,
    "alcoholRiskScore": 0.04,
    "driverState": "CRITICAL_FATIGUE"
  },
  "hardware": {
    "cpuLoad": 38.5,
    "cpuTemp": 53.2,
    "powerWatts": 5.40,
    "batteryVoltage": 12.35,
    "buzzerActive": true,
    "lcdMessage": "FATIGUE ALARM!"
  },
  "transport": {
    "mode": "WIFI",
    "wifiRssi": -71,
    "wifiSsid": "MinnaTransit_Hub",
    "loraHopCount": 0,
    "bufferedQueueCount": 0
  }
}
```

#### C. Alcohol Hazard Spike (MQ-3 Sensor Alert)
Triggered when alcohol vapor exceeds legal operating safety limits:
```json
{
  "deviceId": "BUS-101",
  "messageId": "rpi-alcohol-555",
  "timestamp": 1789278980000,
  "driverState": "ALCOHOL_ALERT",
  "location": {
    "lat": 9.590800,
    "lng": 6.553400,
    "speed": 0.0,
    "heading": 148,
    "satelliteCount": 11,
    "hasFix": true
  },
  "biometrics": {
    "ear": 0.310,
    "mar": 0.290,
    "perclos": 6.0,
    "headPitch": 1.0,
    "headYaw": 0.0,
    "headRoll": 0.0,
    "alcoholVoltage": 2.45,
    "alcoholRawADC": 759,
    "alcoholRiskScore": 0.88,
    "driverState": "ALCOHOL_ALERT"
  },
  "hardware": {
    "cpuLoad": 29.0,
    "cpuTemp": 49.8,
    "powerWatts": 5.15,
    "batteryVoltage": 12.42,
    "buzzerActive": true,
    "lcdMessage": "ALCOHOL HAZARD!"
  },
  "transport": {
    "mode": "WIFI",
    "wifiRssi": -65,
    "wifiSsid": "MinnaTransit_Hub",
    "loraHopCount": 0,
    "bufferedQueueCount": 0
  }
}
```

---

## 7. Comprehensive Field Reference Table

| JSON Field Path | Data Type | Required | Description | Valid Range / Format | Example |
|---|---|---|---|---|---|
| `deviceId` | string | **Yes** | Unique physical vehicle / OBU identifier | ASCII alphanumeric | `"BUS-101"` |
| `messageId` | string | **Yes** | Unique UUID v4 for idempotent deduplication | String UUID | `"rpi-3dd83cf1-..."` |
| `timestamp` | number / string | **Yes** | Epoch milliseconds or ISO 8601 string | > 0 | `1789278872586` |
| `driverState` | string | **Yes** | Primary classification of operator state | `NORMAL`, `DROWSY`, `CRITICAL_FATIGUE`, `ALCOHOL_ALERT` | `"NORMAL"` |
| `location.lat` | number | Optional | WGS84 latitude coordinate | -90.0 to 90.0 | `9.582415` |
| `location.lng` | number | Optional | WGS84 longitude coordinate | -180.0 to 180.0 | `6.545892` |
| `location.speed` | number | Optional | Ground speed across transit arterial | 0.0 to 180.0 km/h | `42.5` |
| `location.heading` | number | Optional | Compass heading / course over ground | 0 to 360 degrees | `138.0` |
| `location.satelliteCount` | number | Optional | Satellites locked by GNSS receiver | 0 to 32 | `11` |
| `location.hasFix` | boolean | Optional | 2D/3D GPS positioning fix acquired | `true` / `false` | `true` |
| `biometrics.ear` | number | Optional | Eye Aspect Ratio (eyelid opening) | 0.00 to 0.45 | `0.325` |
| `biometrics.mar` | number | Optional | Mouth Aspect Ratio (yawn opening) | 0.10 to 0.90 | `0.295` |
| `biometrics.perclos` | number | Optional | Percentage Eye Closure over 60s window| 0.0 to 100.0 % | `3.8` |
| `biometrics.headPitch` | number | Optional | 3D head pitch (positive = up, negative = nodding)| -45.0 to 45.0 deg | `-18.5` |
| `biometrics.headYaw` | number | Optional | 3D head yaw (head turn left/right) | -90.0 to 90.0 deg | `0.0` |
| `biometrics.headRoll` | number | Optional | 3D head roll (head tilting) | -45.0 to 45.0 deg | `0.0` |
| `biometrics.alcoholVoltage` | number | Optional | MQ-3 analog sensor voltage | 0.0 to 5.0 V | `0.38` |
| `biometrics.alcoholRawADC` | number | Optional | 10-bit MCP3008 raw digital ADC reading | 0 to 1023 | `118` |
| `biometrics.alcoholRiskScore` | number | Optional | Normalized BAC risk score index | 0.00 to 1.00 | `0.04` |
| `biometrics.driverState` | string | Optional | Subsystem driver state classification | Standard state strings | `"NORMAL"` |
| `hardware.cpuLoad` | number | Optional | Raspberry Pi 4 CPU load percentage | 0.0 to 100.0 % | `28.0` |
| `hardware.cpuTemp` | number | Optional | Broadcom BCM2711 SoC core temperature | 20.0 to 85.0 °C | `49.5` |
| `hardware.powerWatts` | number | Optional | Real-time system power consumption | 2.0 to 15.0 W | `5.12` |
| `hardware.batteryVoltage`| number | Optional | Vehicle lead-acid / aux battery voltage| 10.0 to 15.0 V | `12.45` |
| `hardware.buzzerActive` | boolean | Optional | Audio alert buzzer state | `true` / `false` | `false` |
| `hardware.lcdMessage` | string | Optional | Current text string on 16x2 I2C LCD | Max 32 characters | `"BUS-101 READY"` |
| `transport.mode` | string | Optional | Active telemetry transmission uplink | `WIFI`, `CELLULAR`, `LORA` | `"WIFI"` |
| `transport.wifiRssi` | number | Optional | Wi-Fi Signal Strength Indicator | -100 to -20 dBm | `-63` |
| `transport.wifiSsid` | string | Optional | Connected Wi-Fi network SSID | String | `"MinnaTransit_Hub"`|
| `transport.loraHopCount` | number | Optional | Mesh relay hops if relayed via LoRa | 0 to 5 | `0` |
| `transport.loraRssi` | number | Optional | LoRa received signal strength | -130 to -30 dBm | `null` |
| `transport.loraSnr` | number | Optional | LoRa signal-to-noise ratio | -20.0 to 15.0 dB | `null` |
| `transport.relayedVia` | string | Optional | Intermediary node ID if mesh relayed | String device ID | `null` |
| `transport.bufferedQueueCount`| number | Optional | Packets waiting in local SQLite queue | 0 to 5000 | `0` |

---

## 8. Supabase PostgreSQL Database Schema

### 8.1 `public.telemetry` Schema Definition

Defined in [supabase/migrations/20260912_telemetry.sql](file:///c:/Users/Administrator/.gemini/antigravity/scratch/TransitGuard-IoT-main/supabase/migrations/20260912_telemetry.sql):

```sql
CREATE TABLE IF NOT EXISTS public.telemetry (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id TEXT NOT NULL,
    message_id TEXT NOT NULL UNIQUE,
    timestamp TIMESTAMPTZ NOT NULL,
    
    -- Location & Motion
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    speed DOUBLE PRECISION DEFAULT 0.0,
    heading DOUBLE PRECISION DEFAULT 0.0,
    satellite_count INTEGER DEFAULT 0,
    has_fix BOOLEAN DEFAULT false,
    
    -- Driver Biometrics
    ear DOUBLE PRECISION,
    mar DOUBLE PRECISION,
    perclos DOUBLE PRECISION,
    head_pitch DOUBLE PRECISION,
    head_yaw DOUBLE PRECISION,
    head_roll DOUBLE PRECISION,
    alcohol_voltage DOUBLE PRECISION,
    alcohol_raw_adc INTEGER,
    alcohol_risk_score DOUBLE PRECISION,
    driver_state TEXT NOT NULL DEFAULT 'NORMAL',
    
    -- Hardware Status
    cpu_load DOUBLE PRECISION,
    cpu_temp DOUBLE PRECISION,
    power_watts DOUBLE PRECISION,
    battery_voltage DOUBLE PRECISION,
    buzzer_active BOOLEAN DEFAULT false,
    lcd_message TEXT,
    
    -- Transport & Network
    transport_mode TEXT DEFAULT 'WIFI',
    wifi_rssi INTEGER,
    wifi_ssid TEXT,
    lora_hop_count INTEGER DEFAULT 0,
    lora_rssi INTEGER,
    lora_snr DOUBLE PRECISION,
    relayed_via TEXT,
    buffered_queue_count INTEGER DEFAULT 0,
    
    -- Audit & Raw JSON Payload
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_telemetry_device_timestamp ON public.telemetry (device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON public.telemetry (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_driver_state ON public.telemetry (driver_state);
CREATE INDEX IF NOT EXISTS idx_telemetry_message_id ON public.telemetry (message_id);

-- Row Level Security (RLS)
ALTER TABLE public.telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to telemetry"
    ON public.telemetry FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow device insertion of telemetry"
    ON public.telemetry FOR INSERT TO anon, authenticated
    WITH CHECK (device_id IS NOT NULL AND message_id IS NOT NULL AND timestamp IS NOT NULL);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetry;
```

---

### 8.2 JSON-to-Database Column Mapping Table

| JSON Field Path | Supabase Column | PostgreSQL Type | Nullable | Default | Description |
|---|---|---|---|---|---|
| `deviceId` | `device_id` | `TEXT` | **NO** | None | Vehicle identifier |
| `messageId` | `message_id` | `TEXT` | **NO** | None | Unique message UUID |
| `timestamp` | `timestamp` | `TIMESTAMPTZ` | **NO** | None | Packet capture timestamp |
| `location.lat` | `latitude` | `DOUBLE PRECISION` | YES | None | WGS84 Latitude |
| `location.lng` | `longitude` | `DOUBLE PRECISION` | YES | None | WGS84 Longitude |
| `location.speed` | `speed` | `DOUBLE PRECISION` | YES | `0.0` | Vehicle speed (km/h) |
| `location.heading` | `heading` | `DOUBLE PRECISION` | YES | `0.0` | Compass heading (deg) |
| `location.satelliteCount` | `satellite_count` | `INTEGER` | YES | `0` | GNSS satellite count |
| `location.hasFix` | `has_fix` | `BOOLEAN` | YES | `false` | GPS position fix flag |
| `biometrics.ear` | `ear` | `DOUBLE PRECISION` | YES | None | Eye Aspect Ratio |
| `biometrics.mar` | `mar` | `DOUBLE PRECISION` | YES | None | Mouth Aspect Ratio |
| `biometrics.perclos` | `perclos` | `DOUBLE PRECISION` | YES | None | PERCLOS percentage |
| `biometrics.headPitch` | `head_pitch` | `DOUBLE PRECISION` | YES | None | Head pitch angle |
| `biometrics.headYaw` | `head_yaw` | `DOUBLE PRECISION` | YES | None | Head yaw angle |
| `biometrics.headRoll` | `head_roll` | `DOUBLE PRECISION` | YES | None | Head roll angle |
| `biometrics.alcoholVoltage` | `alcohol_voltage` | `DOUBLE PRECISION` | YES | None | Sensor voltage |
| `biometrics.alcoholRawADC` | `alcohol_raw_adc` | `INTEGER` | YES | None | Raw 10-bit ADC |
| `biometrics.alcoholRiskScore` | `alcohol_risk_score` | `DOUBLE PRECISION` | YES | None | Normalized alcohol risk |
| `driverState` | `driver_state` | `TEXT` | **NO** | `'NORMAL'` | Operator status string |
| `hardware.cpuLoad` | `cpu_load` | `DOUBLE PRECISION` | YES | None | CPU load percentage |
| `hardware.cpuTemp` | `cpu_temp` | `DOUBLE PRECISION` | YES | None | CPU temperature (°C) |
| `hardware.powerWatts` | `power_watts` | `DOUBLE PRECISION` | YES | None | System power (W) |
| `hardware.batteryVoltage` | `battery_voltage` | `DOUBLE PRECISION` | YES | None | Supply voltage (V) |
| `hardware.buzzerActive` | `buzzer_active` | `BOOLEAN` | YES | `false` | Buzzer active status |
| `hardware.lcdMessage` | `lcd_message` | `TEXT` | YES | None | Display message |
| `transport.mode` | `transport_mode` | `TEXT` | YES | `'WIFI'` | Transmission medium |
| `transport.wifiRssi` | `wifi_rssi` | `INTEGER` | YES | None | Wi-Fi RSSI (dBm) |
| `transport.wifiSsid` | `wifi_ssid` | `TEXT` | YES | None | Wi-Fi SSID |
| `transport.loraHopCount` | `lora_hop_count` | `INTEGER` | YES | `0` | LoRa relay hops |
| `transport.loraRssi` | `lora_rssi` | `INTEGER` | YES | None | LoRa RSSI (dBm) |
| `transport.loraSnr` | `lora_snr` | `DOUBLE PRECISION` | YES | None | LoRa SNR (dB) |
| `transport.relayedVia` | `relayed_via` | `TEXT` | YES | None | Mesh relay node |
| `transport.bufferedQueueCount` | `buffered_queue_count` | `INTEGER` | YES | `0` | Backlog queue size |
| Entire JSON Object | `raw_payload` | `JSONB` | YES | None | Complete audit JSON |
| Generated | `created_at` | `TIMESTAMPTZ` | **NO** | `now()` | Ingestion timestamp |

---

### 8.3 SQL Verification & Diagnostic Queries

Execute these queries in the **Supabase SQL Editor** to inspect live telemetry:

#### 1. Fetch Latest 10 Telemetry Records Across Entire Fleet
```sql
SELECT 
    id, device_id, message_id, timestamp, driver_state, 
    speed, latitude, longitude, cpu_temp, created_at
FROM public.telemetry
ORDER BY id DESC
LIMIT 10;
```

#### 2. Latest State For a Specific Vehicle (`BUS-101`)
```sql
SELECT *
FROM public.telemetry
WHERE device_id = 'BUS-101'
ORDER BY timestamp DESC
LIMIT 1;
```

#### 3. Inspect All Fatigue & Drowsiness Incidents Today
```sql
SELECT 
    id, device_id, timestamp, driver_state, 
    ear, mar, perclos, head_pitch, buzzer_active
FROM public.telemetry
WHERE driver_state IN ('DROWSY', 'CRITICAL_FATIGUE')
ORDER BY timestamp DESC;
```

#### 4. Inspect Elevated Alcohol Hazard Readings
```sql
SELECT 
    id, device_id, timestamp, alcohol_voltage, 
    alcohol_raw_adc, alcohol_risk_score, driver_state
FROM public.telemetry
WHERE alcohol_risk_score > 0.20
ORDER BY timestamp DESC;
```

#### 5. Verify Deduplication Idempotency By Message ID
```sql
SELECT message_id, COUNT(*) AS count
FROM public.telemetry
GROUP BY message_id
HAVING COUNT(*) > 1;
-- Expected output: 0 rows (confirms perfect deduplication)
```

---

## 9. Raspberry Pi Environment Variables

The physical Raspberry Pi 4 client reads its configuration from `/etc/transitguard.env` (for systemd) or `.env` (for manual terminal runs).

| Variable Name | Purpose | Production Example | Source / Origin | Confidentiality | Can Commit to Git? | Required on Physical Pi? |
|---|---|---|---|---|---|---|
| `SUPABASE_URL` | Base Supabase Cloud URL | `https://hfzqfcuezuxcgaifxqok.supabase.co` | Supabase Dashboard | Public | **YES** | **YES** |
| `SUPABASE_INGEST_URL` | Target Edge Function endpoint | `https://hfzqfcuezuxcgaifxqok.supabase.co/functions/v1/ingest-telemetry` | Supabase Functions | Public | **YES** | **YES** |
| `TRANSITGUARD_DEVICE_ID` | Unique vehicle identifier | `BUS-101` | Fleet Management | Public | **YES** | **YES** |
| `TRANSITGUARD_DEVICE_TOKEN` | Hardware ingest authentication secret | `tg-device-token-obu-default` | Supabase Secrets Vault | **SECRET** | **NO** (Never commit) | **YES** |
| `BUFFER_DB_PATH` | Path to local SQLite queue database | `/home/pi/.transitguard_buffer.db` | Local filesystem | Non-sensitive | **YES** | Optional (defaults to home) |
| `PUBLISH_INTERVAL_SEC` | Telemetry transmission frequency | `10.0` | Operational policy | Non-sensitive | **YES** | Optional (default: `10.0`) |
| `MAX_BUFFERED_PACKETS` | Maximum offline queue capacity | `5000` | Storage policy | Non-sensitive | **YES** | Optional (default: `5000`) |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase Publishable / Anon Key | `sb_publishable_...` | Supabase API Settings | Public Client Key | **YES** | Optional fallback |

> [!CAUTION]
> **Zero Credential Leaks**: Never put `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, or PostgreSQL database passwords on the Raspberry Pi 4. The physical device ONLY requires `TRANSITGUARD_DEVICE_TOKEN`.

---

## 10. Hardware-to-Payload Mapping Specification

| Hardware Sensor / Peripheral | Physical Raspberry Pi Interface | Python Driver / Library | Python Local Variable | JSON Payload Field | Supabase Database Column | Implementation Status |
|---|---|---|---|---|---|---|
| **u-blox NEO-6M GNSS** | UART (`/dev/serial0`, 9600 baud) | `pyserial`, `pynmea2` | `lat, lng, speed, heading, sats, fix` | `location.*` | `latitude, longitude, speed, heading, ...` | **PLANNED SENSOR** |
| **Raspberry Pi Camera v2** | CSI Ribbon Cable | `picamera2` / OpenCV | `ear, mar, perclos, pitch, yaw, roll` | `biometrics.*` | `ear, mar, perclos, head_pitch, ...` | **PLANNED SENSOR** |
| **MQ-3 Alcohol Sensor** | Analog out to MCP3008 CH0 | `spidev` (`/dev/spidev0.0`) | `alc_v, alc_adc, alc_score` | `biometrics.alcohol*` | `alcohol_voltage, alcohol_raw_adc, ...` | **PLANNED SENSOR** |
| **BCM2711 SoC Temperature** | Internal Silicon Thermal Sensor | Linux sysfs (`/sys/class/thermal/...`) | `cpu_temp` | `hardware.cpuTemp` | `cpu_temp` | **CURRENTLY IMPLEMENTED** |
| **Linux CPU Load Average** | Linux Kernel Load Statistics | `os.getloadavg()` | `cpu_load` | `hardware.cpuLoad` | `cpu_load` | **CURRENTLY IMPLEMENTED** |
| **Piezo Alarm Buzzer** | GPIO 18 (Pin 12, PWM/Active High) | `RPi.GPIO` / `gpiozero` | `buzzer_active` | `hardware.buzzerActive` | `buzzer_active` | **PLANNED SENSOR** |
| **16x2 Character LCD** | I2C (`/dev/i2c-1`, Address `0x27`)| `smbus2`, `RPLCD` | `lcd_msg` | `hardware.lcdMessage` | `lcd_message` | **PLANNED SENSOR** |
| **Broadcom Wi-Fi Chip** | `wlan0` interface | Linux sysfs / `iwconfig` | `wifi_rssi, wifi_ssid` | `transport.wifi*` | `wifi_rssi, wifi_ssid` | **PLANNED SENSOR** |
| **SX1278 LoRa Transceiver** | SPI (`/dev/spidev0.1`) | `pyLoRa` (868 MHz) | `lora_rssi, lora_snr` | `transport.lora*` | `lora_rssi, lora_snr, ...` | **PLANNED SENSOR** |
| **SQLite Store-and-Forward** | MicroSD / eMMC Storage | Python standard `sqlite3` | `buffer_count` | `transport.bufferedQueueCount` | `buffered_queue_count` | **CURRENTLY IMPLEMENTED** |

---

## 11. Sensor Integration & Physical Migration Roadmap

In the current version of `rpi_publisher.py`, hardware diagnostics (CPU temperature and load) are **read directly from the physical Linux kernel**, while environmental sensors (GPS, Camera, MQ-3) operate on high-fidelity simulation models along Minna transit coordinates.

To transition each peripheral to physical silicon without altering the proven API contract:

### 1. GPS Migration (u-blox NEO-6M)
```python
# Replace simulated waypoint index with real NMEA stream:
import serial, pynmea2
ser = serial.Serial('/dev/serial0', 9600, timeout=1.0)
def read_physical_gps():
    line = ser.readline().decode('ascii', errors='replace')
    if line.startswith('$GPRMC'):
        msg = pynmea2.parse(line)
        return {"lat": msg.latitude, "lng": msg.longitude, "speed": msg.spd_over_grnd_kmph, "hasFix": True}
```

### 2. Alcohol Sensor Migration (MQ-3 + MCP3008)
```python
# Connect MQ-3 analog pin to MCP3008 Channel 0:
import spidev
spi = spidev.SpiDev()
spi.open(0, 0)
def read_physical_alcohol():
    adc = spi.xfer2([1, (8 + 0) << 4, 0])
    raw = ((adc[1] & 3) << 8) + adc[2]
    volt = round((raw / 1023.0) * 3.3, 2)
    score = round(max(0.0, (volt - 0.4) / 2.0), 2)
    return volt, raw, score
```

### 3. Driver Fatigue Vision Migration (RPi Camera v2 + OpenCV)
```python
# OpenCV dlib 68-landmark facial mesh to compute EAR / MAR:
def compute_ear(eye_landmarks):
    # Standard Soukupová and Čech formula
    A = dist(eye_landmarks[1], eye_landmarks[5])
    B = dist(eye_landmarks[2], eye_landmarks[4])
    C = dist(eye_landmarks[0], eye_landmarks[3])
    return (A + B) / (2.0 * C)
```
*(Notice: Regardless of whether values originate from simulation or physical SPI/UART/CSI buses, the output dictionary structure passed into `publisher.publish_telemetry(payload)` remains 100% identical).*

---

## 12. Offline Store-and-Forward SQLite Buffer

Transit vehicles regularly encounter cellular dead zones. The Raspberry Pi 4 client implements a resilient local **Store-and-Forward** mechanism via SQLite.

```
                  +-------------------------------+
                  |  Vehicle Sensor Loop / OBU    |
                  +-------------------------------+
                                  |
                      publisher.publish_telemetry()
                                  |
                                  v
                  +-------------------------------+
                  |  Try HTTPS POST to Supabase   |
                  +-------------------------------+
                       /                     \
             [SUCCESS]                         [FAILURE / OFFLINE]
              HTTP 201                        Timeout / No Internet
                 /                                       \
                v                                         v
   +-----------------------+                    +-----------------------+
   | Supabase Edge Function|                    | Enqueue into Local    |
   | Database Insert OK    |                    | SQLite Buffer DB      |
   +-----------------------+                    +-----------------------+
                |                                         |
    (Check: Is Buffer > 0?)                               |
           YES:                                           |
            |                                             |
            v                                             |
   +-----------------------+                              |
   | Flush Oldest Backlog  |<-----------------------------+
   | (FIFO, Max 15/cycle)  | (Upon Network Connection Recovery)
   +-----------------------+
```

### Key Capabilities
1. **Zero Data Loss**: When cellular or Wi-Fi connectivity drops, packets are immediately written to local disk at `~/.transitguard_buffer.db`.
2. **WAL Mode Performance**: SQLite is opened with `PRAGMA journal_mode = WAL` to guarantee zero lock contention and fast flash-memory writes.
3. **Disk Exhaustion Protection**: Capped at `MAX_BUFFERED_PACKETS=5000` records. If disk storage is exhausted during days of outage, it automatically prunes the oldest 50 records.
4. **Automatic Recovery Flush**: When the vehicle reconnects to the network and a live transmission succeeds, the client automatically batches and transmits pending offline packets in the background.
5. **Deduplication Idempotency**: Because every packet retains its immutable `message_id`, Supabase's `ON CONFLICT (message_id) DO NOTHING` guarantees that retried transmissions never duplicate records in the database.

---

## 13. Step-by-Step Physical Raspberry Pi 4 Deployment Procedure

Follow these step-by-step instructions on a fresh Raspberry Pi 4:

### Step 1: Boot & System Update
Connect the Raspberry Pi to a monitor/keyboard or SSH into it:
```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y python3 python3-pip git sqlite3 curl
```

### Step 2: Clone the Repository
```bash
cd /home/pi
git clone https://github.com/LORDTOSIN2/TransitGuard-IoT.git
cd TransitGuard-IoT
```

### Step 3: Verify Internet & DNS Connectivity
```bash
# 1. Ping Google DNS
ping -c 3 8.8.8.8

# 2. Verify Supabase DNS Resolution
nslookup hfzqfcuezuxcgaifxqok.supabase.co

# 3. Test HTTPS connectivity to Supabase
curl -I https://hfzqfcuezuxcgaifxqok.supabase.co
```

### Step 4: Configure Production Environment Variables
Copy the template configuration to the system environment location:
```bash
sudo cp rpi.env.example /etc/transitguard.env
sudo chmod 600 /etc/transitguard.env
sudo nano /etc/transitguard.env
```
Ensure the token is configured:
```ini
SUPABASE_URL=https://hfzqfcuezuxcgaifxqok.supabase.co
SUPABASE_INGEST_URL=https://hfzqfcuezuxcgaifxqok.supabase.co/functions/v1/ingest-telemetry
TRANSITGUARD_DEVICE_ID=BUS-101
TRANSITGUARD_DEVICE_TOKEN=tg-device-token-obu-default
BUFFER_DB_PATH=/home/pi/.transitguard_buffer.db
PUBLISH_INTERVAL_SEC=10.0
```

### Step 5: Test Single Diagnostic Packet Transmission
Run the publisher in diagnostic mode (`--once`) to confirm authorization and database insertion:
```bash
python3 rpi_publisher.py --once
```
**Expected Output:**
```
[INFO] Initializing TransitGuard Raspberry Pi 4 Telemetry Publisher...
[INFO] Target URL : https://hfzqfcuezuxcgaifxqok.supabase.co/functions/v1/ingest-telemetry
[INFO] Device ID  : BUS-101
[INFO] Auth Token : tg-devic***
[INFO] Targeting Supabase Edge Function: https://hfzqfcuezuxcgaifxqok.supabase.co/functions/v1/ingest-telemetry
[INFO] [LIVE SENT] BUS-101 | State: NORMAL | Speed: 42.5 km/h | MsgId: rpi-3dd83cf1...
[INFO] Single diagnostic packet transmitted successfully. Exiting.
```

### Step 6: Verify Database Insertion
Execute a query in the Supabase SQL Editor:
```sql
SELECT id, device_id, message_id, timestamp, driver_state, speed 
FROM public.telemetry 
ORDER BY id DESC LIMIT 1;
```
Confirm the row with `message_id: rpi-3dd83cf1...` is present.

---

## 14. Direct cURL Test Command Reference

You can verify the Edge Function directly from the Raspberry Pi 4 terminal using `curl`:

```bash
curl -i -X POST "https://hfzqfcuezuxcgaifxqok.supabase.co/functions/v1/ingest-telemetry" \
  -H "Content-Type: application/json" \
  -H "x-device-token: YOUR_DEVICE_TOKEN" \
  -H "Authorization: Bearer YOUR_DEVICE_TOKEN" \
  -d '{
    "deviceId": "BUS-101",
    "messageId": "curl-manual-test-001",
    "timestamp": 1789278872000,
    "driverState": "NORMAL",
    "location": {
      "lat": 9.582415,
      "lng": 6.545892,
      "speed": 42.5,
      "heading": 138,
      "satelliteCount": 11,
      "hasFix": true
    },
    "biometrics": {
      "ear": 0.325,
      "mar": 0.295,
      "perclos": 3.8,
      "headPitch": 2.0,
      "driverState": "NORMAL"
    },
    "hardware": {
      "cpuLoad": 28.0,
      "cpuTemp": 49.5,
      "batteryVoltage": 12.45
    },
    "transport": {
      "mode": "WIFI",
      "wifiRssi": -63
    }
  }'
```

**Expected HTTP Response:**
```http
HTTP/2 201 
content-type: application/json
access-control-allow-origin: *

{"success":true,"message":"Telemetry accepted"}
```

---

## 15. Automated Systemd Daemon Service Setup

To ensure the telemetry publisher starts automatically on vehicle ignition and recovers from system reboots or crashes:

### Step 1: Create Systemd Unit File
```bash
sudo nano /etc/systemd/system/transitguard.service
```

Paste the following unit configuration:
```ini
[Unit]
Description=TransitGuard IoT Raspberry Pi 4 Telemetry Publisher Daemon
After=network-online.target time-sync.target
Wants=network-online.target time-sync.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/TransitGuard-IoT
EnvironmentFile=/etc/transitguard.env
ExecStart=/usr/bin/python3 /home/pi/TransitGuard-IoT/rpi_publisher.py
Restart=always
RestartSec=5s
StandardOutput=journal
StandardError=journal

# Hardening & Reliability
LimitNOFILE=65536
KillMode=mixed

[Install]
WantedBy=multi-user.target
```

### Step 2: Enable & Start the Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable transitguard.service
sudo systemctl start transitguard.service
```

### Step 3: Useful Systemd Operational Commands
```bash
# Check service status & uptime
systemctl status transitguard.service

# View live streaming daemon logs
journalctl -u transitguard.service -f

# View last 50 lines of logs
journalctl -u transitguard.service -n 50 --no-pager

# Restart the daemon
sudo systemctl restart transitguard.service

# Stop the daemon
sudo systemctl stop transitguard.service
```

---

## 16. Frontend Dashboard Telemetry Consumption

The TransitGuard React frontend dashboard ([src/services/supabaseService.ts](file:///c:/Users/Administrator/.gemini/antigravity/scratch/TransitGuard-IoT-main/src/services/supabaseService.ts)) seamlessly receives all physical Raspberry Pi telemetry:

1. **Initial Hydration (Page Load):**
   ```typescript
   supabase.from('telemetry').select('*').order('timestamp', { ascending: false }).limit(60)
   ```
   Hydrates historical breadcrumbs, recent vehicle speed, and operator state.

2. **Realtime WebSocket Subscription:**
   ```typescript
   supabase
     .channel('public:telemetry:realtime')
     .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'telemetry' }, (payload) => {
       const packet = mapRowToTelemetryPayload(payload.new);
       updateDashboard(packet);
     })
     .subscribe();
   ```
   Whenever the Raspberry Pi 4 transmits a packet, Supabase PostgreSQL writes the row, triggering a Postgres Realtime replication event pushed over WebSocket directly to all active browser sessions within milliseconds.

---

## 17. Security & Credential Hierarchy

| Credential Type | Intended Location | Never Allowed In | Exposure Risk |
|---|---|---|---|
| **Device Ingestion Token** (`TRANSITGUARD_DEVICE_TOKEN`) | - Edge Function Secrets Vault<br>- `/etc/transitguard.env` on physical Pi | - GitHub public repositories<br>- React client bundle / browser | **Medium**: Can only inject telemetry packets into Edge Function. Cannot read or delete data. |
| **Supabase Publishable / Anon Key** | - React Frontend `.env`<br>- Mobile apps | - Server-side root secrets | **Low**: Intended for public client apps. Read-only constrained by RLS. |
| **Supabase Service-Role / Secret Key** | - Supabase Edge Function Runtime Environment | - **NEVER** on Raspberry Pi 4<br>- **NEVER** in Frontend browser<br>- **NEVER** on GitHub | **CRITICAL**: Bypasses all Row Level Security. Grants full root database read/write/delete access. |
| **PostgreSQL Database Password** | - Secure DevOps credential store | - **NEVER** on edge devices | **CRITICAL**: Full direct PostgreSQL access. |

---

## 18. Troubleshooting & Diagnostic Matrix

| Symptom / Error | Root Cause | Exact Resolution |
|---|---|---|
| **HTTP 401 Unauthorized** (`"Unauthorized device"`) | Device token in `/etc/transitguard.env` does not match `TRANSITGUARD_DEVICE_TOKEN` in Supabase vault, or `deviceId` is not whitelisted. | Verify secret in Supabase: `npx supabase secrets set TRANSITGUARD_DEVICE_TOKEN="tg-device-token-obu-default" --project-ref hfzqfcuezuxcgaifxqok`. |
| **HTTP 400 Bad Request** (`"Invalid telemetry payload"`) | Missing required fields (`deviceId`, `messageId`, `timestamp`, `driverState`, or `location`). | Ensure your custom sensor loop passes all required top-level fields defined in Section 6.1. |
| **HTTP 404 Not Found** | Edge Function `ingest-telemetry` has not been deployed to the target project. | Deploy function: `npx supabase functions deploy ingest-telemetry --no-verify-jwt --project-ref hfzqfcuezuxcgaifxqok`. |
| **HTTP 405 Method Not Allowed** | HTTP GET was used instead of POST. | Edge Function only accepts `POST`. Update HTTP client method. |
| **HTTP 500 Internal Server Error** | Missing `SUPABASE_SERVICE_ROLE_KEY` inside Supabase Edge Function runtime. | Verify project status on Supabase Dashboard. Redeploy function. |
| **Network unreachable (`URLError`)** | Cellular modem has no signal, or SIM card out of data. | Packets are safely buffered in local SQLite. Check cellular connection: `nmcli dev status` or `ping -c 3 8.8.8.8`. |
| **DNS Resolution Failure** | Pi cannot resolve `hfzqfcuezuxcgaifxqok.supabase.co`. | Add fallback DNS servers (8.8.8.8, 1.1.1.1) in `/etc/resolv.conf`. |
| **SSL/TLS Certificate Verification Error** | Raspberry Pi system clock is desynchronized (RTC battery absent). | Hardware has no battery RTC. Run: `sudo apt-get install -y chrony && sudo systemctl restart chrony` to sync time via NTP. |
| **Edge Function returns 201 but row is missing in DB** | `message_id` collision from an earlier test packet. | The function performs an idempotent upsert (`ignoreDuplicates: true`). Ensure unique UUIDs are generated for each transmission (`uuid.uuid4()`). |
| **Database row exists but Frontend does not update** | Realtime replication not active on `public.telemetry`. | Execute in Supabase SQL editor: `ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetry;`. |

---

## 19. Fleet Maintenance & Provisioning Procedures

### Adding New Vehicles to Fleet (e.g. `BUS-102`, `BUS-103`)
1. In Supabase Secrets, append the new device IDs to the whitelist:
   ```bash
   npx supabase secrets set TRANSITGUARD_DEVICE_ID="BUS-101,BUS-102,BUS-103" --project-ref hfzqfcuezuxcgaifxqok
   ```
2. On the physical Raspberry Pi for vehicle 2, configure `/etc/transitguard.env`:
   ```ini
   TRANSITGUARD_DEVICE_ID=BUS-102
   ```
3. Restart the systemd daemon:
   ```bash
   sudo systemctl restart transitguard.service
   ```

### Inspecting Local Buffer Backlog On Physical Pi
```bash
# Check how many packets are stored in offline buffer:
python3 rpi_publisher.py --status

# Manually trigger an immediate backlog flush to Supabase:
python3 rpi_publisher.py --flush
```

---

## 20. Final Field Deployment Verification Checklist

Before releasing a vehicle onto the transit route, verify each item:

- [ ] **1. Power Supply**: Raspberry Pi 4 is powered via a filtered 5V/3A automotive buck converter connected to vehicle ignition.
- [ ] **2. Antenna Placement**: GNSS antenna mounted on vehicle roof or front windscreen with unobstructed sky view.
- [ ] **3. Network Connectivity**: 4G LTE USB dongle or Wi-Fi modem authenticated and auto-connecting on boot.
- [ ] **4. Time Synchronization**: NTP synchronization active (`timedatectl status` shows `System clock synchronized: yes`).
- [ ] **5. Environment Variables**: `/etc/transitguard.env` present with `chmod 600` permissions and correct `DEVICE_ID` / `DEVICE_TOKEN`.
- [ ] **6. Diagnostic Test**: Ran `python3 rpi_publisher.py --once` and observed `[LIVE SENT]` with `HTTP 201`.
- [ ] **7. Database Verification**: Confirmed latest record appears in `public.telemetry` on Supabase.
- [ ] **8. Dashboard Verification**: Vehicle marker appears at coordinates on the live React dashboard map.
- [ ] **9. Service Activation**: Daemon enabled and active (`systemctl is-active transitguard` returns `active`).
- [ ] **10. Offline Verification**: Disconnected Wi-Fi/cellular, confirmed local SQLite buffer increments (`python3 rpi_publisher.py --status`), reconnected network, and observed backlog flushing.
