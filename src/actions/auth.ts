"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { login, logout, register, requestPasswordReset, resetPassword, AuthFlowError } from "@/server/auth";
import { getCurrentUser } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { loginSchema, registerSchema, forgotSchema, resetSchema, flattenErrors } from "@/lib/validation";
import { LOCALE_COOKIE } from "@/i18n/request";
import type { ActionState } from "@/lib/utils";

function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Veuillez vérifier le formulaire.", fieldErrors: flattenErrors(parsed.error) };
  let next = "/dashboard";
  try {
    const user = await login(parsed.data.identifier, parsed.data.password);
    await audit({ action: "auth.login", actorId: user.id, actorLabel: user.username, targetType: "user", targetId: user.id });
    next = safeNext(parsed.data.next);
    const store = await cookies();
    store.set(LOCALE_COOKIE, user.locale, { path: "/", maxAge: 365 * 86400, sameSite: "lax" });
  } catch (e) {
    if (e instanceof AuthFlowError) return { error: e.message };
    console.error(e);
    return { error: "Connexion impossible pour le moment." };
  }
  redirect(next);
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) await audit({ action: "auth.logout", actorId: user.id, actorLabel: user.username });
  await logout();
  redirect("/");
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Veuillez vérifier le formulaire.", fieldErrors: flattenErrors(parsed.error) };
  try {
    await register(parsed.data);
  } catch (e) {
    if (e instanceof AuthFlowError) return { error: e.message, fieldErrors: e.field ? { [e.field]: e.message } : undefined };
    console.error(e);
    return { error: "Inscription impossible pour le moment." };
  }
  redirect("/dashboard?welcome=1");
}

export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Adresse email invalide.", fieldErrors: flattenErrors(parsed.error) };
  try {
    await requestPasswordReset(parsed.data.email);
  } catch (e) {
    if (e instanceof AuthFlowError) return { error: e.message };
    console.error(e);
  }
  return { ok: true, message: "Si un compte existe pour cette adresse, un email vient d'être envoyé." };
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Veuillez vérifier le formulaire.", fieldErrors: flattenErrors(parsed.error) };
  try {
    await resetPassword(parsed.data.token, parsed.data.password);
  } catch (e) {
    if (e instanceof AuthFlowError) return { error: e.message };
    console.error(e);
    return { error: "Réinitialisation impossible." };
  }
  redirect("/connexion?reset=1");
}
