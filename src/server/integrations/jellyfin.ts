import "server-only";
import crypto from "node:crypto";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import { decryptSecret, encryptSecret, generateServicePassword } from "@/server/crypto";

type JellyfinUser = {
  Id: string;
  Name: string;
  Policy?: Record<string, unknown> | null;
};

type JellyfinSession = {
  AccessToken: string;
  ServerId: string;
  User: { Id: string; Name: string };
};

const base = () => (env.JELLYFIN_URL ?? "").replace(/\/+$/, "");

async function adminFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: {
      "X-Emby-Token": env.JELLYFIN_API_KEY ?? "",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Jellyfin API ${path} → ${res.status}`);
  return res;
}

async function findUser(username: string): Promise<JellyfinUser | null> {
  const res = await adminFetch("/Users");
  const users = (await res.json()) as JellyfinUser[];
  return users.find((u) => u.Name.toLowerCase() === username.toLowerCase()) ?? null;
}

async function createUser(username: string): Promise<JellyfinUser> {
  const res = await adminFetch("/Users/New", { method: "POST", body: JSON.stringify({ Name: username }) });
  return (await res.json()) as JellyfinUser;
}

async function setPassword(userId: string, password: string) {
  await adminFetch(`/Users/${userId}/Password`, { method: "POST", body: JSON.stringify({ NewPw: password }) });
}

async function setDisabled(jfUser: JellyfinUser, disabled: boolean) {
  if ((jfUser.Policy?.IsDisabled === true) === disabled) return;
  await adminFetch(`/Users/${jfUser.Id}/Policy`, {
    method: "POST",
    body: JSON.stringify({ ...(jfUser.Policy ?? {}), IsDisabled: disabled }),
  });
}

async function authenticate(username: string, password: string, deviceId: string): Promise<JellyfinSession> {
  const res = await fetch(`${base()}/Users/AuthenticateByName`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Emby-Authorization": `MediaBrowser Client="BupoHub", Device="BupoHub", DeviceId="${deviceId}", Version="1.0.0"`,
    },
    body: JSON.stringify({ Username: username, Pw: password }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Jellyfin auth → ${res.status}`);
  return (await res.json()) as JellyfinSession;
}

type AccountIdentity = { username: string; externalId: string; password: string };

/**
 * Retourne les identifiants Jellyfin de l'utilisateur : le compte Jellyfin et
 * le mot de passe sont créés à la première demande, puis réutilisés pour les
 * connexions web automatiques ET les applications Jellyfin natives.
 */
export async function ensureJellyfinAccount(user: { id: string; username: string }, serviceId: string): Promise<AccountIdentity> {
  const existing = await db.serviceAccount.findUnique({ where: { userId_serviceId: { userId: user.id, serviceId } } });

  let jfUser = existing?.externalId ? await findUser(existing.username) : null;
  if (!jfUser) jfUser = (await findUser(existing?.username ?? user.username)) ?? (await createUser(user.username));

  const password = existing ? decryptSecret(existing.secret) : generateServicePassword();
  await setDisabled(jfUser, false);

  if (!existing) {
    await setPassword(jfUser.Id, password);
    await db.serviceAccount.create({
      data: { userId: user.id, serviceId, username: jfUser.Name, secret: encryptSecret(password), externalId: jfUser.Id },
    });
  } else if (existing.externalId !== jfUser.Id || existing.username !== jfUser.Name) {
    await setPassword(jfUser.Id, password);
    await db.serviceAccount.update({
      where: { userId_serviceId: { userId: user.id, serviceId } },
      data: { username: jfUser.Name, externalId: jfUser.Id },
    });
  }

  return { username: jfUser.Name, externalId: jfUser.Id, password };
}

/** Régénère le mot de passe Jellyfin de l'utilisateur. */
export async function rotateJellyfinPassword(user: { id: string }, serviceId: string): Promise<AccountIdentity> {
  const account = await db.serviceAccount.findUniqueOrThrow({ where: { userId_serviceId: { userId: user.id, serviceId } } });
  if (!account.externalId) throw new Error("Compte externe incomplet.");
  const password = generateServicePassword();
  await setPassword(account.externalId, password);
  await db.serviceAccount.update({
    where: { userId_serviceId: { userId: user.id, serviceId } },
    data: { secret: encryptSecret(password) },
  });
  return { username: account.username, externalId: account.externalId, password };
}

/** Lit les identifiants stockés sans appeler Jellyfin (pour l'affichage). */
export async function getStoredAccount(userId: string, serviceId: string): Promise<{ username: string; password: string } | null> {
  const account = await db.serviceAccount.findUnique({ where: { userId_serviceId: { userId, serviceId } } });
  return account ? { username: account.username, password: decryptSecret(account.secret) } : null;
}

/**
 * Ouvre une session Jellyfin avec les identifiants persistants et retourne
 * l'URL de la page pont qui connecte l'utilisateur dans jellyfin-web.
 */
export async function jellyfinConnectUrl(user: { id: string; username: string }, service: { id: string; name: string; url: string }) {
  const account = await ensureJellyfinAccount(user, service.id);
  const deviceId = `bupohub-${crypto.createHash("sha256").update(user.id).digest("hex").slice(0, 24)}`;
  let session: JellyfinSession;
  try {
    session = await authenticate(account.username, account.password, deviceId);
  } catch {
    // Le mot de passe stocké a peut-être été changé côté Jellyfin : on le ré-impose.
    await setPassword(account.externalId, account.password);
    session = await authenticate(account.username, account.password, deviceId);
  }

  const target = new URL("/web/bridge.html", service.url);
  target.hash = new URLSearchParams({
    at: session.AccessToken,
    u: session.User.Id,
    s: session.ServerId,
    n: service.name,
  }).toString();
  return target.toString();
}

/** Active ou désactive le compte Jellyfin d'un utilisateur BupoHub (s'il existe). */
export async function setJellyfinUserDisabled(username: string, disabled: boolean) {
  const jfUser = await findUser(username);
  if (!jfUser) return false;
  await setDisabled(jfUser, disabled);
  return true;
}
