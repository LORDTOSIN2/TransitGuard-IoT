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

- **Embedded MQTT Broker & Live Streaming**:
  - Integrated Aedes MQTT broker listening on port `1883` (`tcp://0.0.0.0:1883`).
  - Server-Sent Events (SSE) `/api/stream` pushing live telemetry packets to connected browsers without manual page reloads.
  - Dedicated bench-test Python publisher (`test_publisher.py`) using Paho MQTT for hardware-in-the-loop simulation.

---

## 🚀 Quick Start

### 1. Prerequisites
- [Bun](https://bun.sh/) (or Node.js 18+)
- Python 3.10+ (for bench-test telemetry publisher)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/LORDTOSIN2/TransitGuard-IoT.git
cd TransitGuard-IoT

# Install dependencies
bun install
```

### 3. Running the System

Start the development dashboard and backend server:

```bash
# Terminal 1: Start Vite Frontend (Port 3000)
bun run dev

# Terminal 2: Start Embedded MQTT Broker & Backend API (Ports 1883 & 3001)
bun run server
```

Access the dashboard at **http://localhost:3000/**.

---

## 🧪 Bench-Testing With Simulated Telemetry

Before attaching physical Raspberry Pi 4 hardware, you can validate the entire pipeline using the included Python Paho MQTT bench-test script:

```bash
# Install Python MQTT dependency
pip install paho-mqtt

# Run the test publisher
python test_publisher.py
# or
bun run test:publisher
```

The script publishes realistic sensor telemetry (GPS coordinates along Minna transit arterials, driver biometrics, fatigue warning cycles, and LoRa multi-hop fallback) to `transitguard/telemetry/BUS-101` every 5 seconds.

---

## 📡 API & Communication Endpoints

| Endpoint / Topic | Protocol | Purpose |
|---|---|---|
| `tcp://localhost:1883` | MQTT | Ingests telemetry on `transitguard/telemetry/+` |
| `GET /api/status` | HTTP | Server health, MQTT broker status, and connected clients |
| `GET /api/stream` | HTTP (SSE) | Real-time event stream broadcasting telemetry to the dashboard |
| `POST /api/telemetry` | HTTP | Direct Wi-Fi telemetry submission with deduplication & command ack |
| `GET /api/fleet` | HTTP | Latest state snapshot for all active vehicles |
| `GET /api/alerts` | HTTP | Active and historical incident alerts |

---

## 📄 License
TransitGuard IoT Project. All rights reserved.
