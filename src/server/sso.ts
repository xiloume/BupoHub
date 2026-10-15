import "server-only";
import { randomBytes, timingSafeEqual } from "crypto";
import { db } from "@/server/db";
import { decryptSecret } from "@/server/crypto";
import { userCanAccessService } from "@/server/services";

const CODE_TTL_MS = 60_000;

type SsoCode = { serviceId: string; userId: string; expiresAt: number };
const codes = new Map<string, SsoCode>();

export type SsoClient = { id: string; name: string; ssoRedirectUri: string | null; ssoSecretEnc: string | null };

/** Retrouve le service configuré comme client SSO. */
export async function findSsoClient(clientId: string): Promise<SsoClient | null> {
  if (!clientId || clientId.length > 128) return null;
  return db.service.findFirst({
    where: { ssoClientId: clientId, integration: "BUPO_SSO" },
    select: { id: true, name: true, ssoRedirectUri: true, ssoSecretEnc: true },
  });
}

/** Crée un code d'autorisation à usage unique (60 s, en mémoire — une seule instance PM2). */
export function createSsoCode(serviceId: string, userId: string) {
  const code = randomBytes(24).toString("base64url");
  codes.set(code, { serviceId, userId, expiresAt: Date.now() + CODE_TTL_MS });
  // purge opportuniste des codes expirés
  const now = Date.now();
  for (const [k, v] of codes) if (v.expiresAt < now) codes.delete(k);
  return code;
}

function safeEq(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Échange un code contre le profil utilisateur. Vérifie client_id + client_secret,
 * consomme le code, et retourne aussi l'état d'accès au service.
 */
export async function exchangeSsoCode(clientId: string, clientSecret: string, code: string) {
  const service = await findSsoClient(clientId);
  if (!service?.ssoSecretEnc) return null;
  const expected = decryptSecret(service.ssoSecretEnc);
  if (!expected || !safeEq(expected, clientSecret)) return null;

  const entry = codes.get(code);
  codes.delete(code);
  if (!entry || entry.serviceId !== service.id || entry.expiresAt < Date.now()) return null;

  const user = await db.user.findUnique({
    where: { id: entry.userId },
    select: { id: true, email: true, username: true, displayName: true, avatarUrl: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") return null;

  const access = await userCanAccessService(user.id, service.id);
  return { user, service, access };
}
