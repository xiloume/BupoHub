import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, needsRehash } from "@/server/auth/password";

describe("password (argon2id)", () => {
  it("hash et vérifie", async () => {
    const hash = await hashPassword("Secret123!");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, "Secret123!")).toBe(true);
    expect(await verifyPassword(hash, "wrong")).toBe(false);
  });

  it("ne lève pas sur un hash corrompu", async () => {
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
  });

  it("détecte un hash à paramètres obsolètes", async () => {
    const hash = await hashPassword("Secret123!");
    expect(needsRehash(hash)).toBe(false);
  });
});
