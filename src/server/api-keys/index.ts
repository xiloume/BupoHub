import "server-only";
import { db } from "@/server/db";
import { generateApiKey, hashToken } from "@/lib/tokens";
import { audit } from "@/server/audit";
import type { BotScope } from "@/lib/validation";
import type { SessionUser } from "@/server/auth/session";

export async function listApiKeys() {
  return db.apiKey.findMany({
    include: { createdBy: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createApiKey(actor: SessionUser, input: { name: string; scopes: string[] }) {
  const { key, prefix } = generateApiKey();
  const record = await db.apiKey.create({
    data: { name: input.name, keyPrefix: prefix, keyHash: hashToken(key), scopes: input.scopes, createdById: actor.id },
  });
  await audit({ action: "apikey.create", actorId: actor.id, actorLabel: actor.username, targetType: "apikey", targetId: record.id, targetLabel: record.name, metadata: { scopes: input.scopes } });
  return { record, key };
}

export async function revokeApiKey(actor: SessionUser, id: string) {
  const record = await db.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  await audit({ action: "apikey.revoke", actorId: actor.id, actorLabel: actor.username, targetType: "apikey", targetId: id, targetLabel: record.name });
}

export type ApiKeyContext = { id: string; name: string; scopes: Set<BotScope> };

/** Valide une clé API (header Authorization: Bearer <clé>). */
export async function authenticateApiKey(authorization: string | null): Promise<ApiKeyContext | null> {
  const key = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!key || !key.startsWith("bh_")) return null;
  const record = await db.apiKey.findUnique({ where: { keyHash: hashToken(key) } });
  if (!record || record.revokedAt || (record.expiresAt && record.expiresAt < new Date())) return null;
  db.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return { id: record.id, name: record.name, scopes: new Set((record.scopes as string[]) as BotScope[]) };
}
