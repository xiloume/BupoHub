import "server-only";

/**
 * Rate limiter à fenêtre glissante, en mémoire.
 * Interface volontairement minimale pour pouvoir brancher Redis plus tard.
 */
export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
  reset(key: string): Promise<void>;
}

class MemoryStore implements RateLimitStore {
  private buckets = new Map<string, number[]>();
  private lastSweep = Date.now();

  async hit(key: string, windowMs: number) {
    const now = Date.now();
    this.sweep(now, windowMs);
    const stamps = (this.buckets.get(key) ?? []).filter((t) => now - t < windowMs);
    stamps.push(now);
    this.buckets.set(key, stamps);
    return { count: stamps.length, resetAt: stamps[0] + windowMs };
  }

  async reset(key: string) {
    this.buckets.delete(key);
  }

  private sweep(now: number, windowMs: number) {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [k, stamps] of this.buckets) {
      if (stamps.every((t) => now - t >= windowMs)) this.buckets.delete(k);
    }
  }
}

const globalForRl = globalThis as unknown as { __rateLimitStore?: RateLimitStore };
const store: RateLimitStore = (globalForRl.__rateLimitStore ??= new MemoryStore());

export type RateLimitResult = { ok: boolean; remaining: number; resetAt: number };

export async function rateLimit(
  scope: string,
  identifier: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const { count, resetAt } = await store.hit(`${scope}:${identifier}`, windowMs);
  return { ok: count <= limit, remaining: Math.max(0, limit - count), resetAt };
}

export async function resetRateLimit(scope: string, identifier: string) {
  await store.reset(`${scope}:${identifier}`);
}

export const RATE_LIMITS = {
  login: { limit: 5, windowMs: 15 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  forgot: { limit: 3, windowMs: 15 * 60_000 },
  reset: { limit: 5, windowMs: 15 * 60_000 },
  api: { limit: 120, windowMs: 60_000 },
  bot: { limit: 300, windowMs: 60_000 },
} as const;
