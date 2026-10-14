import { describe, expect, it } from "vitest";
import { donationSchema, flattenErrors, loginSchema, passwordSchema, registerSchema, serviceSchema, usernameSchema } from "@/lib/validation";

describe("validation", () => {
  it("mot de passe : 8+ caractères, lettre et chiffre", () => {
    expect(passwordSchema.safeParse("abcdefgh").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
    expect(passwordSchema.safeParse("abc12345").success).toBe(true);
    expect(passwordSchema.safeParse("short1").success).toBe(false);
  });

  it("nom d'utilisateur : caractères autorisés", () => {
    expect(usernameSchema.safeParse("bupo_fan.42").success).toBe(true);
    expect(usernameSchema.safeParse("bu").success).toBe(false);
    expect(usernameSchema.safeParse("hello world").success).toBe(false);
  });

  it("inscription : confirmation du mot de passe", () => {
    const base = { email: "A@B.com", username: "tester", password: "abc12345" };
    expect(registerSchema.safeParse({ ...base, confirm: "abc12345" }).success).toBe(true);
    const r = registerSchema.safeParse({ ...base, confirm: "nope" });
    expect(r.success).toBe(false);
    if (!r.success) expect(flattenErrors(r.error)).toHaveProperty("confirm");
  });

  it("email normalisé en minuscules", () => {
    const r = registerSchema.safeParse({ email: "  USER@Example.COM ", username: "tester", password: "abc12345", confirm: "abc12345" });
    expect(r.success && r.data.email).toBe("user@example.com");
  });

  it("login : champs requis", () => {
    expect(loginSchema.safeParse({ identifier: "", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ identifier: "x", password: "y" }).success).toBe(true);
  });

  it("service : slug et URL", () => {
    const valid = { slug: "bupoflix", name: "Bupoflix", description: "Films", url: "https://x.y", status: "ONLINE", visibility: "PUBLIC" };
    expect(serviceSchema.safeParse(valid).success).toBe(true);
    expect(serviceSchema.safeParse({ ...valid, slug: "Bad Slug" }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...valid, url: "not-a-url" }).success).toBe(false);
  });

  it("don : minimum 1 €", () => {
    expect(donationSchema.safeParse({ amountCents: 50 }).success).toBe(false);
    expect(donationSchema.safeParse({ amountCents: 500 }).success).toBe(true);
  });
});
