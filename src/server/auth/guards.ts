import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "@/server/auth/session";
import type { PermissionKey } from "@/lib/permissions";

export class AuthError extends Error {
  constructor(
    public readonly code: "UNAUTHENTICATED" | "FORBIDDEN",
    message?: string,
  ) {
    super(message ?? code);
  }
}

export function hasPermission(user: SessionUser | null, key: PermissionKey) {
  return Boolean(user?.permissions.has(key));
}

export function isAdmin(user: SessionUser | null) {
  return user?.role.slug === "admin";
}

/** Pour les Server Actions / Route Handlers : lève une erreur. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED", "Authentification requise.");
  return user;
}

export async function requirePermission(...keys: PermissionKey[]): Promise<SessionUser> {
  const user = await requireUser();
  for (const key of keys) {
    if (!user.permissions.has(key)) {
      throw new AuthError("FORBIDDEN", "Vous n'avez pas la permission d'effectuer cette action.");
    }
  }
  return user;
}

/** Pour les pages / layouts : redirige. */
export async function requireUserPage(next?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

export async function requirePermissionPage(...keys: PermissionKey[]): Promise<SessionUser> {
  const user = await requireUserPage();
  for (const key of keys) {
    if (!user.permissions.has(key)) redirect("/dashboard?error=forbidden");
  }
  return user;
}
