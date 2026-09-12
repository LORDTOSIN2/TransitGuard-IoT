// TransitGuard IoT - Supabase Edge Function: Ingest Telemetry
// Production Endpoint: https://hfzqfcuezuxcgaifxqok.supabase.co/functions/v1/ingest-telemetry
//
// Deploy with Supabase CLI:
//   supabase functions deploy ingest-telemetry --no-verify-jwt --project-ref hfzqfcuezuxcgaifxqok
//
// Secrets required:
//   supabase secrets set TRANSITGUARD_DEVICE_ID=BUS-101 TRANSITGUARD_DEVICE_TOKEN=tg-device-token-obu-default --project-ref hfzqfcuezuxcgaifxqok

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TelemetryPayload {
  deviceId?: string;
  messageId?: string;
  timestamp?: string | number;
  driverState?: string;
  location?: {
    lat?: number | null;
    lng?: number | null;
    speed?: number | null;
    heading?: number | null;
    satelliteCount?: number | null;
    hasFix?: boolean | null;
  };
  biometrics?: {
    ear?: number | null;
    mar?: number | null;
    perclos?: number | null;
    headPitch?: number | null;
    headYaw?: number | null;
    headRoll?: number | null;
    alcoholVoltage?: number | null;
    alcoholRawADC?: number | null;
    alcoholRiskScore?: number | null;
    driverState?: string | null;
  };
  hardware?: {
    cpuLoad?: number | null;
    cpuTemp?: number | null;
    powerWatts?: number | null;
    batteryVoltage?: number | null;
    buzzerActive?: boolean | null;
    lcdMessage?: string | null;
  };
  transport?: {
    mode?: string | null;
    wifiRssi?: number | null;
    wifiSsid?: string | null;
    loraHopCount?: number | null;
    loraRssi?: number | null;
    loraSnr?: number | null;
    relayedVia?: string | null;
    bufferedQueueCount?: number | null;
  };
}

serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed. Use POST." }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // 2. Read Edge Function secrets
    const expectedDeviceId = Deno.env.get("TRANSITGUARD_DEVICE_ID");
    const expectedDeviceToken = Deno.env.get("TRANSITGUARD_DEVICE_TOKEN");

    // 3. Extract device token from request headers (supports x-device-token or Bearer token)
    const authHeader = req.headers.get("authorization") || "";
    const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
    const providedDeviceToken = req.headers.get("x-device-token") || bearerToken;

    // Reject requests with an invalid device token
    if (expectedDeviceToken) {
      if (!providedDeviceToken || providedDeviceToken !== expectedDeviceToken) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Unauthorized device",
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Parse JSON request body
    let payload: TelemetryPayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid telemetry payload",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!payload || typeof payload !== "object") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid telemetry payload",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Validate device ID against secret if configured
    if (expectedDeviceId) {
      const allowedDevices = expectedDeviceId.split(",").map((d) => d.trim());
      if (!payload.deviceId || !allowedDevices.includes(payload.deviceId)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Unauthorized device",
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // 5. Validate required fields:
    //    - deviceId
    //    - messageId
    //    - timestamp
    //    - location
    //    - driverState (top-level or biometrics.driverState)
    const driverState = payload.driverState || payload.biometrics?.driverState;

    const hasValidDeviceId = typeof payload.deviceId === "string" && payload.deviceId.trim().length > 0;
    const hasValidMessageId = typeof payload.messageId === "string" && payload.messageId.trim().length > 0;
    const hasValidTimestamp =
      payload.timestamp !== undefined &&
      payload.timestamp !== null &&
      (typeof payload.timestamp === "number" || typeof payload.timestamp === "string");
    const hasValidLocation =
      payload.location !== undefined &&
      payload.location !== null &&
      typeof payload.location === "object";
    const hasValidDriverState = typeof driverState === "string" && driverState.trim().length > 0;

    if (!hasValidDeviceId || !hasValidMessageId || !hasValidTimestamp || !hasValidLocation || !hasValidDriverState) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid telemetry payload",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Format ISO Timestamp safely
    let isoTimestamp: string;
    try {
      if (typeof payload.timestamp === "number") {
        isoTimestamp = new Date(payload.timestamp).toISOString();
      } else {
        isoTimestamp = new Date(payload.timestamp as string).toISOString();
      }
    } catch {
      isoTimestamp = new Date().toISOString();
    }

    // 6. Connect to Supabase using standard server-side runtime variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[ingest-telemetry] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Internal server configuration error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 7. Flatten payload into public.telemetry table structure
    const dbRecord = {
      device_id: payload.deviceId,
      message_id: payload.messageId,
      timestamp: isoTimestamp,

      latitude: payload.location?.lat ?? null,
      longitude: payload.location?.lng ?? null,
      speed: payload.location?.speed ?? 0.0,
      heading: payload.location?.heading ?? 0.0,
      satellite_count: payload.location?.satelliteCount ?? 0,
      has_fix: payload.location?.hasFix ?? false,

      ear: payload.biometrics?.ear ?? null,
      mar: payload.biometrics?.mar ?? null,
      perclos: payload.biometrics?.perclos ?? null,
      head_pitch: payload.biometrics?.headPitch ?? null,
      head_yaw: payload.biometrics?.headYaw ?? null,
      head_roll: payload.biometrics?.headRoll ?? null,
      alcohol_voltage: payload.biometrics?.alcoholVoltage ?? null,
      alcohol_raw_adc: payload.biometrics?.alcoholRawADC ?? null,
      alcohol_risk_score: payload.biometrics?.alcoholRiskScore ?? null,
      driver_state: driverState,

      cpu_load: payload.hardware?.cpuLoad ?? null,
      cpu_temp: payload.hardware?.cpuTemp ?? null,
      power_watts: payload.hardware?.powerWatts ?? null,
      battery_voltage: payload.hardware?.batteryVoltage ?? null,
      buzzer_active: payload.hardware?.buzzerActive ?? false,
      lcd_message: payload.hardware?.lcdMessage ?? null,

      transport_mode: (payload.transport?.mode || "WIFI").toUpperCase(),
      wifi_rssi: payload.transport?.wifiRssi ?? null,
      wifi_ssid: payload.transport?.wifiSsid ?? null,
      lora_hop_count: payload.transport?.loraHopCount ?? 0,
      lora_rssi: payload.transport?.loraRssi ?? null,
      lora_snr: payload.transport?.loraSnr ?? null,
      relayed_via: payload.transport?.relayedVia ?? null,
      buffered_queue_count: payload.transport?.bufferedQueueCount ?? 0,

      raw_payload: payload,
    };

    // 8. Insert into public.telemetry with duplicate protection using message_id
    const { error: insertError } = await supabase
      .from("telemetry")
      .upsert(dbRecord, { onConflict: "message_id", ignoreDuplicates: true });

    if (insertError) {
      console.error("[ingest-telemetry] Database error:", insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Database insertion error: " + insertError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 9. Return HTTP 201 Created
    return new Response(
      JSON.stringify({
        success: true,
        message: "Telemetry accepted",
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("[ingest-telemetry] Unhandled exception:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Invalid telemetry payload",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
