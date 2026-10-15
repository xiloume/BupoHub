import "server-only";
import crypto from "node:crypto";
import { env } from "@/lib/env";

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

/**
 * Garantit qu'un compte Jellyfin existe pour l'utilisateur BupoHub,
 * puis ouvre une session et retourne l'URL de la page pont à ouvrir.
 */
export async function jellyfinConnectUrl(user: { id: string; username: string }, service: { name: string; url: string }) {
  let jfUser = await findUser(user.username);
  if (!jfUser) jfUser = await createUser(user.username);

  const password = crypto.randomBytes(24).toString("base64url");
  await setPassword(jfUser.Id, password);

  const deviceId = `bupohub-${crypto.createHash("sha256").update(user.id).digest("hex").slice(0, 24)}`;
  const session = await authenticate(jfUser.Name, password, deviceId);

  const target = new URL("/bridge.html", service.url);
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
  await adminFetch(`/Users/${jfUser.Id}/Policy`, {
    method: "POST",
    body: JSON.stringify({ ...(jfUser.Policy ?? {}), IsDisabled: disabled }),
  });
  return true;
}
