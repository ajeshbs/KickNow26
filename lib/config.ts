import { getCf } from './cf';

const CONFIG_KEY = 'config:v1';

/** Owner-editable app config stored in KV. */
export interface AppConfig {
  /** Base URL of an external VPS stream proxy (empty = use built-in /api/proxy). */
  streamProxyUrl: string;
  streamProxyToken: string;
}

export const EMPTY_CONFIG: AppConfig = { streamProxyUrl: '', streamProxyToken: '' };

export async function getConfig(): Promise<AppConfig> {
  const { env } = getCf();
  const raw = await env.KICKNOW_KV.get(CONFIG_KEY, 'text');
  if (!raw) return { ...EMPTY_CONFIG };
  try {
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return {
      streamProxyUrl: typeof parsed.streamProxyUrl === 'string' ? parsed.streamProxyUrl : '',
      streamProxyToken: typeof parsed.streamProxyToken === 'string' ? parsed.streamProxyToken : '',
    };
  } catch {
    return { ...EMPTY_CONFIG };
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  const { env } = getCf();
  await env.KICKNOW_KV.put(CONFIG_KEY, JSON.stringify(config));
}
