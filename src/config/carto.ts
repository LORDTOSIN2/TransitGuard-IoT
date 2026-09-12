/**
 * CARTO API & Basemaps Persistent Configuration
 * 
 * Manages CARTO Basemap API keys and CARTO Data Warehouse (DW) SQL Access Tokens.
 * Keys are persisted with support for:
 * 1. Environment variables (VITE_CARTO_BASEMAP_API_KEY, VITE_CARTO_ACCESS_TOKEN)
 * 2. LocalStorage persistence (user overrides)
 * 3. Verified project defaults
 */

export interface CartoConfig {
  basemapApiKey: string;
  accessToken: string;
  sqlApiEndpoint: string;
  defaultWorkflowProcedure: string;
}

const STORAGE_KEYS = {
  BASEMAP_API_KEY: 'transitguard_carto_basemap_api_key',
  ACCESS_TOKEN: 'transitguard_carto_access_token',
};

// Verified persistent credentials provided for this project
const DEFAULT_CONFIG: CartoConfig = {
  basemapApiKey: 'cb1_2la0_1_c0b36153d57f6b0220779dfd',
  accessToken: 'eyJhbGciOiJIUzI1NiJ9.eyJhIjoiYWNfczViNTRrdjgiLCJqdGkiOiJjODU3NmRkNyJ9.tExZoIP49-7MlhOCvRgmLTkg5V75VNqm863UR9fSDPY',
  sqlApiEndpoint: 'https://gcp-us-east1.api.carto.com/v3/sql/carto_dw/job',
  defaultWorkflowProcedure: 'CALL `carto-dw-ac-s5b54kv8.workflows_temp_abcthingx_6f9f3c9e.wfproc_api_4e3edb4b59ed692d`()',
};

/**
 * Get active CARTO configuration with precedence:
 * LocalStorage > Environment Variables > Verified Defaults
 */
export function getCartoConfig(): CartoConfig {
  const localBasemapKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.BASEMAP_API_KEY) : null;
  const localAccessToken = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) : null;

  const envBasemapKey = (import.meta as any).env?.VITE_CARTO_BASEMAP_API_KEY;
  const envAccessToken = (import.meta as any).env?.VITE_CARTO_ACCESS_TOKEN;

  return {
    basemapApiKey: localBasemapKey || envBasemapKey || DEFAULT_CONFIG.basemapApiKey,
    accessToken: localAccessToken || envAccessToken || DEFAULT_CONFIG.accessToken,
    sqlApiEndpoint: DEFAULT_CONFIG.sqlApiEndpoint,
    defaultWorkflowProcedure: DEFAULT_CONFIG.defaultWorkflowProcedure,
  };
}

/**
 * Save custom keys to persistent LocalStorage
 */
export function saveCartoConfig(updates: Partial<Pick<CartoConfig, 'basemapApiKey' | 'accessToken'>>): void {
  if (typeof window === 'undefined') return;

  if (updates.basemapApiKey !== undefined) {
    if (updates.basemapApiKey) {
      localStorage.setItem(STORAGE_KEYS.BASEMAP_API_KEY, updates.basemapApiKey);
    } else {
      localStorage.removeItem(STORAGE_KEYS.BASEMAP_API_KEY);
    }
  }

  if (updates.accessToken !== undefined) {
    if (updates.accessToken) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, updates.accessToken);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    }
  }
}

/**
 * Get tile layer URL with authenticated CARTO API key
 */
export function getCartoTileUrl(isDarkMode: boolean, customKey?: string): string {
  const key = customKey || getCartoConfig().basemapApiKey;
  const style = isDarkMode ? 'dark_all' : 'light_all';
  return `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(key)}`;
}

/**
 * Execute CARTO DW Workflow SQL Job
 */
export async function executeCartoWorkflowJob(
  procedureQuery?: string,
  parameters: Record<string, any> = {}
): Promise<{ jobId?: string; status?: string; error?: string }> {
  const config = getCartoConfig();
  const query = procedureQuery || config.defaultWorkflowProcedure;

  try {
    const response = await fetch(config.sqlApiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        query,
        queryParameters: parameters,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `CARTO API error (${response.status}): ${errorText}` };
    }

    const data = await response.json();
    return {
      jobId: data.job_id || data.id,
      status: data.status || 'submitted',
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to communicate with CARTO SQL API' };
  }
}
