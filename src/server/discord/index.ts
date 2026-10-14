import "server-only";
import { db, type DiscordLinkSource } from "@/server/db";
import { env, features } from "@/lib/env";
import { audit } from "@/server/audit";
import { generateToken, hashToken } from "@/lib/tokens";
import { cookies } from "next/headers";

const OAUTH_STATE_COOKIE = "bupohub_discord_state";
const DISCORD_API = "https://discord.com/api/v10";

export type DiscordProfile = { id: string; username: string; global_name: string | null; avatar: string | null };

export function discordAvatarUrl(id: string, avatar: string | null) {
  return avatar
    ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(id) >> 22n) % 6}.png`;
}

/** Démarre le flux OAuth2 Discord : génère un state anti-CSRF et retourne l'URL d'autorisation. */
export async function beginOAuth() {
  if (!features.discordOAuth) throw new Error("La liaison Discord n'est pas configurée.");
  const state = generateToken(16);
  const store = await cookies();
  store.set(OAUTH_STATE_COOKIE, hashToken(state), {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID!,
    redirect_uri: `${env.APP_URL}/api/v1/discord/callback`,
    response_type: "code",
    scope: "identify",
    state,
    prompt: "consent",
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

export async function completeOAuth(code: string, state: string): Promise<DiscordProfile> {
  const store = await cookies();
  const expected = store.get(OAUTH_STATE_COOKIE)?.value;
  store.delete(OAUTH_STATE_COOKIE);
  if (!expected || expected !== hashToken(state)) throw new Error("État OAuth invalide.");

  const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID!,
      client_secret: env.DISCORD_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${env.APP_URL}/api/v1/discord/callback`,
    }),
  });
  if (!tokenRes.ok) throw new Error("Échec de l'échange du code Discord.");
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const meRes = await fetch(`${DISCORD_API}/users/@me`, { headers: { Authorization: `Bearer ${access_token}` } });
  if (!meRes.ok) throw new Error("Impossible de récupérer le profil Discord.");
  return (await meRes.json()) as DiscordProfile;
}

export async function linkDiscord(
  userId: string,
  profile: DiscordProfile,
  source: DiscordLinkSource,
  actor?: { id: string | null; label?: string; type?: "USER" | "BOT" },
) {
  const conflict = await db.discordAccount.findUnique({ where: { discordUserId: profile.id } });
  if (conflict && conflict.userId !== userId) throw new Error("Ce compte Discord est déjà lié à un autre utilisateur.");

  const account = await db.discordAccount.upsert({
    where: { userId },
    create: {
      userId,
      discordUserId: profile.id,
      username: profile.username,
      globalName: profile.global_name,
      avatar: profile.avatar,
      linkedBy: source,
    },
    update: {
      discordUserId: profile.id,
      username: profile.username,
      globalName: profile.global_name,
      avatar: profile.avatar,
      lastSyncAt: new Date(),
    },
  });
  await audit({
    action: "discord.link",
    actorId: actor?.id ?? userId,
    actorType: actor?.type ?? "USER",
    actorLabel: actor?.label,
    targetType: "user",
    targetId: userId,
    metadata: { discordUserId: profile.id, username: profile.username, source },
  });
  return account;
}

export async function unlinkDiscord(userId: string, actor: { id: string | null; label: string; type?: "USER" | "BOT" }) {
  await db.discordAccount.deleteMany({ where: { userId } });
  await audit({ action: "discord.unlink", actorId: actor.id, actorType: actor.type ?? "USER", actorLabel: actor.label, targetType: "user", targetId: userId });
}

/** Récupère un profil Discord via le bot (pour la liaison manuelle par un admin). */
export async function fetchDiscordUser(discordUserId: string): Promise<DiscordProfile | null> {
  if (!features.discordBot) return null;
  const res = await fetch(`${DISCORD_API}/users/${discordUserId}`, {
    headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as DiscordProfile;
}

export async function listDiscordAccounts() {
  return db.discordAccount.findMany({
    include: { user: { select: { id: true, username: true, email: true, status: true } } },
    orderBy: { linkedAt: "desc" },
    take: 200,
  });
}
