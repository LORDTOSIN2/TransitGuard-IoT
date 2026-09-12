#!/usr/bin/env python3
"""
TransitGuard IoT - Windows PC Fake Telemetry Publisher
======================================================
A zero-dependency Python script designed to run easily on Windows
(Command Prompt, PowerShell, Windows Terminal) or any laptop/workstation.

Tests the Supabase Edge Function:
  POST https://hfzqfcuezuxcgaifxqok.supabase.co/functions/v1/ingest-telemetry

It sends the exact canonical TransitGuard telemetry JSON payload with:
  - Content-Type: application/json
  - x-device-token: <TRANSITGUARD_DEVICE_TOKEN>

Usage on Windows:
  python fake_publisher_windows.py
  python fake_publisher_windows.py --loop
  python fake_publisher_windows.py --loop --interval 3.0
  python fake_publisher_windows.py --state CRITICAL_FATIGUE
  python fake_publisher_windows.py --test-auth-reject
  python fake_publisher_windows.py --test-invalid-payload
"""

import os
import sys
import time
import json
import uuid
import argparse
import urllib.request
import urllib.error

# -----------------------------------------------------------------------------
# Configuration (Customizable via CLI or Environment Variables)
# -----------------------------------------------------------------------------
DEFAULT_INGEST_URL = "https://hfzqfcuezuxcgaifxqok.supabase.co/functions/v1/ingest-telemetry"
INGEST_URL = os.getenv("SUPABASE_INGEST_URL", DEFAULT_INGEST_URL).strip()

DEVICE_ID = os.getenv("TRANSITGUARD_DEVICE_ID", "BUS-101").strip()
DEVICE_TOKEN = os.getenv("TRANSITGUARD_DEVICE_TOKEN", "tg-device-token-obu-default").strip()

# Realistic arterial GPS waypoints (Minna, Niger State public transit corridor)
WAYPOINTS = [
    {"lat": 9.582415, "lng": 6.545892, "speed": 42.5, "heading": 138},
    {"lat": 9.584102, "lng": 6.547110, "speed": 44.0, "heading": 140},
    {"lat": 9.586112, "lng": 6.548903, "speed": 36.0, "heading": 142},
    {"lat": 9.588420, "lng": 6.551020, "speed": 30.5, "heading": 145},
    {"lat": 9.590800, "lng": 6.553400, "speed": 40.0, "heading": 148},
    {"lat": 9.593100, "lng": 6.555800, "speed": 46.2, "heading": 150},
    {"lat": 9.595500, "lng": 6.558200, "speed": 48.0, "heading": 152},
    {"lat": 9.597900, "lng": 6.560600, "speed": 43.1, "heading": 150},
]


def build_telemetry_payload(
    device_id: str,
    seq: int = 0,
    driver_state: str = "NORMAL",
    custom_msg_id: str = None
) -> dict:
    """Builds the canonical TransitGuard JSON telemetry payload."""
    wpt = WAYPOINTS[seq % len(WAYPOINTS)]
    msg_id = custom_msg_id or f"win-fake-{uuid.uuid4()}"
    timestamp_ms = int(time.time() * 1000)

    # Sensor profiles according to driver state
    if driver_state == "CRITICAL_FATIGUE":
        ear = 0.165       # Severe eye closure (micro-sleep)
        mar = 0.680       # Yawn
        perclos = 86.4    # Critical PERCLOS
        pitch = -18.5     # Head drooping
        buzzer = True
        alcohol_score = 0.04
        alcohol_volt = 0.38
        lcd_msg = "FATIGUE ALARM!"
    elif driver_state == "DROWSY":
        ear = 0.220
        mar = 0.540
        perclos = 42.0
        pitch = -8.0
        buzzer = False
        alcohol_score = 0.04
        alcohol_volt = 0.38
        lcd_msg = "DROWSINESS DETECTED"
    elif driver_state == "ALCOHOL_ALERT":
        ear = 0.310
        mar = 0.290
        perclos = 6.0
        pitch = 1.0
        buzzer = True
        alcohol_score = 0.88
        alcohol_volt = 2.45
        lcd_msg = "ALCOHOL HAZARD!"
    else:  # NORMAL
        ear = 0.325
        mar = 0.295
        perclos = 3.8
        pitch = 2.0
        buzzer = False
        alcohol_score = 0.04
        alcohol_volt = 0.38
        lcd_msg = f"{device_id} READY"

    return {
        # Required core fields
        "deviceId": device_id,
        "messageId": msg_id,
        "timestamp": timestamp_ms,
        "driverState": driver_state,

        # Real-time GPS & Motion
        "location": {
            "lat": round(wpt["lat"], 6),
            "lng": round(wpt["lng"], 6),
            "speed": wpt["speed"],
            "heading": wpt["heading"],
            "satelliteCount": 11,
            "hasFix": True,
        },

        # Computer Vision & Sensor Biometrics
        "biometrics": {
            "ear": round(ear, 3),
            "mar": round(mar, 3),
            "perclos": round(perclos, 1),
            "headPitch": pitch,
            "headYaw": 0.0,
            "headRoll": 0.0,
            "alcoholVoltage": alcohol_volt,
            "alcoholRawADC": int(alcohol_volt * 310),
            "alcoholRiskScore": round(alcohol_score, 2),
            "driverState": driver_state,
        },

        # Hardware Vitals
        "hardware": {
            "cpuLoad": 28 + (seq % 10),
            "cpuTemp": round(49.0 + (seq % 4) * 0.5, 1),
            "powerWatts": 5.15,
            "batteryVoltage": 12.45,
            "buzzerActive": buzzer,
            "lcdMessage": lcd_msg,
        },

        # Transmission Network
        "transport": {
            "mode": "WIFI",
            "wifiRssi": -63,
            "wifiSsid": "MinnaTransit_Hub",
            "loraHopCount": 0,
            "bufferedQueueCount": 0,
        },
    }


def send_packet(url: str, token: str, payload: dict, timeout_sec: float = 8.0) -> tuple:
    """Sends telemetry payload to Edge Function via standard urllib."""
    body_data = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "x-device-token": token,
        "Authorization": f"Bearer {token}",
    }

    req = urllib.request.Request(url, data=body_data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=timeout_sec) as response:
            status_code = response.getcode()
            resp_body = response.read().decode("utf-8", errors="replace")
            return (True, status_code, resp_body)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        return (False, e.code, err_body)
    except urllib.error.URLError as e:
        return (False, 0, f"Network connection error: {e.reason}")
    except Exception as e:
        return (False, 0, f"Unexpected error: {e}")


def main():
    parser = argparse.ArgumentParser(description="TransitGuard IoT Windows Fake Telemetry Publisher")
    parser.add_argument("--url", default=INGEST_URL, help="Supabase Edge Function endpoint")
    parser.add_argument("--device", default=DEVICE_ID, help="Device ID (e.g. BUS-101)")
    parser.add_argument("--token", default=DEVICE_TOKEN, help="Device authentication token")
    parser.add_argument("--state", default="NORMAL", choices=["NORMAL", "DROWSY", "CRITICAL_FATIGUE", "ALCOHOL_ALERT"], help="Driver monitoring state")
    parser.add_argument("--loop", "-l", action="store_true", help="Continuously stream telemetry every N seconds")
    parser.add_argument("--interval", type=float, default=5.0, help="Interval in seconds for continuous stream (default: 5.0)")
    parser.add_argument("--test-auth-reject", action="store_true", help="Send invalid token to verify HTTP 401 Unauthorized rejection")
    parser.add_argument("--test-invalid-payload", action="store_true", help="Send broken payload to verify HTTP 400 Bad Request rejection")

    args = parser.parse_args()

    print("=" * 76)
    print("  TransitGuard IoT • Windows Fake Telemetry Publisher")
    print(f"  Target URL : {args.url}")
    print(f"  Device ID  : {args.device}")
    print(f"  Token      : {args.token[:8]}***")
    print("=" * 76)

    # 1. Test Auth Rejection if requested
    if args.test_auth_reject:
        print("\n>>> Testing Security: Sending request with INVALID device token...")
        payload = build_telemetry_payload(args.device, driver_state=args.state)
        ok, code, body = send_packet(args.url, "wrong-token-12345", payload)
        print(f"  Response Status: HTTP {code}")
        print(f"  Response Body  : {body}")
        if code == 401:
            print("  [PASS] Successfully rejected with HTTP 401 Unauthorized!")
        else:
            print(f"  [NOTE] Returned status {code} (Check if Edge Function secret is set)")
        return

    # 2. Test Invalid Payload if requested
    if args.test_invalid_payload:
        print("\n>>> Testing Validation: Sending MALFORMED payload (missing required messageId and location)...")
        broken_payload = {
            "deviceId": args.device,
            # missing messageId, timestamp, location, driverState
        }
        ok, code, body = send_packet(args.url, args.token, broken_payload)
        print(f"  Response Status: HTTP {code}")
        print(f"  Response Body  : {body}")
        if code == 400:
            print("  [PASS] Successfully rejected with HTTP 400 Invalid telemetry payload!")
        else:
            print(f"  [NOTE] Returned status {code}")
        return

    # 3. Continuous Loop Mode
    if args.loop:
        print(f"\nStreaming live telemetry every {args.interval} seconds. Press Ctrl+C to stop.\n")
        seq = 0
        try:
            while True:
                seq += 1
                payload = build_telemetry_payload(args.device, seq=seq, driver_state=args.state)
                ok, code, body = send_packet(args.url, args.token, payload)

                status_tag = "SUCCESS" if ok or code in (200, 201) else f"ERR-{code}"
                lat = payload["location"]["lat"]
                lng = payload["location"]["lng"]
                spd = payload["location"]["speed"]
                ear = payload["biometrics"]["ear"]
                perclos = payload["biometrics"]["perclos"]

                print(
                    f"[#{seq:04d} {status_tag}] HTTP {code} | "
                    f"GPS: ({lat:.5f}, {lng:.5f}) @ {spd} km/h | "
                    f"State: {payload['driverState']} (EAR={ear}, PERCLOS={perclos}%)"
                )
                if not (ok or code in (200, 201)):
                    print(f"       Response: {body}")

                time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\nStopped by user.")
        return

    # 4. Single Transmission Mode (Default)
    print("\nSending a single canonical telemetry test packet...")
    payload = build_telemetry_payload(args.device, seq=0, driver_state=args.state)
    print("Payload:")
    print(json.dumps(payload, indent=2))
    print("\nTransmitting to Edge Function...")

    start_t = time.time()
    ok, code, body = send_packet(args.url, args.token, payload)
    elapsed = (time.time() - start_t) * 1000.0

    print(f"\nResult in {elapsed:.1f}ms:")
    print(f"  HTTP Status Code : {code}")
    print(f"  Server Response  : {body}")

    if code == 201 or (ok and code == 200):
        print("\n>>> [SUCCESS] Telemetry accepted by Supabase Edge Function!")
        print("    Check your Vercel React dashboard to view live fleet updates.")
    elif code == 401:
        print("\n>>> [401 UNAUTHORIZED] The device token was rejected.")
        print("    Ensure TRANSITGUARD_DEVICE_TOKEN secret is set in your Supabase project.")
    elif code == 404:
        print("\n>>> [404 NOT FOUND] The Edge Function has not yet been deployed to your Supabase project.")
        print("    Run: supabase functions deploy ingest-telemetry --no-verify-jwt --project-ref hfzqfcuezuxcgaifxqok")
    else:
        print(f"\n>>> [RESPONSE {code}] Received response from server.")


if __name__ == "__main__":
    main()
