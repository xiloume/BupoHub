"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { getCurrentSessionId, revokeAllSessions } from "@/server/auth/session";
import { beginOAuth, unlinkDiscord } from "@/server/discord";
import { notifyUser } from "@/server/notifications";
import { changePasswordSchema, flattenErrors, preferencesSchema, profileSchema } from "@/lib/validation";
import { LOCALE_COOKIE } from "@/i18n/request";
import type { ActionState } from "@/lib/utils";

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Veuillez vérifier le formulaire.", fieldErrors: flattenErrors(parsed.error) };
  const { email, username, displayName } = parsed.data;

  const [emailTaken, usernameTaken] = await Promise.all([
    db.user.findFirst({ where: { email, NOT: { id: user.id } }, select: { id: true } }),
    db.user.findFirst({ where: { username, NOT: { id: user.id } }, select: { id: true } }),
  ]);
  if (emailTaken) return { error: "Cette adresse email est déjà utilisée.", fieldErrors: { email: "Déjà utilisée" } };
  if (usernameTaken) return { error: "Ce nom d'utilisateur est déjà pris.", fieldErrors: { username: "Déjà pris" } };

  await db.user.update({
    where: { id: user.id },
    data: { email, username, displayName: displayName || null, emailVerifiedAt: email !== user.email ? null : undefined },
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Profil mis à jour." };
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

export async function updateAvatarAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Aucun fichier sélectionné." };
  if (file.size > MAX_AVATAR_BYTES) return { error: "L'image doit faire moins de 2 Mo." };
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return { error: "Format non supporté (PNG, JPG, WebP ou GIF)." };

  const dir = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(dir, { recursive: true });
  const filename = `${user.id}-${randomBytes(6).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  if (user.avatarUrl?.startsWith("/uploads/avatars/")) {
    unlink(path.join(process.cwd(), "public", user.avatarUrl)).catch(() => {});
  }
  await db.user.update({ where: { id: user.id }, data: { avatarUrl: `/uploads/avatars/${filename}` } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Avatar mis à jour." };
}

export async function removeAvatarAction(): Promise<ActionState> {
  const user = await requireUser();
  if (user.avatarUrl?.startsWith("/uploads/avatars/")) {
    unlink(path.join(process.cwd(), "public", user.avatarUrl)).catch(() => {});
  }
  await db.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Avatar supprimé." };
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Veuillez vérifier le formulaire.", fieldErrors: flattenErrors(parsed.error) };
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(record.passwordHash, parsed.data.current))) {
    return { error: "Mot de passe actuel incorrect.", fieldErrors: { current: "Incorrect" } };
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  await revokeAllSessions(user.id, true);
  await notifyUser(user.id, { type: "ACCOUNT", title: "Mot de passe modifié", body: "Vos autres sessions ont été déconnectées." });
  return { ok: true, message: "Mot de passe modifié. Vos autres sessions ont été déconnectées." };
}

export async function updatePreferencesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = preferencesSchema.safeParse({
    locale: formData.get("locale"),
    accent: formData.get("accent"),
    emailNotifications: formData.get("emailNotifications") === "on",
  });
  if (!parsed.success) return { error: "Préférences invalides." };
  await db.user.update({
    where: { id: user.id },
    data: { locale: parsed.data.locale, preferences: { accent: parsed.data.accent, emailNotifications: parsed.data.emailNotifications } },
  });
  const store = await cookies();
  store.set(LOCALE_COOKIE, parsed.data.locale, { path: "/", maxAge: 365 * 86400, sameSite: "lax" });
  revalidatePath("/", "layout");
  return { ok: true, message: "Préférences enregistrées." };
}

export async function revokeSessionAction(sessionId: string): Promise<ActionState> {
  const user = await requireUser();
  const current = await getCurrentSessionId();
  if (sessionId === current) return { error: "Impossible de révoquer la session courante. Déconnectez-vous." };
  await db.session.updateMany({ where: { id: sessionId, userId: user.id }, data: { revokedAt: new Date() } });
  revalidatePath("/profil");
  return { ok: true, message: "Session révoquée." };
}

export async function revokeOtherSessionsAction(): Promise<ActionState> {
  const user = await requireUser();
  await revokeAllSessions(user.id, true);
  revalidatePath("/profil");
  return { ok: true, message: "Toutes les autres sessions ont été déconnectées." };
}

export async function linkDiscordAction() {
  await requireUser();
  const url = await beginOAuth();
  redirect(url);
}

export async function unlinkDiscordAction(): Promise<ActionState> {
  const user = await requireUser();
  await unlinkDiscord(user.id, { id: user.id, label: user.username });
  revalidatePath("/profil");
  return { ok: true, message: "Compte Discord délié." };
}
