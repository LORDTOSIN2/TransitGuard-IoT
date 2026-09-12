-- TransitGuard IoT: Supabase PostgreSQL Schema & Security Policies
-- Table: telemetry

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

-- Performance Indexes for Real-time Dashboard & Historical Fleet Queries
CREATE INDEX IF NOT EXISTS idx_telemetry_device_timestamp 
    ON public.telemetry (device_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp 
    ON public.telemetry (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_driver_state 
    ON public.telemetry (driver_state);

CREATE INDEX IF NOT EXISTS idx_telemetry_message_id 
    ON public.telemetry (message_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.telemetry ENABLE ROW LEVEL SECURITY;

-- 1. Read Policy: Allow anonymous / authenticated users to read telemetry
-- (Required for the Vercel React frontend to view live map, charts, and alerts)
CREATE POLICY "Allow public read access to telemetry"
    ON public.telemetry
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 2. Write Policy: Allow anonymous / authenticated devices to insert telemetry
-- (Enables direct REST ingestion from the Raspberry Pi 4 using the publishable key)
-- Note: It strictly denies UPDATE and DELETE operations to protect data integrity.
CREATE POLICY "Allow device insertion of telemetry"
    ON public.telemetry
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        device_id IS NOT NULL AND
        message_id IS NOT NULL AND
        timestamp IS NOT NULL
    );

-- 3. Restrict UPDATE and DELETE: Devices and public users CANNOT modify or delete rows
-- (No policies created for UPDATE or DELETE, which default to DENY in Supabase RLS)

-- Enable Realtime for the telemetry table so the frontend receives live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetry;
