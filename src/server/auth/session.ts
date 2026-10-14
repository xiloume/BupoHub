import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "@/server/db";
import { env } from "@/lib/env";
import { generateToken, hmacToken } from "@/lib/tokens";

export const SESSION_COOKIE = "bupohub_session";
const TTL_MS = env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
const REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000;

function hashSessionToken(token: string) {
  return hmacToken(token, env.SESSION_SECRET);
}

export async function getRequestMeta() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const userAgent = h.get("user-agent")?.slice(0, 512) ?? null;
  return { ip, userAgent };
}

export async function createSession(userId: string) {
  const token = generateToken();
  const { ip, userAgent } = await getRequestMeta();
  const expiresAt = new Date(Date.now() + TTL_MS);
  await db.session.create({
    data: { userId, tokenHash: hashSessionToken(token), ip, userAgent, expiresAt },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.updateMany({
      where: { tokenHash: hashSessionToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  store.delete(SESSION_COOKIE);
}

export async function revokeAllSessions(userId: string, exceptCurrent = false) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  await db.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptCurrent && token ? { NOT: { tokenHash: hashSessionToken(token) } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

export async function getCurrentSessionId() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: { id: true },
  });
  return s?.id ?? null;
}

const userSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  status: true,
  locale: true,
  preferences: true,
  lastLoginAt: true,
  createdAt: true,
  role: {
    select: {
      id: true,
      slug: true,
      name: true,
      permissions: { select: { permission: { select: { key: true } } } },
    },
  },
} as const;

export type SessionUser = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  locale: string;
  preferences: unknown;
  lastLoginAt: Date | null;
  createdAt: Date;
  role: { id: string; slug: string; name: string };
  permissions: Set<string>;
};

/**
 * Récupère l'utilisateur courant à partir du cookie de session.
 * Mémoïsé par requête via React cache().
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: { select: userSelect } },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  if (session.user.status !== "ACTIVE") return null;

  if (Date.now() - session.lastActiveAt.getTime() > REFRESH_THRESHOLD_MS) {
    db.session
      .update({
        where: { id: session.id },
        data: { lastActiveAt: new Date(), expiresAt: new Date(Date.now() + TTL_MS) },
      })
      .catch(() => {});
  }

  const { role, ...user } = session.user;
  return {
    ...user,
    role: { id: role.id, slug: role.slug, name: role.name },
    permissions: new Set(role.permissions.map((p) => p.permission.key)),
  };
});
