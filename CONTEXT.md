# CONTEXT.md — TransitGuard-IoT orientation

Written for any coding agent or developer picking this repo up cold.
Verified against the live system on **2026-10-16**.

## What this repo is

The **cloud + dashboard half** of TransitGuard: the Supabase schema and the
`ingest-telemetry` Edge Function that receives vehicle telemetry, plus the Vite/React
dashboard that displays it.

```
 Pi (TransitGuard_Pi)  ──POST──►  Edge Function: ingest-telemetry  ──►  Postgres          ──►  Dashboard (this repo, Vercel)
 vehicle_monitor.py                supabase/functions/...              public.telemetry        transit-guard-io-t.vercel.app
```

## Companion repository

| Repo | GitHub | Local path |
|---|---|---|
| **TransitGuard-IoT** (this one) | https://github.com/LORDTOSIN2/TransitGuard-IoT.git | `E:\HOME\CODES\2026\TransitGuard-IoT` |
| **TransitGuard_Pi** (the device) | https://github.com/LORDTOSIN2/TransitGuard_Pi.git | `E:\HOME\CODES\2026\transitguard-repo` |

> **The full system handover lives in the Pi repo:** [`CONTEXT.md` in TransitGuard_Pi](https://github.com/LORDTOSIN2/TransitGuard_Pi/blob/main/CONTEXT.md).
> That document covers the Pi's layout, SSH access, Wi-Fi/hotspot switching, Supabase
> credentials, telemetry/queue behaviour, the measurement tooling and current gotchas.
> **Read it before touching the ingest path.**

Both repos are **public** — never commit real credentials (see below).

## Supabase

| Item | Value |
|---|---|
| Project ref | `hfzqfcuezuxcgaifxqok` |
| API / project URL | `https://hfzqfcuezuxcgaifxqok.supabase.co` |
| Ingest endpoint | `https://hfzqfcuezuxcgaifxqok.supabase.co/functions/v1/ingest-telemetry` |
| Edge Function source | `supabase/functions/ingest-telemetry/index.ts` (Deno) |
| Table | `public.telemetry` |
| Publishable (anon) key | `sb_publishable_0DseTT82noxmCUmx74miOg_yGFH71TF` — already public in `src/services/supabaseService.ts` and `rpi.env.example` |
| Deployed dashboard | **https://transit-guard-io-t.vercel.app/** |

### `public.telemetry` — essentials

* `message_id TEXT NOT NULL UNIQUE` — the dedupe key.
* `created_at TIMESTAMPTZ DEFAULT now()` — **server receive time**; used as the storage
  authority and for end-to-end delay measurement.
* RLS: **public SELECT + INSERT only** — no UPDATE/DELETE. Reading telemetry needs no
  credentials.
* Realtime enabled (`ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetry`).
* The ingest function upserts with `onConflict: 'message_id', ignoreDuplicates: true`, so a
  **duplicate returns HTTP 201 and inserts nothing**. You cannot detect duplicates from the
  HTTP status — derive them server-side.
* Column mapping includes `satellite_count: payload.location?.satelliteCount ?? 0`, and the
  full posted JSON is retained in `raw_payload`, so extra `location` fields are safe to add.

### Reading telemetry without credentials

```bash
curl -s "https://hfzqfcuezuxcgaifxqok.supabase.co/rest/v1/telemetry?\
select=created_at,driver_state,wifi_rssi,satellite_count,latitude\
&device_id=eq.BUS-101&order=created_at.desc&limit=10" \
  -H "apikey: sb_publishable_0DseTT82noxmCUmx74miOg_yGFH71TF"
```

## Live vs simulated data (provenance)

The dashboard ships with an in-browser **simulation engine** (a mock fleet) that is useful
for demos but must never be mistaken for the real Pi. The rules that enforce that:

* **`BusVehicle.source`** is `'LIVE'` for a vehicle that arrived from Supabase and `'SIM'`
  for a mock one. The UI renders a **LIVE / SIM / STALE** badge in the fleet roster, the
  vehicle drawer, the map popup and the fleet KPI bar (`FLEET TOTAL` shows `N live · M sim`).
* **Real telemetry always wins.** A device that reports an id already used by the mock
  fleet takes the vehicle over *wholesale* (the mock row is dropped, so no fabricated
  biometric can survive the merge), and `tick()` skips every `LIVE` vehicle. Operator
  "simulate incident" buttons and remote actuator controls are disabled for live devices.
* **A live device with no face in frame** publishes `null` biometrics; the UI shows `--`
  (`biometrics.isFacePresent === false`) instead of a fabricated EAR/PERCLOS/MAR.
* **The mock fleet is gated behind the `SIM ON/OFF` toggle** in the header. Switching it off
  removes only simulated vehicles — real devices stay on the map.
* The header reports **real devices live**, **realtime inserts** (`+N rt`) and **hydrated
  rows** separately, replacing the old, misleading `SUPABASE LIVE (N pkts)` (= fetch limit).

## Service worker / deploy-skew recovery

`public/sw.js` fixes the blank-app-on-reload bug seen when a browser held a cached shell
that referenced a deleted `assets/index-*.js`:

* **Navigations are network-first** — `fetch(request, { cache: 'reload' })`, falling back to
  the cached shell only when offline. A fresh deploy therefore always loads the current
  shell, which points at the current hashed bundle.
* **Same-origin hashed assets** use stale-while-revalidate (immutable filenames).
* **Supabase REST/Realtime, Edge Functions and cross-origin requests** are never
  intercepted, so live telemetry is never served from the cache.
* `CACHE_VERSION` is bumped on caching changes; stale `transitguard-*` caches are purged on
  `activate`.
* `index.html` runs a watchdog: if `window.__TG_MOUNTED__` (set in `src/main.tsx`) is still
  false ~6 s after load, it unregisters the worker, clears the caches and reloads **once**.

## Device auth

The Pi authenticates to the ingest function with `TRANSITGUARD_DEVICE_TOKEN`, which is
validated against a Supabase Edge Function secret. **This token is a secret** — it lives in
the Pi's `/etc/transitguard.env` and in Supabase secrets, never in either repo.

## Layout

| Path | Contents |
|---|---|
| `supabase/functions/ingest-telemetry/` | Edge Function (Deno) — auth, validation, upsert, column mapping |
| `src/services/supabaseService.ts` | Client-side Supabase access (REST + Realtime), payload mapping |
| `src/services/simulationEngine.ts` | In-browser demo fleet; `ingestLiveTelemetry` merges real payloads and tags them `LIVE` |
| `src/` | Vite/React dashboard |
| `public/sw.js` | Service worker — network-first navigations, same-origin asset cache |
| `index.html` | Shell + `__TG_MOUNTED__` self-heal watchdog |
| `rpi.env.example` | Template for the Pi's environment file (no real values) |

## Related

* `README.md` — features, quick start, bench-testing with simulated telemetry, API endpoints.
* `docs` equivalent of the measurement work lives in the Pi repo:
  `TransitGuard_Pi/docs/measurements/stability_report.md` — a three-run connection-stability
  study of the Pi → ingest → Postgres → dashboard path (612 scheduled, 99.66 % delivery vs
  attempted, plus a 49 % alert-message loss defect found and fixed).
  `TransitGuard_Pi/docs/measurements/connection_loss_report.md` — the companion
  **connection-loss & recovery** study: three 5-minute ingest outages, **3 / 3 recovered,
  0 messages dropped, 93 / 93 outage-scheduled messages stored** in `public.telemetry`.

## Never commit

* `TRANSITGUARD_DEVICE_TOKEN` (device auth), any Supabase **service role** key
* Real `.env` / `rpi.env` values — use `rpi.env.example`
