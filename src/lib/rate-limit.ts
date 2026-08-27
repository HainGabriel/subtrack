/**
 * Rate limiting con adaptador intercambiable.
 *
 * En desarrollo/single-instance usa un mapa en memoria (ventana fija).
 * En producción multi-instancia, reemplaza `store` por un adaptador
 * distribuido (p. ej. Upstash Redis) implementando la misma interfaz —
 * ver docs/SECURITY.md.
 */

interface RateLimitStore {
  hit(key: string, windowMs: number): { count: number; resetAt: number };
}

class InMemoryStore implements RateLimitStore {
  private buckets = new Map<string, { count: number; resetAt: number }>();

  hit(key: string, windowMs: number) {
    const now = Date.now();
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const bucket = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, bucket);
      return bucket;
    }
    existing.count += 1;
    return existing;
  }
}

const store: RateLimitStore = new InMemoryStore();

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Limita `limit` intentos por `windowMs` para una `key` dada
 * (normalmente `${acción}:${ip}` o `${acción}:${email}`).
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const bucket = store.hit(key, windowMs);
  return {
    success: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export const RATE_LIMITS = {
  login: { limit: 8, windowMs: 10 * 60 * 1000 },
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
  passwordResetRequest: { limit: 4, windowMs: 30 * 60 * 1000 },
  passwordResetSubmit: { limit: 8, windowMs: 30 * 60 * 1000 },
  csvImport: { limit: 10, windowMs: 60 * 60 * 1000 },
  cron: { limit: 20, windowMs: 60 * 1000 },
} as const;
