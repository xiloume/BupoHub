import { describe, expect, it } from "vitest";
import { PERMISSIONS, ROLE_PERMISSIONS, SYSTEM_ROLES } from "@/lib/permissions";
import { hasPermission, isAdmin } from "@/server/auth/guards";
import type { SessionUser } from "@/server/auth/session";

function user(role: string, perms: string[]): SessionUser {
  return {
    id: "u1", email: "a@b.c", username: "a", displayName: null, avatarUrl: null, status: "ACTIVE", locale: "fr", preferences: null,
    lastLoginAt: null, createdAt: new Date(), role: { id: "r", slug: role, name: role }, permissions: new Set(perms),
  };
}

describe("permissions", () => {
  it("le rôle admin possède toutes les permissions du catalogue", () => {
    expect(new Set(ROLE_PERMISSIONS.admin)).toEqual(new Set(Object.keys(PERMISSIONS)));
  });

  it("le rôle user n'a aucune permission d'administration", () => {
    expect(ROLE_PERMISSIONS.user).toHaveLength(0);
  });

  it("chaque permission de rôle existe dans le catalogue", () => {
    for (const perms of Object.values(ROLE_PERMISSIONS)) for (const p of perms) expect(PERMISSIONS).toHaveProperty(p);
  });

  it("les rôles système sont user / moderator / admin", () => {
    expect(SYSTEM_ROLES.map((r) => r.slug)).toEqual(["user", "moderator", "admin"]);
  });

  it("hasPermission / isAdmin", () => {
    expect(hasPermission(null, "admin.access")).toBe(false);
    expect(hasPermission(user("user", []), "admin.access")).toBe(false);
    expect(hasPermission(user("moderator", ["admin.access"]), "admin.access")).toBe(true);
    expect(isAdmin(user("admin", []))).toBe(true);
    expect(isAdmin(user("moderator", ["admin.access"]))).toBe(false);
  });
});
