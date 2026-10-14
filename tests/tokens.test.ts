import { describe, expect, it } from "vitest";
import { generateApiKey, generateToken, hashToken, hmacToken, safeEqual } from "@/lib/tokens";

describe("tokens", () => {
  it("génère des tokens aléatoires URL-safe", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(43);
  });

  it("hash déterministe SHA-256 (hex 64)", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).toHaveLength(64);
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });

  it("HMAC dépend du secret", () => {
    expect(hmacToken("t", "s1")).not.toBe(hmacToken("t", "s2"));
  });

  it("safeEqual compare en temps constant sans lever", () => {
    expect(safeEqual("a", "a")).toBe(true);
    expect(safeEqual("a", "b")).toBe(false);
    expect(safeEqual("a", "ab")).toBe(false);
  });

  it("clé API : préfixe bh_ + secret", () => {
    const { key, prefix } = generateApiKey();
    expect(key.startsWith(`${prefix}.`)).toBe(true);
    expect(prefix).toMatch(/^bh_[0-9a-f]{8}$/);
  });
});
