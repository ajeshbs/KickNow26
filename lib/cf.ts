import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface CfEnv {
  KICKNOW_KV: KVNamespace;
  FOOTBALL_DATA_TOKEN?: string;
  TOTP_SECRET?: string;
  AUTH_SECRET?: string;
  MAINTENANCE_MODE?: string;
}

export function getCf(): { env: CfEnv; ctx: ExecutionContext } {
  const { env, ctx } = getCloudflareContext();
  return { env: env as unknown as CfEnv, ctx };
}
