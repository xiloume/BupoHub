import { describe, expect, it } from "vitest";
import { rateLimit, resetRateLimit } from "@/server/rate-limit";

describe("rateLimit", () => {
  it("autorise jusqu'à la limite puis bloque", async () => {
    const opts = { limit: 3, windowMs: 60_000 };
    const id = `t-${Date.now()}`;
    expect((await rateLimit("test", id, opts)).ok).toBe(true);
    expect((await rateLimit("test", id, opts)).ok).toBe(true);
    const third = await rateLimit("test", id, opts);
    expect(third.ok).toBe(true);
    expect(third.remaining).toBe(0);
    expect((await rateLimit("test", id, opts)).ok).toBe(false);
  });

  it("isole les identifiants et les scopes", async () => {
    const opts = { limit: 1, windowMs: 60_000 };
    expect((await rateLimit("a", "x", opts)).ok).toBe(true);
    expect((await rateLimit("a", "y", opts)).ok).toBe(true);
    expect((await rateLimit("b", "x", opts)).ok).toBe(true);
    expect((await rateLimit("a", "x", opts)).ok).toBe(false);
  });

  it("reset vide le compteur", async () => {
    const opts = { limit: 1, windowMs: 60_000 };
    await rateLimit("r", "z", opts);
    expect((await rateLimit("r", "z", opts)).ok).toBe(false);
    await resetRateLimit("r", "z");
    expect((await rateLimit("r", "z", opts)).ok).toBe(true);
  });
});
