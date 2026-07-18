interface CacheOptions {
  /** Seconds the value is considered fresh. */
  ttl: number;
  /** Additional seconds the value may be served stale while revalidating. */
  swr: number;
}

interface CacheMeta {
  fetchedAt: number;
}

/**
 * KV-backed stale-while-revalidate cache.
 * - Fresh hit: return cached.
 * - Stale hit (within swr window): return cached, refresh in background via ctx.waitUntil.
 * - Miss / expired: fetch inline; on fetch failure fall back to any cached copy.
 */
export async function cached<T>(
  kv: KVNamespace,
  key: string,
  fetcher: () => Promise<T>,
  { ttl, swr }: CacheOptions,
  ctx?: ExecutionContext,
): Promise<T> {
  const { value, metadata } = await kv.getWithMetadata<CacheMeta>(key, 'text');

  const refresh = async (): Promise<T> => {
    const data = await fetcher();
    await kv.put(key, JSON.stringify(data), {
      expirationTtl: Math.max(ttl + swr, 60),
      metadata: { fetchedAt: Date.now() },
    });
    return data;
  };

  if (value !== null && metadata) {
    const age = (Date.now() - metadata.fetchedAt) / 1000;
    if (age < ttl) {
      return JSON.parse(value) as T;
    }
    // Stale but usable: serve it, refresh in the background.
    if (ctx) {
      ctx.waitUntil(refresh().catch(() => {}));
      return JSON.parse(value) as T;
    }
    // No execution context available: refresh inline, fall back to stale on failure.
    try {
      return await refresh();
    } catch {
      return JSON.parse(value) as T;
    }
  }

  if (value !== null) {
    // Metadata missing (legacy write) — treat as stale.
    try {
      return await refresh();
    } catch {
      return JSON.parse(value) as T;
    }
  }

  return refresh();
}
