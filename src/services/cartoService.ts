import { soundFx } from '../utils/audio';

export interface CartoConfig {
  apiUrl: string;
  token: string;
  defaultQuery: string;
  basemapsApiKey: string;
}

export interface CartoExecutionResult {
  success: boolean;
  jobId?: string;
  data?: any;
  error?: string;
  timestamp: number;
  durationMs?: number;
}

const STORAGE_KEY = 'transitguard_carto_config';

export const DEFAULT_CARTO_CONFIG: CartoConfig = {
  apiUrl: (import.meta as any).env?.VITE_CARTO_SQL_API_URL || 'https://gcp-us-east1.api.carto.com/v3/sql/carto_dw',
  token: (import.meta as any).env?.VITE_CARTO_AUTH_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJhIjoiYWNfczViNTRrdjgiLCJqdGkiOiJjODU3NmRkNyJ9.tExZoIP49-7MlhOCvRgmLTkg5V75VNqm863UR9fSDPY',
  defaultQuery: (import.meta as any).env?.VITE_CARTO_DEFAULT_QUERY || 'CALL `carto-dw-ac-s5b54kv8.workflows_temp_abcthingx_6f9f3c9e.wfproc_api_4e3edb4b59ed692d`()',
  basemapsApiKey: (import.meta as any).env?.VITE_CARTO_BASEMAPS_API_KEY || 'cb1_2la0_1_c0b36153d57f6b0220779dfd'
};

export interface TileStyle {
  id: string;
  name: string;
  description: string;
  url: string;
  subdomains?: string;
  maxZoom: number;
  attribution: string;
  previewColor: string;
}

export function getCartoTileStyles(apiKey: string = DEFAULT_CARTO_CONFIG.basemapsApiKey): TileStyle[] {
  const keyParam = apiKey ? `?key=${encodeURIComponent(apiKey)}` : '';

  return [
    {
      id: 'carto-voyager',
      name: 'CARTO Voyager (Street/Navigation)',
      description: 'Vibrant street map with clear arterial roads and POIs like Google Maps',
      url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${keyParam}`,
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; CARTO &copy; OpenStreetMap',
      previewColor: '#38bdf8'
    },
    {
      id: 'carto-dark',
      name: 'CARTO Dark Matter (Night HUD)',
      description: 'High-contrast dark cartography optimized for IoT telemetry',
      url: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${keyParam}`,
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: '&copy; CARTO &copy; OpenStreetMap',
      previewColor: '#6366f1'
    },
    {
      id: 'carto-positron',
      name: 'CARTO Positron (Clean Light)',
      description: 'Subtle light basemap with focused transit lines',
      url: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png${keyParam}`,
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: '&copy; CARTO &copy; OpenStreetMap',
      previewColor: '#94a3b8'
    },
    {
      id: 'osm-standard',
      name: 'OpenStreetMap Streets',
      description: 'Detailed worldwide open transit & street grid',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
      previewColor: '#22c55e'
    },
    {
      id: 'esri-satellite',
      name: 'ESRI High-Res Satellite',
      description: 'Realistic aerial satellite imagery of roads and terrain',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri',
      previewColor: '#eab308'
    }
  ];
}

export const CARTO_TILE_STYLES: TileStyle[] = getCartoTileStyles(DEFAULT_CARTO_CONFIG.basemapsApiKey);

class CartoService {
  private config: CartoConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): CartoConfig {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...DEFAULT_CARTO_CONFIG, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Error loading CARTO config from localStorage:', e);
    }
    return { ...DEFAULT_CARTO_CONFIG };
  }

  public getConfig(): CartoConfig {
    return { ...this.config };
  }

  public setConfig(updated: Partial<CartoConfig>) {
    this.config = { ...this.config, ...updated };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      }
    } catch (e) {
      console.warn('Error saving CARTO config to localStorage:', e);
    }
  }

  public resetToDefaults() {
    this.config = { ...DEFAULT_CARTO_CONFIG };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Error resetting CARTO config in localStorage:', e);
    }
  }

  public getTileStyles(): TileStyle[] {
    return getCartoTileStyles(this.config.basemapsApiKey);
  }

  /**
   * Execute the CARTO Workflows BigQuery procedure synchronously via SQL query endpoint
   */
  public async executeWorkflow(queryOverride?: string): Promise<CartoExecutionResult> {
    const query = queryOverride || this.config.defaultQuery;
    const startTime = Date.now();

    try {
      const url = `${this.config.apiUrl}/query?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.token}`
        }
      });

      const data = await res.json();
      const durationMs = Date.now() - startTime;

      if (!res.ok || data.error) {
        return {
          success: false,
          error: data.error || `HTTP ${res.status}: ${res.statusText}`,
          data,
          timestamp: Date.now(),
          durationMs
        };
      }

      return {
        success: true,
        data,
        timestamp: Date.now(),
        durationMs
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error connecting to CARTO API',
        timestamp: Date.now(),
        durationMs: Date.now() - startTime
      };
    }
  }

  /**
   * Submit an asynchronous CARTO SQL Job via POST /job
   */
  public async submitJob(queryOverride?: string): Promise<CartoExecutionResult> {
    const query = queryOverride || this.config.defaultQuery;
    const startTime = Date.now();

    try {
      const url = `${this.config.apiUrl}/job`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.token}`
        },
        body: JSON.stringify({
          query,
          queryParameters: {}
        })
      });

      const data = await res.json();
      const durationMs = Date.now() - startTime;
      const jobId = data.jobId || data.externalId;

      if (!res.ok || data.error) {
        return {
          success: false,
          error: data.error || `HTTP ${res.status}: ${res.statusText}`,
          data,
          timestamp: Date.now(),
          durationMs
        };
      }

      return {
        success: true,
        jobId,
        data,
        timestamp: Date.now(),
        durationMs
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error submitting CARTO job',
        timestamp: Date.now(),
        durationMs: Date.now() - startTime
      };
    }
  }

  /**
   * Poll CARTO Job status
   */
  public async getJobStatus(jobId: string): Promise<any> {
    const url = `${this.config.apiUrl}/job/${jobId}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.config.token}`
      }
    });
    return await res.json();
  }
}

export const cartoService = new CartoService();
