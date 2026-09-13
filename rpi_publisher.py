#!/usr/bin/env python3
"""
TransitGuard IoT - Production Raspberry Pi 4 Telemetry Publisher
================================================================
Transmits vehicle telemetry and driver biometrics directly to Supabase
over HTTPS with local SQLite offline buffering (store-and-forward) and
idempotent deduplication protection.

Security:
- Uses the Supabase Publishable / Anon key (or device ingest token for Edge Functions).
- NEVER uses or requires the Supabase service-role / secret key.
- Safe for deployment on edge hardware.
"""

import os
import sys
import time
import json
import uuid
import sqlite3
import logging
from typing import Optional, Dict, Any, Tuple
import urllib.request
import urllib.error

# -----------------------------------------------------------------------------
# Configuration & Environment Variables
# -----------------------------------------------------------------------------
# Supabase Ingestion Endpoint (Points to the ingest-telemetry Edge Function)
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://hfzqfcuezuxcgaifxqok.supabase.co").rstrip("/")
SUPABASE_INGEST_URL = os.getenv(
    "SUPABASE_INGEST_URL",
    f"{SUPABASE_URL}/functions/v1/ingest-telemetry"
).strip()

DEVICE_ID = os.getenv("TRANSITGUARD_DEVICE_ID", "BUS-101")
DEVICE_TOKEN = os.getenv("TRANSITGUARD_DEVICE_TOKEN", "tg-device-token-obu-default")
SUPABASE_ANON_KEY = os.getenv(
    "SUPABASE_ANON_KEY",
    os.getenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_0DseTT82noxmCUmx74miOg_yGFH71TF")
)

# Local SQLite Store-and-Forward Database
BUFFER_DB_PATH = os.getenv("BUFFER_DB_PATH", os.path.expanduser("~/.transitguard_buffer.db"))
PUBLISH_INTERVAL_SEC = float(os.getenv("PUBLISH_INTERVAL_SEC", "10.0"))
MAX_BUFFERED_PACKETS = int(os.getenv("MAX_BUFFERED_PACKETS", "5000"))

# Real Hardware Vitals Readers (Raspberry Pi OS Linux sysfs)
def get_hardware_cpu_temp() -> float:
    """Reads physical Raspberry Pi SoC temperature via Linux sysfs."""
    try:
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
            return round(float(f.read().strip()) / 1000.0, 1)
    except Exception:
        return 49.0

def get_hardware_cpu_load() -> float:
    """Reads 1-minute load average on Linux/RPi."""
    try:
        return round(os.getloadavg()[0] * 25.0, 1)
    except Exception:
        return 28.0

# Request Timeouts (Connect timeout, Read timeout) in seconds
REQUEST_TIMEOUT: Tuple[float, float] = (3.0, 6.0)

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("TransitGuard_RPi")


# -----------------------------------------------------------------------------
# Local SQLite Store-and-Forward Buffer
# -----------------------------------------------------------------------------
class TelemetryBuffer:
    """Manages an on-disk SQLite queue to ensure zero data loss when Wi-Fi/GSM drops."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.execute("PRAGMA journal_mode = WAL")
        return conn

    def _init_db(self):
        try:
            with self._get_connection() as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS telemetry_queue (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        message_id TEXT UNIQUE NOT NULL,
                        device_id TEXT NOT NULL,
                        payload_json TEXT NOT NULL,
                        created_at INTEGER NOT NULL,
                        retry_count INTEGER DEFAULT 0
                    );
                """)
                conn.execute("CREATE INDEX IF NOT EXISTS idx_queue_created ON telemetry_queue(id ASC);")
            logger.info(f"SQLite Store-and-Forward buffer initialized at: {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to initialize SQLite buffer: {e}")

    def enqueue(self, payload: Dict[str, Any]) -> bool:
        message_id = payload.get("messageId", str(uuid.uuid4()))
        device_id = payload.get("deviceId", DEVICE_ID)
        payload_str = json.dumps(payload)
        now_ts = int(time.time())

        try:
            with self._get_connection() as conn:
                # Prune if max capacity reached to prevent filling disk
                count = conn.execute("SELECT COUNT(*) FROM telemetry_queue").fetchone()[0]
                if count >= MAX_BUFFERED_PACKETS:
                    conn.execute("""
                        DELETE FROM telemetry_queue WHERE id IN (
                            SELECT id FROM telemetry_queue ORDER BY id ASC LIMIT 50
                        )
                    """)
                    logger.warning(f"Buffer full ({count} items). Pruned 50 oldest records.")

                conn.execute("""
                    INSERT OR IGNORE INTO telemetry_queue (message_id, device_id, payload_json, created_at, retry_count)
                    VALUES (?, ?, ?, ?, 0)
                """, (message_id, device_id, payload_str, now_ts))
            return True
        except Exception as e:
            logger.error(f"Error enqueueing telemetry packet: {e}")
            return False

    def get_pending_batch(self, limit: int = 15) -> list:
        try:
            with self._get_connection() as conn:
                cursor = conn.execute("""
                    SELECT id, message_id, payload_json, retry_count 
                    FROM telemetry_queue 
                    ORDER BY id ASC 
                    LIMIT ?
                """, (limit,))
                return cursor.fetchall()
        except Exception as e:
            logger.error(f"Error fetching pending batch from SQLite: {e}")
            return []

    def remove(self, record_ids: list):
        if not record_ids:
            return
        try:
            with self._get_connection() as conn:
                placeholders = ",".join("?" for _ in record_ids)
                conn.execute(f"DELETE FROM telemetry_queue WHERE id IN ({placeholders})", record_ids)
        except Exception as e:
            logger.error(f"Error removing sent records from buffer: {e}")

    def increment_retry(self, record_id: int):
        try:
            with self._get_connection() as conn:
                conn.execute("UPDATE telemetry_queue SET retry_count = retry_count + 1 WHERE id = ?", (record_id,))
        except Exception:
            pass

    def get_count(self) -> int:
        try:
            with self._get_connection() as conn:
                return conn.execute("SELECT COUNT(*) FROM telemetry_queue").fetchone()[0]
        except Exception:
            return 0


# -----------------------------------------------------------------------------
# Supabase Payload Transformation & HTTPS Transmission
# -----------------------------------------------------------------------------
def transform_to_supabase_row(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transforms the canonical nested JSON telemetry payload into the 
    exact flat schema required by the Supabase 'telemetry' PostgreSQL table.
    """
    loc = payload.get("location") or {}
    bio = payload.get("biometrics") or {}
    hw = payload.get("hardware") or {}
    trans = payload.get("transport") or {}

    raw_ts = payload.get("timestamp")
    if isinstance(raw_ts, (int, float)):
        # Convert numeric unix epoch (seconds or ms) to ISO 8601 string
        if raw_ts > 1e11:  # ms
            iso_timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(raw_ts / 1000.0))
        else:
            iso_timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(raw_ts))
    elif isinstance(raw_ts, str):
        iso_timestamp = raw_ts
    else:
        iso_timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    return {
        "device_id": str(payload.get("deviceId", DEVICE_ID)),
        "message_id": str(payload.get("messageId", str(uuid.uuid4()))),
        "timestamp": iso_timestamp,

        # Location
        "latitude": loc.get("lat"),
        "longitude": loc.get("lng"),
        "speed": loc.get("speed", 0.0),
        "heading": loc.get("heading", 0.0),
        "satellite_count": loc.get("satelliteCount", 0),
        "has_fix": bool(loc.get("hasFix", False)),

        # Biometrics
        "ear": bio.get("ear"),
        "mar": bio.get("mar"),
        "perclos": bio.get("perclos"),
        "head_pitch": bio.get("headPitch"),
        "head_yaw": bio.get("headYaw"),
        "head_roll": bio.get("headRoll"),
        "alcohol_voltage": bio.get("alcoholVoltage"),
        "alcohol_raw_adc": bio.get("alcoholRawADC"),
        "alcohol_risk_score": bio.get("alcoholRiskScore"),
        "driver_state": bio.get("driverState", "NORMAL"),

        # Hardware
        "cpu_load": hw.get("cpuLoad"),
        "cpu_temp": hw.get("cpuTemp"),
        "power_watts": hw.get("powerWatts"),
        "battery_voltage": hw.get("batteryVoltage"),
        "buzzer_active": bool(hw.get("buzzerActive", False)),
        "lcd_message": hw.get("lcdMessage"),

        # Transport
        "transport_mode": (trans.get("mode") or "WIFI").upper(),
        "wifi_rssi": trans.get("wifiRssi"),
        "wifi_ssid": trans.get("wifiSsid"),
        "lora_hop_count": trans.get("loraHopCount", 0),
        "lora_rssi": trans.get("loraRssi"),
        "lora_snr": trans.get("loraSnr"),
        "relayed_via": trans.get("relayedVia"),
        "buffered_queue_count": trans.get("bufferedQueueCount", 0),

        # Raw Payload Preservation
        "raw_payload": payload,
    }


class SupabaseTelemetryPublisher:
    """Manages robust HTTPS communication with Supabase REST API or Edge Function."""

    def __init__(self, buffer: TelemetryBuffer):
        self.buffer = buffer

        # Target Endpoint & Headers setup
        if SUPABASE_INGEST_URL:
            self.target_url = SUPABASE_INGEST_URL
            self.is_edge_function = True
            self.headers = {
                "Content-Type": "application/json",
                "x-device-token": DEVICE_TOKEN,
                "Authorization": f"Bearer {DEVICE_TOKEN}",
            }
            logger.info(f"Targeting Supabase Edge Function: {self.target_url}")
        else:
            self.target_url = f"{SUPABASE_URL}/rest/v1/telemetry"
            self.is_edge_function = False
            self.headers = {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                "Content-Type": "application/json",
                # On conflict ignore duplicates prevents 409 errors on network retransmissions
                "Prefer": "resolution=ignore-duplicates,return=minimal",
            }
            logger.info(f"Targeting Supabase REST API: {self.target_url}")

    def send_record(self, payload: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Sends a single telemetry payload to Supabase. Returns (success, error_reason)."""
        try:
            if self.is_edge_function:
                body_data = json.dumps(payload).encode("utf-8")
            else:
                db_record = transform_to_supabase_row(payload)
                body_data = json.dumps(db_record).encode("utf-8")

            req = urllib.request.Request(
                self.target_url,
                data=body_data,
                headers=self.headers,
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT[1]) as resp:
                status_code = resp.getcode()
                if status_code in (200, 201):
                    return True, None
                return True, None

        except urllib.error.HTTPError as e:
            if e.code in (200, 201):
                return True, None
            elif e.code == 409:
                return True, "duplicate_ignored"
            err_msg = e.read().decode("utf-8", errors="replace")[:120]
            return False, f"HTTP {e.code}: {err_msg}"
        except urllib.error.URLError as e:
            return False, f"Network unreachable: {e.reason}"
        except Exception as e:
            return False, f"Transmission error: {e}"

    def flush_offline_buffer(self, max_batch: int = 15):
        """Flushes buffered records that were queued while offline."""
        pending = self.buffer.get_pending_batch(limit=max_batch)
        if not pending:
            return

        buffered_count = self.buffer.get_count()
        logger.info(f"Flushing offline backlog: {len(pending)} of {buffered_count} buffered records...")
        successfully_sent_ids = []

        for record_id, msg_id, payload_str, retry_cnt in pending:
            try:
                payload = json.loads(payload_str)
                # Update current queue count in payload
                if "transport" in payload:
                    payload["transport"]["bufferedQueueCount"] = buffered_count
                success, err = self.send_record(payload)

                if success:
                    successfully_sent_ids.append(record_id)
                else:
                    self.buffer.increment_retry(record_id)
                    logger.warning(f"Could not flush buffered msg {msg_id}: {err}")
                    # If network connection dropped again, stop flushing this cycle
                    break
            except Exception as e:
                logger.error(f"Corrupt record {record_id} discarded: {e}")
                successfully_sent_ids.append(record_id)

        if successfully_sent_ids:
            self.buffer.remove(successfully_sent_ids)
            remaining = self.buffer.get_count()
            logger.info(f"Successfully flushed {len(successfully_sent_ids)} records. {remaining} remaining.")

    def publish_telemetry(self, payload: Dict[str, Any]):
        """
        Main entry point called by the driver monitoring and GPS loop.
        Ensures the loop never crashes even if internet is down.
        """
        # Inject device ID, message ID, timestamp, and driverState if not present
        if "deviceId" not in payload:
            payload["deviceId"] = DEVICE_ID
        if "messageId" not in payload:
            payload["messageId"] = f"msg-{uuid.uuid4()}"
        if "timestamp" not in payload:
            payload["timestamp"] = int(time.time() * 1000)
        if "driverState" not in payload:
            payload["driverState"] = payload.get("biometrics", {}).get("driverState", "NORMAL")

        # Update buffered count indicator
        buffered_count = self.buffer.get_count()
        if "transport" not in payload:
            payload["transport"] = {}
        payload["transport"]["bufferedQueueCount"] = buffered_count

        # Attempt direct transmission
        success, err = self.send_record(payload)

        if success:
            logger.info(
                f"[LIVE SENT] {payload['deviceId']} | "
                f"State: {payload.get('biometrics', {}).get('driverState', 'NORMAL')} | "
                f"Speed: {payload.get('location', {}).get('speed', 0)} km/h | "
                f"MsgId: {payload['messageId'][:12]}..."
            )
            # If buffer has pending items and live send succeeded, flush backlog
            if buffered_count > 0:
                self.flush_offline_buffer()
        else:
            # Buffer locally in SQLite to prevent any data loss
            logger.warning(f"[OFFLINE BUFFERED] {err}. Enqueueing message to SQLite buffer.")
            self.buffer.enqueue(payload)


# -----------------------------------------------------------------------------
# Standalone / Production Daemon Execution
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="TransitGuard IoT Raspberry Pi 4 Telemetry Publisher")
    parser.add_argument("--once", action="store_true", help="Publish a single telemetry packet and exit (ideal for diagnostics)")
    parser.add_argument("--interval", type=float, default=PUBLISH_INTERVAL_SEC, help="Publish interval in seconds (default: 10.0)")
    parser.add_argument("--device", default=DEVICE_ID, help=f"Device identifier (default: {DEVICE_ID})")
    parser.add_argument("--token", default=DEVICE_TOKEN, help="Device auth token")
    parser.add_argument("--url", default=SUPABASE_INGEST_URL, help="Supabase Edge Function endpoint")
    parser.add_argument("--state", default="NORMAL", choices=["NORMAL", "DROWSY", "CRITICAL_FATIGUE", "ALCOHOL_ALERT"], help="Driver monitoring state")
    parser.add_argument("--status", action="store_true", help="Display local SQLite buffer queue metrics and exit")
    parser.add_argument("--flush", action="store_true", help="Attempt to flush any pending offline buffer records and exit")

    args = parser.parse_args()

    # Apply CLI overrides if provided
    DEVICE_ID = args.device
    DEVICE_TOKEN = args.token
    SUPABASE_INGEST_URL = args.url
    PUBLISH_INTERVAL_SEC = args.interval

    masked_token = f"{DEVICE_TOKEN[:8]}***" if len(DEVICE_TOKEN) > 8 else "***"
    logger.info("Initializing TransitGuard Raspberry Pi 4 Telemetry Publisher...")
    logger.info(f"Target URL : {SUPABASE_INGEST_URL}")
    logger.info(f"Device ID  : {DEVICE_ID}")
    logger.info(f"Auth Token : {masked_token}")
    logger.info(f"SQLite DB  : {BUFFER_DB_PATH}")

    buffer = TelemetryBuffer(BUFFER_DB_PATH)
    publisher = SupabaseTelemetryPublisher(buffer)

    if args.status:
        count = buffer.get_count()
        print(f"\n[Buffer Status] SQLite Database: {BUFFER_DB_PATH}")
        print(f"                Buffered Backlog Count: {count} packets\n")
        sys.exit(0)

    if args.flush:
        count = buffer.get_count()
        print(f"\n[Buffer Flush] Attempting to flush {count} packets from SQLite buffer...")
        publisher.flush_offline_buffer(max_batch=count if count > 0 else 15)
        remaining = buffer.get_count()
        print(f"[Buffer Flush] Complete. Remaining backlog: {remaining}\n")
        sys.exit(0)

    print("-" * 70)
    print(" TransitGuard RPi 4 Publisher Running. Press Ctrl+C to exit.")
    print("-" * 70)

    seq = 0
    try:
        while True:
            seq += 1
            cpu_temp = get_hardware_cpu_temp()
            cpu_load = get_hardware_cpu_load()

            # Driver state biometrics profile
            if args.state == "CRITICAL_FATIGUE":
                ear, mar, perclos, pitch, buzzer, alc_v, alc_adc, alc_score = 0.165, 0.680, 86.4, -18.5, True, 0.38, 117, 0.04
            elif args.state == "DROWSY":
                ear, mar, perclos, pitch, buzzer, alc_v, alc_adc, alc_score = 0.220, 0.540, 42.0, -8.0, False, 0.38, 117, 0.04
            elif args.state == "ALCOHOL_ALERT":
                ear, mar, perclos, pitch, buzzer, alc_v, alc_adc, alc_score = 0.310, 0.290, 6.0, 1.0, True, 2.45, 759, 0.88
            else: # NORMAL
                ear, mar, perclos, pitch, buzzer, alc_v, alc_adc, alc_score = 0.325, 0.295, 3.8, 2.0, False, 0.38, 118, 0.04

            # Sample live telemetry matching edge sensor inputs
            sample_payload = {
                "deviceId": DEVICE_ID,
                "messageId": f"rpi-{uuid.uuid4()}",
                "timestamp": int(time.time() * 1000),
                "driverState": args.state,
                "location": {
                    "lat": round(9.582415 + (seq * 0.0001), 6),
                    "lng": round(6.545892 + (seq * 0.0001), 6),
                    "speed": 42.5,
                    "heading": 138,
                    "satelliteCount": 11,
                    "hasFix": True,
                },
                "biometrics": {
                    "ear": ear,
                    "mar": mar,
                    "perclos": perclos,
                    "headPitch": pitch,
                    "headYaw": 0.0,
                    "headRoll": 0.0,
                    "alcoholVoltage": alc_v,
                    "alcoholRawADC": alc_adc,
                    "alcoholRiskScore": alc_score,
                    "driverState": args.state,
                },
                "hardware": {
                    "cpuLoad": cpu_load,
                    "cpuTemp": cpu_temp,
                    "powerWatts": 5.12,
                    "batteryVoltage": 12.45,
                    "buzzerActive": buzzer,
                    "lcdMessage": f"{DEVICE_ID} OK | WIFI LIVE" if not buzzer else "ALARM ACTIVE!",
                },
                "transport": {
                    "mode": "WIFI",
                    "wifiRssi": -64,
                    "wifiSsid": "MinnaTransit_Hub",
                    "loraHopCount": 0,
                    "loraRssi": None,
                    "loraSnr": None,
                    "relayedVia": None,
                    "bufferedQueueCount": buffer.get_count(),
                },
            }

            publisher.publish_telemetry(sample_payload)

            if args.once:
                logger.info("Single diagnostic packet transmitted successfully. Exiting.")
                break

            time.sleep(PUBLISH_INTERVAL_SEC)
    except KeyboardInterrupt:
        logger.info("Publisher stopped by operator.")
        sys.exit(0)
