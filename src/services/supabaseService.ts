import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// Configuration from environment variables with defaults to the project URL and publishable key
const SUPABASE_URL = 
  (import.meta as any).env?.VITE_SUPABASE_URL || 
  'https://hfzqfcuezuxcgaifxqok.supabase.co';

const SUPABASE_ANON_KEY = 
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 
  'sb_publishable_0DseTT82noxmCUmx74miOg_yGFH71TF';

export interface SupabaseTelemetryRow {
  id: number;
  device_id: string;
  message_id: string;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  heading: number | null;
  satellite_count: number | null;
  has_fix: boolean | null;
  ear: number | null;
  mar: number | null;
  perclos: number | null;
  head_pitch: number | null;
  head_yaw: number | null;
  head_roll: number | null;
  alcohol_voltage: number | null;
  alcohol_raw_adc: number | null;
  alcohol_risk_score: number | null;
  driver_state: string | null;
  cpu_load: number | null;
  cpu_temp: number | null;
  power_watts: number | null;
  battery_voltage: number | null;
  buzzer_active: boolean | null;
  lcd_message: string | null;
  transport_mode: string | null;
  wifi_rssi: number | null;
  wifi_ssid: string | null;
  lora_hop_count: number | null;
  lora_rssi: number | null;
  lora_snr: number | null;
  relayed_via: string | null;
  buffered_queue_count: number | null;
  raw_payload: any;
  created_at: string;
}

/**
 * Maps a Supabase telemetry row into the canonical JSON structure used by the dashboard
 */
export function mapRowToTelemetryPayload(row: SupabaseTelemetryRow): any {
  // If raw_payload was stored and is valid, merge or use it
  if (row.raw_payload && row.raw_payload.deviceId) {
    return row.raw_payload;
  }

  const timestampMs = new Date(row.timestamp).getTime();

  return {
    deviceId: row.device_id,
    messageId: row.message_id,
    timestamp: timestampMs,
    location: {
      lat: row.latitude,
      lng: row.longitude,
      speed: row.speed ?? 0,
      heading: row.heading ?? 0,
      satelliteCount: row.satellite_count ?? 0,
      hasFix: row.has_fix ?? false,
    },
    biometrics: {
      ear: row.ear ?? 0.32,
      mar: row.mar ?? 0.30,
      perclos: row.perclos ?? 4.0,
      headPitch: row.head_pitch ?? 0.0,
      headYaw: row.head_yaw ?? 0.0,
      headRoll: row.head_roll ?? 0.0,
      alcoholVoltage: row.alcohol_voltage ?? 0.38,
      alcoholRawADC: row.alcohol_raw_adc ?? 118,
      alcoholRiskScore: row.alcohol_risk_score ?? 0.04,
      driverState: row.driver_state || 'NORMAL',
    },
    hardware: {
      cpuLoad: row.cpu_load ?? 25,
      cpuTemp: row.cpu_temp ?? 49.0,
      powerWatts: row.power_watts ?? 5.1,
      batteryVoltage: row.battery_voltage ?? 12.4,
      buzzerActive: row.buzzer_active ?? false,
      lcdMessage: row.lcd_message ?? 'SYS: SUPABASE LIVE',
    },
    transport: {
      mode: row.transport_mode || 'WIFI',
      wifiRssi: row.wifi_rssi ?? -65,
      wifiSsid: row.wifi_ssid ?? 'TransitGuard_WiFi',
      loraHopCount: row.lora_hop_count ?? 0,
      loraRssi: row.lora_rssi ?? null,
      loraSnr: row.lora_snr ?? null,
      relayedVia: row.relayed_via ?? null,
      bufferedQueueCount: row.buffered_queue_count ?? 0,
    },
  };
}

class SupabaseService {
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private isConnected = false;

  constructor() {
    this.initClient();
  }

  private initClient() {
    try {
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          realtime: {
            params: {
              eventsPerSecond: 10,
            },
          },
        });
        this.isConnected = true;
      }
    } catch (err) {
      console.error('[SupabaseService] Failed to initialize Supabase client:', err);
      this.client = null;
      this.isConnected = false;
    }
  }

  public getClient(): SupabaseClient | null {
    return this.client;
  }

  public getStatus(): { isConfigured: boolean; url: string } {
    return {
      isConfigured: !!this.client,
      url: SUPABASE_URL,
    };
  }

  /**
   * Fetch recent telemetry records to populate fleet history and latest states on initial page load
   */
  public async fetchRecentTelemetry(limit = 60): Promise<any[]> {
    if (!this.client) return [];

    try {
      const { data, error } = await this.client
        .from('telemetry')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('[SupabaseService] Error querying recent telemetry:', error.message);
        return [];
      }

      if (!data || data.length === 0) return [];

      // Reverse so oldest first when playing back history, or map direct
      return data.reverse().map(mapRowToTelemetryPayload);
    } catch (err: any) {
      console.error('[SupabaseService] Exception fetching telemetry:', err.message);
      return [];
    }
  }

  /**
   * Subscribe to live incoming telemetry inserts using Supabase Realtime
   */
  public subscribeToRealtime(
    onTelemetry: (payload: any) => void,
    onStatusChange?: (status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING') => void
  ): () => void {
    if (!this.client) {
      if (onStatusChange) onStatusChange('DISCONNECTED');
      return () => {};
    }

    if (onStatusChange) onStatusChange('CONNECTING');

    // Clean up existing channel if any
    if (this.channel) {
      this.client.removeChannel(this.channel);
    }

    this.channel = this.client
      .channel('public:telemetry:realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'telemetry',
        },
        (payload) => {
          if (payload.new) {
            const transformed = mapRowToTelemetryPayload(payload.new as SupabaseTelemetryRow);
            onTelemetry(transformed);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (onStatusChange) onStatusChange('CONNECTED');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          if (onStatusChange) onStatusChange('DISCONNECTED');
        }
      });

    return () => {
      if (this.channel && this.client) {
        this.client.removeChannel(this.channel);
        this.channel = null;
      }
    };
  }
}

export const supabaseService = new SupabaseService();
