"""
TransitGuard IoT - Bench-Test Simulated MQTT Publisher
Simulates Raspberry Pi 4 On-Board Unit (OBU) sending live telemetry
over MQTT to the TransitGuard broker and dashboard.

Schema follows: Hardware-to-Backend Integration Specification (RPi 4 OBU)
"""

import time
import json
import uuid
import sys
import paho.mqtt.client as mqtt

BROKER_HOST = "localhost"
BROKER_PORT = 1883
TOPIC = "transitguard/telemetry/BUS-101"
PUBLISH_INTERVAL_SEC = 5

# Realistic GPS route waypoints along Minna transit arterial
WAYPOINTS = [
    {"lat": 9.582415, "lng": 6.545892, "heading": 138, "speed": 42.5},
    {"lat": 9.584102, "lng": 6.547110, "heading": 140, "speed": 44.0},
    {"lat": 9.586112, "lng": 6.548903, "heading": 142, "speed": 36.0},
    {"lat": 9.588420, "lng": 6.551020, "heading": 145, "speed": 30.5},
    {"lat": 9.590800, "lng": 6.553400, "heading": 148, "speed": 40.0},
    {"lat": 9.593100, "lng": 6.555800, "heading": 150, "speed": 46.2},
    {"lat": 9.595500, "lng": 6.558200, "heading": 152, "speed": 48.0},
    {"lat": 9.597900, "lng": 6.560600, "heading": 150, "speed": 43.1},
]

# Scenario progression to demonstrate dashboard real-time updates and alerting
SCENARIOS = [
    # 0: Normal driving
    {
        "phase": "NORMAL_DRIVING",
        "driverState": "NORMAL",
        "ear": 0.325,
        "mar": 0.310,
        "perclos": 4.1,
        "pitch": 2.5,
        "yaw": -1.2,
        "roll": 0.5,
        "alcoholVolt": 0.38,
        "alcoholAdc": 118,
        "alcoholScore": 0.04,
        "buzzer": False,
        "lcd": "SYS: OK | WIFI LIVE",
        "mode": "WIFI",
        "hop": 0,
        "relayedVia": None,
    },
    # 1: Normal driving continuing
    {
        "phase": "NORMAL_DRIVING",
        "driverState": "NORMAL",
        "ear": 0.318,
        "mar": 0.320,
        "perclos": 4.5,
        "pitch": 3.0,
        "yaw": 0.8,
        "roll": 0.2,
        "alcoholVolt": 0.37,
        "alcoholAdc": 116,
        "alcoholScore": 0.04,
        "buzzer": False,
        "lcd": "SYS: OK | WIFI LIVE",
        "mode": "WIFI",
        "hop": 0,
        "relayedVia": None,
    },
    # 2: Yawn & Drowsiness onset
    {
        "phase": "DROWSINESS_ONSET",
        "driverState": "DROWSY",
        "ear": 0.245,
        "mar": 0.690,  # Elevated MAR indicates yawning
        "perclos": 12.8,
        "pitch": 8.5,
        "yaw": 3.2,
        "roll": 1.0,
        "alcoholVolt": 0.38,
        "alcoholAdc": 119,
        "alcoholScore": 0.04,
        "buzzer": False,
        "lcd": "WARN: DROWSY YAWN",
        "mode": "WIFI",
        "hop": 0,
        "relayedVia": None,
    },
    # 3: Critical Fatigue incident (Eyes closing, head dropping down)
    {
        "phase": "CRITICAL_FATIGUE_INCIDENT",
        "driverState": "CRITICAL_FATIGUE",
        "ear": 0.162,  # Critically low EAR < 0.20
        "mar": 0.410,
        "perclos": 22.4,  # High PERCLOS > 15%
        "pitch": 24.5,  # Nodding down > 20 deg
        "yaw": 4.1,
        "roll": 1.2,
        "alcoholVolt": 0.39,
        "alcoholAdc": 121,
        "alcoholScore": 0.05,
        "buzzer": True,  # Hardware buzzer activated
        "lcd": "!! PULL OVER NOW !!",
        "mode": "WIFI",
        "hop": 0,
        "relayedVia": None,
    },
    # 4: LoRa Fallback Rescue (Wi-Fi drops in blindspot, 2-hop mesh through BUS-103)
    {
        "phase": "LORA_MESH_FALLBACK",
        "driverState": "CAUTION",
        "ear": 0.285,
        "mar": 0.340,
        "perclos": 8.5,
        "pitch": 4.0,
        "yaw": -2.0,
        "roll": 0.0,
        "alcoholVolt": 0.38,
        "alcoholAdc": 118,
        "alcoholScore": 0.04,
        "buzzer": False,
        "lcd": "LORA RESCUE h=2",
        "mode": "LORA",
        "hop": 2,
        "relayedVia": "BUS-103",
    },
    # 5: Return to normal safe driving
    {
        "phase": "RECOVERED_NORMAL",
        "driverState": "NORMAL",
        "ear": 0.330,
        "mar": 0.305,
        "perclos": 3.8,
        "pitch": 1.5,
        "yaw": 0.2,
        "roll": 0.0,
        "alcoholVolt": 0.36,
        "alcoholAdc": 112,
        "alcoholScore": 0.03,
        "buzzer": False,
        "lcd": "SYS: OK | WIFI LIVE",
        "mode": "WIFI",
        "hop": 0,
        "relayedVia": None,
    },
]


def create_payload(seq: int) -> dict:
    scenario = SCENARIOS[seq % len(SCENARIOS)]
    waypoint = WAYPOINTS[seq % len(WAYPOINTS)]

    payload = {
        "deviceId": "BUS-101",
        "messageId": f"msg-{uuid.uuid4()}",
        "timestamp": int(time.time() * 1000),
        "location": {
            "lat": waypoint["lat"],
            "lng": waypoint["lng"],
            "speed": waypoint["speed"],
            "heading": waypoint["heading"],
            "satelliteCount": 11,
            "hasFix": True,
        },
        "biometrics": {
            "ear": scenario["ear"],
            "mar": scenario["mar"],
            "perclos": scenario["perclos"],
            "headPitch": scenario["pitch"],
            "headYaw": scenario["yaw"],
            "headRoll": scenario["roll"],
            "alcoholVoltage": scenario["alcoholVolt"],
            "alcoholRawADC": scenario["alcoholAdc"],
            "alcoholRiskScore": scenario["alcoholScore"],
            "driverState": scenario["driverState"],
        },
        "hardware": {
            "cpuLoad": 28 + (seq % 10),
            "cpuTemp": 49.5 + (seq % 4) * 0.5,
            "powerWatts": 5.12 + (seq % 3) * 0.2,
            "batteryVoltage": 12.45,
            "buzzerActive": scenario["buzzer"],
            "lcdMessage": scenario["lcd"],
        },
        "transport": {
            "mode": scenario["mode"],
            "wifiRssi": -64 if scenario["mode"] == "WIFI" else None,
            "wifiSsid": "MinnaTransit_Hub_01" if scenario["mode"] == "WIFI" else None,
            "loraHopCount": scenario["hop"],
            "relayedVia": scenario["relayedVia"],
            "loraRssi": -102 if scenario["mode"] == "LORA" else None,
            "loraSnr": 6.2 if scenario["mode"] == "LORA" else None,
            "bufferedQueueCount": 0,
        },
    }
    return payload, scenario["phase"]


def main():
    print("=" * 72)
    print("  TransitGuard IoT - Bench-Test Simulated Telemetry Publisher")
    print(f"  Target Broker : tcp://{BROKER_HOST}:{BROKER_PORT}")
    print(f"  MQTT Topic    : {TOPIC}")
    print(f"  Interval      : Every {PUBLISH_INTERVAL_SEC}s")
    print("=" * 72)

    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id="TransitGuard_BenchPublisher_RPi4"
    )

    connected = False

    def on_connect(c, userdata, flags, rc, properties=None):
        nonlocal connected
        if rc == 0:
            connected = True
            print(f"[+] Successfully connected to MQTT broker at {BROKER_HOST}:{BROKER_PORT}")
        else:
            print(f"[-] Failed to connect, return code: {rc}")

    client.on_connect = on_connect

    try:
        client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
        client.loop_start()
    except Exception as e:
        print(f"[!] Connection error: {e}")
        sys.exit(1)

    # Wait for connection confirmation
    timeout = 5.0
    start_t = time.time()
    while not connected and (time.time() - start_t < timeout):
        time.sleep(0.1)

    if not connected:
        print("[!] Timeout waiting for MQTT broker connection acknowledgement.")
        sys.exit(1)

    seq = 0
    try:
        while True:
            payload, phase = create_payload(seq)
            payload_str = json.dumps(payload, indent=2)

            info = client.publish(TOPIC, payload_str, qos=1)
            info.wait_for_publish(timeout=3.0)

            print(f"\n[#{seq + 1:03d} PUBLISHED] Phase: {phase}")
            print(f"       Device   : {payload['deviceId']} | State: {payload['biometrics']['driverState']}")
            print(f"       GPS      : ({payload['location']['lat']:.5f}, {payload['location']['lng']:.5f}) @ {payload['location']['speed']} km/h")
            print(f"       Biometrics: EAR={payload['biometrics']['ear']:.3f} | MAR={payload['biometrics']['mar']:.3f} | PERCLOS={payload['biometrics']['perclos']:.1f}%")
            print(f"       Hardware : Buzzer={'ACTIVE' if payload['hardware']['buzzerActive'] else 'OFF'} | LCD=\"{payload['hardware']['lcdMessage']}\"")
            print(f"       Transport: {payload['transport']['mode']} (Hop: {payload['transport']['loraHopCount']}, RelayedVia: {payload['transport']['relayedVia']})")

            seq += 1
            time.sleep(PUBLISH_INTERVAL_SEC)
    except KeyboardInterrupt:
        print("\n[!] Publisher stopped by user.")
    finally:
        client.loop_stop()
        client.disconnect()
        print("[*] Disconnected cleanly from MQTT broker.")


if __name__ == "__main__":
    main()
