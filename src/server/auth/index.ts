import "server-only";
import { db } from "@/server/db";
import { hashPassword, verifyPassword, needsRehash } from "@/server/auth/password";
import { createSession, destroySession, getRequestMeta, revokeAllSessions } from "@/server/auth/session";
import { generateToken, hashToken } from "@/lib/tokens";
import { rateLimit, resetRateLimit, RATE_LIMITS } from "@/server/rate-limit";
import { audit } from "@/server/audit";
import { mailTemplates } from "@/server/mail/mailer";
import { notifyUser } from "@/server/notifications";
import { getSettings } from "@/server/settings";
import { env } from "@/lib/env";

export class AuthFlowError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
  }
}

const GENERIC_LOGIN_ERROR = "Identifiants incorrects.";

export async function login(identifier: string, password: string) {
  const { ip, userAgent } = await getRequestMeta();
  const id = identifier.trim().toLowerCase();
  const rl = await rateLimit("login", `${ip ?? "unknown"}:${id}`, RATE_LIMITS.login);
  if (!rl.ok) {
    throw new AuthFlowError(
      "Trop de tentatives. Réessayez dans quelques minutes.",
      undefined,
      Math.ceil((rl.resetAt - Date.now()) / 1000),
    );
  }

  const user = await db.user.findFirst({
    where: { OR: [{ email: id }, { username: identifier.trim() }], deletedAt: null },
  });

  const record = (success: boolean, reason?: string) =>
    db.loginHistory.create({
      data: { userId: user?.id ?? null, email: id, ip, userAgent, success, reason },
    });

  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    await record(false, "invalid_credentials");
    throw new AuthFlowError(GENERIC_LOGIN_ERROR);
  }
  if (user.status === "SUSPENDED") {
    await record(false, "suspended");
    throw new AuthFlowError("Ce compte est suspendu. Contactez un administrateur.");
  }
  if (user.status === "DELETED") {
    await record(false, "deleted");
    throw new AuthFlowError(GENERIC_LOGIN_ERROR);
  }

  if (needsRehash(user.passwordHash)) {
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  }

  await Promise.all([
    createSession(user.id),
    db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: ip } }),
    record(true),
    resetRateLimit("login", `${ip ?? "unknown"}:${id}`),
  ]);

  return user;
}

export async function logout() {
  await destroySession();
}

export async function validateInvitation(token: string) {
  const inv = await db.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { role: true, createdBy: { select: { username: true } } },
  });
  if (!inv || inv.usedAt || inv.revokedAt || inv.expiresAt < new Date()) return null;
  return inv;
}

export async function register(input: { email: string; username: string; password: string; invite?: string }) {
  const { ip } = await getRequestMeta();
  const rl = await rateLimit("register", ip ?? "unknown", RATE_LIMITS.register);
  if (!rl.ok) throw new AuthFlowError("Trop de tentatives. Réessayez plus tard.");

  const settings = await getSettings();
  const mode = settings["registration.mode"];
  if (mode === "CLOSED") throw new AuthFlowError("Les inscriptions sont fermées.");

  let invitation: Awaited<ReturnType<typeof validateInvitation>> = null;
  if (mode === "INVITE_ONLY" || input.invite) {
    if (!input.invite) throw new AuthFlowError("Une invitation est nécessaire pour créer un compte.", "invite");
    invitation = await validateInvitation(input.invite);
    if (!invitation) throw new AuthFlowError("Invitation invalide ou expirée.", "invite");
    if (invitation.email && invitation.email !== input.email) {
      throw new AuthFlowError("Cette invitation est réservée à une autre adresse email.", "email");
    }
  }

  const [emailTaken, usernameTaken] = await Promise.all([
    db.user.findUnique({ where: { email: input.email }, select: { id: true } }),
    db.user.findUnique({ where: { username: input.username }, select: { id: true } }),
  ]);
  if (emailTaken) throw new AuthFlowError("Cette adresse email est déjà utilisée.", "email");
  if (usernameTaken) throw new AuthFlowError("Ce nom d'utilisateur est déjà pris.", "username");

  const roleId = invitation?.roleId ?? (await db.role.findUniqueOrThrow({ where: { slug: "user" } })).id;

  const user = await db.user.create({
    data: {
      email: input.email,
      username: input.username,
      passwordHash: await hashPassword(input.password),
      roleId,
      lastLoginAt: new Date(),
      lastLoginIp: ip,
    },
  });

  if (invitation) {
    await db.invitation.update({
      where: { id: invitation.id },
      data: { usedAt: new Date(), usedById: user.id },
    });
  }

  await Promise.all([
    createSession(user.id),
    audit({ action: "auth.register", actorId: user.id, targetType: "user", targetId: user.id, targetLabel: user.username }),
    notifyUser(user.id, {
      type: "ACCOUNT",
      title: "Bienvenue sur BupoHub !",
      body: "Votre compte a été créé. Découvrez vos services depuis le dashboard.",
      link: "/dashboard",
    }),
    mailTemplates.welcome(user.email, user.username).catch(() => {}),
  ]);

  return user;
}

export async function requestPasswordReset(email: string) {
  const { ip } = await getRequestMeta();
  const rl = await rateLimit("forgot", `${ip ?? "unknown"}:${email}`, RATE_LIMITS.forgot);
  if (!rl.ok) throw new AuthFlowError("Trop de demandes. Réessayez dans quelques minutes.");

  const user = await db.user.findUnique({ where: { email } });
  // Réponse identique que l'utilisateur existe ou non (anti-énumération).
  if (!user || user.status !== "ACTIVE") return;

  const link = await createPasswordResetLink(user.id);
  await mailTemplates.passwordReset(user.email, link);
}

export async function createPasswordResetLink(userId: string, ttlMs = 60 * 60 * 1000) {
  const token = generateToken();
  await db.passwordResetToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttlMs) },
  });
  return `${env.APP_URL}/reinitialiser/${token}`;
}

export async function resetPassword(token: string, password: string) {
  const { ip } = await getRequestMeta();
  const rl = await rateLimit("reset", ip ?? "unknown", RATE_LIMITS.reset);
  if (!rl.ok) throw new AuthFlowError("Trop de tentatives. Réessayez plus tard.");

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AuthFlowError("Ce lien est invalide ou a expiré.");
  }

  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null, NOT: { id: record.id } },
      data: { usedAt: new Date() },
    }),
  ]);
  await revokeAllSessions(record.userId);
  await audit({ action: "auth.password_reset", actorId: record.userId, targetType: "user", targetId: record.userId });
  await notifyUser(record.userId, {
    type: "ACCOUNT",
    title: "Mot de passe modifié",
    body: "Votre mot de passe a été réinitialisé. Toutes vos sessions ont été déconnectées.",
  });
}
