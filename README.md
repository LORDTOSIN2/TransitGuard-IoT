# TransitGuard IoT • Fleet & Driver Fatigue Monitoring System

A resilient, low-power IoT fleet tracking and real-time operator dispatch dashboard engineered for public transport monitoring in areas with intermittent cellular coverage.

---

## 🌟 Key Architecture & Capabilities

- **Real-Time Geospatial Fleet Map**:
  - Interactive Leaflet-powered operator hub with custom vehicle markers and breadcrumb paths.
  - CARTO Basemaps integration with automatic dark and light mode synchronization (`carto-dark` and `carto-voyager`).
  - Roadside base station hubs, dead-zone indicators, and LoRa mesh communication links.

- **Computer Vision & Driver Biometrics (Edge RPi 4 OBU)**:
  - **Eye Aspect Ratio (EAR)**: Micro-sleep and blink duration detection.
  - **Mouth Aspect Ratio (MAR)**: Yawn frequency monitoring.
  - **PERCLOS (%)**: Continuous percentage of eye closure over 60-second sliding windows.
  - **Head Pose Estimation**: 3D pitch/yaw/roll tracking via OpenCV solvePnP to flag nodding and off-road glances.
  - **MQ-3 Alcohol Sensor**: Blood Alcohol Concentration (BAC) risk estimation via MCP3008 ADC.

- **Multi-Hub Communication & Offline Resilience**:
  - **Wi-Fi Primary Path**: Direct telemetry transmission to backend.
  - **LoRa Fallback (868 MHz)**: 36-byte compact binary frames for peer-to-peer and gateway relaying through GSM/Wi-Fi dead zones.
  - **Offline SQLite Buffer**: On-disk store-and-forward queue flushed automatically upon connection recovery.

- **Direct Supabase PostgreSQL & Realtime Architecture**:
  - Direct HTTPS REST ingestion from Raspberry Pi 4 to Supabase (`/rest/v1/telemetry`).
  - Row Level Security (RLS) enforcing strict INSERT-only permissions for physical hardware.
  - Supabase Realtime pushing live telemetry inserts directly to the Vercel React frontend.
  - Zero intermediate servers or custom broker services required (serverless & maintenance-free).

- **Multi-Hub Communication & Offline Resilience**:
  - **Wi-Fi / Cellular Primary Path**: Direct HTTPS telemetry transmission to Supabase.
  - **LoRa Fallback (868 MHz)**: 36-byte compact binary frames for peer-to-peer and gateway relaying through GSM/Wi-Fi dead zones.
  - **Offline SQLite Buffer**: On-disk store-and-forward queue flushed automatically upon connection recovery.

- **Hardware & Bench Testing**:
  - Production Raspberry Pi 4 publisher (`rpi_publisher.py`) with SQLite queue and backoff.
  - Comprehensive automated bench-test publisher (`test_publisher.py`) for laptop simulation across all driving states.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ or [Bun](https://bun.sh/)
- Python 3.9+ with `requests` library

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/LORDTOSIN2/TransitGuard-IoT.git
cd TransitGuard-IoT

# Install dependencies
npm install
# or bun install
```

### 3. Running the Frontend Dashboard

```bash
# Start Vite Frontend (Port 3000)
npm run dev
```

Access the dashboard at **http://localhost:3000/**.

---

## 🧪 Bench-Testing With Simulated Telemetry

Before deploying physical Raspberry Pi 4 hardware, you can test the entire Supabase PostgreSQL ingestion and Realtime pipeline from your laptop:

```bash
# Install Python dependency
pip install requests

# Run the automated test suite (Tests normal driving, drowsiness, fatigue, recovery, GPS loss, alcohol spike, idempotency, and multi-vehicle streams):
python test_publisher.py --test

# Or run continuous live publishing:
python test_publisher.py --interval 5.0
```

---

## 🍓 Raspberry Pi 4 Production Setup

On the vehicle's Raspberry Pi 4:

```bash
# Set environment variables (or save to /etc/environment)
export SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
export SUPABASE_PUBLISHABLE_KEY="YOUR_SUPABASE_PUBLISHABLE_KEY"
export TRANSITGUARD_DEVICE_ID="BUS-101"

# Run the production daemon
python rpi_publisher.py
```

The script publishes realistic sensor telemetry (GPS coordinates along Minna transit arterials, driver biometrics, fatigue warning cycles, and LoRa multi-hop fallback) directly to Supabase.

---

## 📡 API & Communication Endpoints

| Endpoint / Channel | Protocol | Purpose |
|---|---|---|
| `POST /rest/v1/telemetry` | HTTPS REST | Direct ingestion from Raspberry Pi 4 to Supabase PostgreSQL |
| `POST /functions/v1/ingest-telemetry` | HTTPS REST | Edge Function ingestion with token validation and deduplication |
| `public:telemetry:realtime` | WebSocket | Supabase Realtime channel broadcasting new rows to React frontend |

---

## 📄 License
TransitGuard IoT Project. All rights reserved.
