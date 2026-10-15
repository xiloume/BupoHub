"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { requirePermission, AuthError } from "@/server/auth/guards";
import {
  adminCreateUser,
  adminDeleteUser,
  adminResetPasswordLink,
  adminRevokeSessions,
  adminSetServiceAccess,
  adminSetUserStatus,
  adminUpdateUser,
} from "@/server/users";
import { createInvitation, revokeInvitation } from "@/server/invitations";
import { audit } from "@/server/audit";
import { notifyAll, notifyUser } from "@/server/notifications";
import { updateSettings, settingsSchema } from "@/server/settings";
import { adminGrantSubscription, adminSetPlanAccess, cancelSubscription } from "@/server/subscriptions";
import { createApiKey, revokeApiKey } from "@/server/api-keys";
import { fetchDiscordUser, linkDiscord, unlinkDiscord } from "@/server/discord";
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
  apiKeySchema,
  flattenErrors,
  invitationSchema,
  notificationSendSchema,
  planSchema,
  serviceSchema,
} from "@/lib/validation";
import type { ActionState } from "@/lib/utils";

function handle<T = unknown>(e: unknown): ActionState<T> {
  if (e instanceof AuthError) return { error: e.message };
  if (e instanceof Error) return { error: e.message };
  return { error: "Une erreur est survenue." };
}

const bool = (v: FormDataEntryValue | null) => v === "on" || v === "true";

// ---------------------------------------------------------------- Utilisateurs

export async function createUserAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission("users.write");
    const parsed = adminCreateUserSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) return { error: "Formulaire invalide.", fieldErrors: flattenErrors(parsed.error) };
    const [e, u] = await Promise.all([
      db.user.findUnique({ where: { email: parsed.data.email } }),
      db.user.findUnique({ where: { username: parsed.data.username } }),
    ]);
    if (e) return { error: "Email déjà utilisé.", fieldErrors: { email: "Déjà utilisé" } };
    if (u) return { error: "Nom d'utilisateur déjà pris.", fieldErrors: { username: "Déjà pris" } };
    const user = await adminCreateUser(actor, parsed.data);
    revalidatePath("/admin/utilisateurs");
    return { ok: true, message: `Utilisateur ${user.username} créé.`, data: undefined };
  } catch (e) {
    return handle(e);
  }
}

export async function updateUserAction(id: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission("users.write");
    const parsed = adminUpdateUserSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) return { error: "Formulaire invalide.", fieldErrors: flattenErrors(parsed.error) };
    const current = await db.user.findUniqueOrThrow({ where: { id }, select: { roleId: true } });
    if (current.roleId !== parsed.data.roleId && !actor.permissions.has("users.roles")) {
      return { error: "Vous n'avez pas la permission de modifier les rôles." };
    }
    const [e, u] = await Promise.all([
      db.user.findFirst({ where: { email: parsed.data.email, NOT: { id } } }),
      db.user.findFirst({ where: { username: parsed.data.username, NOT: { id } } }),
    ]);
    if (e) return { error: "Email déjà utilisé.", fieldErrors: { email: "Déjà utilisé" } };
    if (u) return { error: "Nom d'utilisateur déjà pris.", fieldErrors: { username: "Déjà pris" } };
    await adminUpdateUser(actor, id, parsed.data);
    revalidatePath(`/admin/utilisateurs/${id}`);
    revalidatePath("/admin/utilisateurs");
    return { ok: true, message: "Utilisateur mis à jour." };
  } catch (e) {
    return handle(e);
  }
}

export async function setUserStatusAction(id: string, status: "ACTIVE" | "SUSPENDED"): Promise<ActionState> {
  try {
    const actor = await requirePermission("users.suspend");
    await adminSetUserStatus(actor, id, status);
    revalidatePath(`/admin/utilisateurs/${id}`);
    revalidatePath("/admin/utilisateurs");
    return { ok: true, message: status === "SUSPENDED" ? "Compte suspendu." : "Compte réactivé." };
  } catch (e) {
    return handle(e);
  }
}

export async function deleteUserAction(id: string): Promise<ActionState> {
  let ok = false;
  try {
    const actor = await requirePermission("users.delete");
    await adminDeleteUser(actor, id);
    revalidatePath("/admin/utilisateurs");
    ok = true;
  } catch (e) {
    return handle(e);
  }
  if (ok) redirect("/admin/utilisateurs?deleted=1");
  return { ok: true };
}

export async function resetPasswordLinkAction(id: string): Promise<ActionState<{ link: string }>> {
  try {
    const actor = await requirePermission("users.write");
    const link = await adminResetPasswordLink(actor, id);
    return { ok: true, message: "Lien généré (valable 24 h).", data: { link } };
  } catch (e) {
    return handle(e);
  }
}

export async function revokeUserSessionsAction(id: string): Promise<ActionState> {
  try {
    const actor = await requirePermission("users.write");
    await adminRevokeSessions(actor, id);
    revalidatePath(`/admin/utilisateurs/${id}`);
    return { ok: true, message: "Sessions révoquées." };
  } catch (e) {
    return handle(e);
  }
}

export async function setServiceAccessAction(userId: string, serviceId: string, grant: boolean): Promise<ActionState> {
  try {
    const actor = await requirePermission("services.access");
    await adminSetServiceAccess(actor, userId, serviceId, grant);
    revalidatePath(`/admin/utilisateurs/${userId}`);
    return { ok: true, message: grant ? "Accès accordé." : "Accès retiré." };
  } catch (e) {
    return handle(e);
  }
}

export async function grantSubscriptionAction(userId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission("subscriptions.manage");
    const planId = String(fd.get("planId") ?? "");
    const months = Number(fd.get("months") ?? 1);
    if (!planId || !Number.isInteger(months) || months < 1 || months > 36) return { error: "Paramètres invalides." };
    await adminGrantSubscription(actor, userId, planId, months);
    revalidatePath(`/admin/utilisateurs/${userId}`);
    return { ok: true, message: "Abonnement attribué." };
  } catch (e) {
    return handle(e);
  }
}

export async function setPlanAccessAction(userId: string, planId: string, grant: boolean): Promise<ActionState> {
  try {
    const actor = await requirePermission("subscriptions.manage");
    await adminSetPlanAccess(actor, userId, planId, grant);
    revalidatePath(`/admin/utilisateurs/${userId}`);
    return { ok: true, message: grant ? "Accès à l'offre accordé." : "Accès à l'offre retiré." };
  } catch (e) {
    return handle(e);
  }
}

export async function adminCancelSubscriptionAction(subscriptionId: string, userId: string): Promise<ActionState> {
  try {
    const actor = await requirePermission("subscriptions.manage");
    await cancelSubscription(actor, subscriptionId);
    revalidatePath(`/admin/utilisateurs/${userId}`);
    revalidatePath("/admin/abonnements");
    return { ok: true, message: "Abonnement annulé." };
  } catch (e) {
    return handle(e);
  }
}

export async function adminLinkDiscordAction(userId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission("discord.manage");
    const discordUserId = String(fd.get("discordUserId") ?? "").trim();
    if (!/^\d{15,22}$/.test(discordUserId)) return { error: "ID Discord invalide (15 à 22 chiffres)." };
    const profile = (await fetchDiscordUser(discordUserId)) ?? {
      id: discordUserId,
      username: String(fd.get("username") ?? "").trim() || `user_${discordUserId.slice(-6)}`,
      global_name: null,
      avatar: null,
    };
    await linkDiscord(userId, profile, "ADMIN", { id: actor.id, label: actor.username });
    revalidatePath(`/admin/utilisateurs/${userId}`);
    return { ok: true, message: "Compte Discord lié." };
  } catch (e) {
    return handle(e);
  }
}

export async function adminUnlinkDiscordAction(userId: string): Promise<ActionState> {
  try {
    const actor = await requirePermission("discord.manage");
    await unlinkDiscord(userId, { id: actor.id, label: actor.username });
    revalidatePath(`/admin/utilisateurs/${userId}`);
    revalidatePath("/admin/discord");
    return { ok: true, message: "Compte Discord délié." };
  } catch (e) {
    return handle(e);
  }
}

// ---------------------------------------------------------------- Invitations

export async function createInvitationAction(_p: ActionState<{ link: string }>, fd: FormData): Promise<ActionState<{ link: string }>> {
  try {
    const actor = await requirePermission("invitations.manage");
    const parsed = invitationSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) return { error: "Formulaire invalide.", fieldErrors: flattenErrors(parsed.error) };
    const { link } = await createInvitation(actor, { ...parsed.data, email: parsed.data.email || undefined });
    revalidatePath("/admin/invitations");
    return { ok: true, message: "Invitation créée.", data: { link } };
  } catch (e) {
    return handle(e);
  }
}

export async function revokeInvitationAction(id: string): Promise<ActionState> {
  try {
    const actor = await requirePermission("invitations.manage");
    await revokeInvitation(actor, id);
    revalidatePath("/admin/invitations");
    return { ok: true, message: "Invitation révoquée." };
  } catch (e) {
    return handle(e);
  }
}

// ---------------------------------------------------------------- Services

function parseService(fd: FormData) {
  return serviceSchema.safeParse({
    ...Object.fromEntries(fd),
    requiresSubscription: bool(fd.get("requiresSubscription")),
  });
}

export async function saveServiceAction(id: string | null, _p: ActionState, fd: FormData): Promise<ActionState> {
  let created: string | null = null;
  try {
    const actor = await requirePermission("services.manage");
    const parsed = parseService(fd);
    if (!parsed.success) return { error: "Formulaire invalide.", fieldErrors: flattenErrors(parsed.error) };
    const data = {
      ...parsed.data,
      icon: parsed.data.icon || null,
      imageUrl: parsed.data.imageUrl || null,
      ctaLabel: parsed.data.ctaLabel || null,
      healthcheckUrl: parsed.data.healthcheckUrl || null,
    };
    const slugTaken = await db.service.findFirst({ where: { slug: data.slug, ...(id ? { NOT: { id } } : {}) } });
    if (slugTaken) return { error: "Ce slug est déjà utilisé.", fieldErrors: { slug: "Déjà utilisé" } };

    if (id) {
      const before = await db.service.findUniqueOrThrow({ where: { id } });
      const service = await db.service.update({ where: { id }, data });
      await audit({ action: "service.update", actorId: actor.id, actorLabel: actor.username, targetType: "service", targetId: id, targetLabel: service.name, metadata: { status: [before.status, service.status], visibility: [before.visibility, service.visibility] } });
    } else {
      const service = await db.service.create({ data });
      await audit({ action: "service.create", actorId: actor.id, actorLabel: actor.username, targetType: "service", targetId: service.id, targetLabel: service.name });
      if (service.visibility === "PUBLIC" && service.status === "ONLINE") {
        await notifyAll({ type: "SERVICE", title: `Nouveau service : ${service.name}`, body: service.description.slice(0, 160), link: "/services" });
      }
      created = service.id;
    }
    revalidatePath("/admin/services");
    revalidatePath("/");
    revalidatePath("/services");
  } catch (e) {
    return handle(e);
  }
  if (created) redirect(`/admin/services/${created}?created=1`);
  return { ok: true, message: "Service enregistré." };
}

export async function deleteServiceAction(id: string): Promise<ActionState> {
  try {
    const actor = await requirePermission("services.manage");
    const service = await db.service.delete({ where: { id } });
    await audit({ action: "service.delete", actorId: actor.id, actorLabel: actor.username, targetType: "service", targetId: id, targetLabel: service.name });
    revalidatePath("/admin/services");
    revalidatePath("/");
  } catch (e) {
    return handle(e);
  }
  redirect("/admin/services?deleted=1");
}

export async function reorderServicesAction(ids: string[]): Promise<ActionState> {
  try {
    const actor = await requirePermission("services.manage");
    await db.$transaction(ids.map((id, i) => db.service.update({ where: { id }, data: { sortOrder: i } })));
    await audit({ action: "service.reorder", actorId: actor.id, actorLabel: actor.username, metadata: { order: ids } });
    revalidatePath("/admin/services");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return handle(e);
  }
}

// ---------------------------------------------------------------- Abonnements (plans)

export async function savePlanAction(id: string | null, _p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission("subscriptions.manage");
    const parsed = planSchema.safeParse({ ...Object.fromEntries(fd), isActive: bool(fd.get("isActive")) });
    if (!parsed.success) return { error: "Formulaire invalide.", fieldErrors: flattenErrors(parsed.error) };
    const data = { ...parsed.data, description: parsed.data.description || null, paypalPlanId: parsed.data.paypalPlanId || null, currency: parsed.data.currency.toUpperCase() };
    const plan = id ? await db.subscriptionPlan.update({ where: { id }, data }) : await db.subscriptionPlan.create({ data });
    await audit({ action: id ? "subscription.plan_update" : "subscription.plan_create", actorId: actor.id, actorLabel: actor.username, targetType: "plan", targetId: plan.id, targetLabel: plan.name });
    revalidatePath("/admin/abonnements");
    revalidatePath("/abonnement");
    return { ok: true, message: "Plan enregistré." };
  } catch (e) {
    return handle(e);
  }
}

export async function deletePlanAction(id: string): Promise<ActionState> {
  try {
    const actor = await requirePermission("subscriptions.manage");
    const count = await db.subscription.count({ where: { planId: id } });
    if (count) return { error: "Ce plan a des abonnements associés : désactivez-le plutôt." };
    const plan = await db.subscriptionPlan.delete({ where: { id } });
    await audit({ action: "subscription.plan_delete", actorId: actor.id, actorLabel: actor.username, targetType: "plan", targetId: id, targetLabel: plan.name });
    revalidatePath("/admin/abonnements");
    return { ok: true, message: "Plan supprimé." };
  } catch (e) {
    return handle(e);
  }
}

// ---------------------------------------------------------------- Notifications

export async function sendNotificationAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission("notifications.send");
    const parsed = notificationSendSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) return { error: "Formulaire invalide.", fieldErrors: flattenErrors(parsed.error) };
    const { target, userId, type, title, body, link } = parsed.data;
    const payload = { type, title, body: body || undefined, link: link || undefined };
    if (target === "user") {
      if (!userId) return { error: "Utilisateur requis.", fieldErrors: { userId: "Requis" } };
      const user = await db.user.findUnique({ where: { id: userId }, select: { username: true } });
      if (!user) return { error: "Utilisateur introuvable." };
      await notifyUser(userId, payload);
      await audit({ action: "notification.send", actorId: actor.id, actorLabel: actor.username, targetType: "user", targetId: userId, targetLabel: user.username, metadata: { title } });
    } else {
      await notifyAll(payload);
      await audit({ action: "notification.send", actorId: actor.id, actorLabel: actor.username, targetType: "broadcast", targetLabel: "Tous les utilisateurs", metadata: { title } });
    }
    revalidatePath("/admin/notifications");
    return { ok: true, message: "Notification envoyée." };
  } catch (e) {
    return handle(e);
  }
}

// ---------------------------------------------------------------- Clés API

export async function createApiKeyAction(_p: ActionState<{ key: string }>, fd: FormData): Promise<ActionState<{ key: string }>> {
  try {
    const actor = await requirePermission("discord.manage");
    const parsed = apiKeySchema.safeParse({ name: fd.get("name"), scopes: fd.getAll("scopes") });
    if (!parsed.success) return { error: "Formulaire invalide.", fieldErrors: flattenErrors(parsed.error) };
    const { key } = await createApiKey(actor, parsed.data);
    revalidatePath("/admin/discord");
    return { ok: true, message: "Clé créée. Copiez-la maintenant : elle ne sera plus affichée.", data: { key } };
  } catch (e) {
    return handle(e);
  }
}

export async function revokeApiKeyAction(id: string): Promise<ActionState> {
  try {
    const actor = await requirePermission("discord.manage");
    await revokeApiKey(actor, id);
    revalidatePath("/admin/discord");
    return { ok: true, message: "Clé révoquée." };
  } catch (e) {
    return handle(e);
  }
}

// ---------------------------------------------------------------- Paramètres

export async function updateSettingsAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission("settings.manage");
    const amounts = String(fd.get("donations.suggestedAmounts") ?? "")
      .split(",")
      .map((s) => Math.round(Number(s.trim()) * 100))
      .filter((n) => Number.isInteger(n) && n > 0);
    const parsed = settingsSchema.safeParse({
      "registration.mode": fd.get("registration.mode"),
      "subscriptions.enabled": bool(fd.get("subscriptions.enabled")),
      "donations.enabled": bool(fd.get("donations.enabled")),
      "site.tagline": fd.get("site.tagline") ?? "",
      "site.accent": fd.get("site.accent"),
      "maintenance.enabled": bool(fd.get("maintenance.enabled")),
      "maintenance.message": fd.get("maintenance.message") ?? "",
      "discord.inviteUrl": fd.get("discord.inviteUrl") ?? "",
      "donations.suggestedAmounts": amounts.length ? amounts : [300, 500, 1000, 2000],
    });
    if (!parsed.success) return { error: "Paramètres invalides.", fieldErrors: flattenErrors(parsed.error) };
    await updateSettings(parsed.data);
    await audit({ action: "settings.update", actorId: actor.id, actorLabel: actor.username, metadata: parsed.data });
    revalidatePath("/", "layout");
    return { ok: true, message: "Paramètres enregistrés." };
  } catch (e) {
    return handle(e);
  }
}
