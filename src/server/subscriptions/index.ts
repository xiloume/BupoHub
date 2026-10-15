import "server-only";
import { db, type SubscriptionStatus } from "@/server/db";
import { getSettings } from "@/server/settings";
import { getPaymentProvider } from "@/server/payments";
import { audit } from "@/server/audit";
import { notifyUser } from "@/server/notifications";
import { syncServiceIntegrations } from "@/server/integrations/access";
import { env } from "@/lib/env";
import type { SessionUser } from "@/server/auth/session";

export async function subscriptionsEnabled() {
  return (await getSettings())["subscriptions.enabled"];
}

export async function listActivePlans() {
  return db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
}

/** Plans visibles par l'utilisateur : publics + plans privés qui lui sont autorisés. */
export async function listAvailablePlans(userId: string) {
  const access = await db.planAccess.findMany({ where: { userId }, select: { planId: true } });
  return db.subscriptionPlan.findMany({
    where: { isActive: true, OR: [{ visibility: "PUBLIC" }, { id: { in: access.map((a) => a.planId) } }] },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listAllPlans() {
  return db.subscriptionPlan.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } } },
  });
}

export async function getUserSubscription(userId: string) {
  return db.subscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "PAST_DUE", "PENDING"] } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function hasActiveSubscription(userId: string) {
  if (!(await subscriptionsEnabled())) return true;
  const sub = await db.subscription.findFirst({ where: { userId, status: "ACTIVE" }, select: { id: true } });
  return Boolean(sub);
}

/** Démarre un abonnement : crée l'enregistrement PENDING puis redirige vers PayPal. */
export async function startSubscription(user: SessionUser, planId: string) {
  if (!(await subscriptionsEnabled())) throw new Error("Les abonnements sont désactivés.");
  const existing = await getUserSubscription(user.id);
  if (existing && existing.status === "ACTIVE") throw new Error("Vous avez déjà un abonnement actif.");

  const plan = await db.subscriptionPlan.findUniqueOrThrow({ where: { id: planId } });
  if (!plan.isActive) throw new Error("Ce plan n'est plus disponible.");
  if (plan.visibility === "PRIVATE" && !user.permissions.has("subscriptions.manage")) {
    const access = await db.planAccess.findUnique({ where: { userId_planId: { userId: user.id, planId } } });
    if (!access) throw new Error("Cette offre n'est pas disponible pour votre compte.");
  }
  if (!plan.paypalPlanId) throw new Error("Ce plan n'est pas encore configuré pour le paiement.");

  const provider = getPaymentProvider();
  const sub = await db.subscription.create({
    data: { userId: user.id, planId: plan.id, status: "PENDING", provider: "PAYPAL" },
  });
  const { subscriptionId, approveUrl } = await provider.createSubscription({
    providerPlanId: plan.paypalPlanId,
    reference: sub.id,
    returnUrl: `${env.APP_URL}/abonnement?status=approved&sub=${sub.id}`,
    cancelUrl: `${env.APP_URL}/abonnement?status=cancelled`,
  });
  await db.subscription.update({ where: { id: sub.id }, data: { providerSubscriptionId: subscriptionId } });
  await audit({ action: "subscription.create", actorId: user.id, actorLabel: user.username, targetType: "subscription", targetId: sub.id, metadata: { plan: plan.slug } });
  return approveUrl;
}

/** Synchronise l'état d'un abonnement depuis le fournisseur (retour d'approbation ou webhook). */
export async function syncSubscription(subscriptionId: string) {
  const sub = await db.subscription.findUnique({ where: { id: subscriptionId }, include: { plan: true } });
  if (!sub?.providerSubscriptionId) return null;
  const remote = await getPaymentProvider().getSubscription(sub.providerSubscriptionId);
  const map: Record<string, SubscriptionStatus> = {
    ACTIVE: "ACTIVE",
    APPROVAL_PENDING: "PENDING",
    SUSPENDED: "PAST_DUE",
    CANCELLED: "CANCELED",
    EXPIRED: "EXPIRED",
  };
  const status = map[remote.status] ?? sub.status;
  const updated = await db.subscription.update({
    where: { id: sub.id },
    data: {
      status,
      currentPeriodStart: status === "ACTIVE" && !sub.currentPeriodStart ? new Date() : undefined,
      currentPeriodEnd: remote.currentPeriodEnd,
    },
  });
  if (sub.status !== "ACTIVE" && status === "ACTIVE") {
    await notifyUser(sub.userId, {
      type: "SUBSCRIPTION",
      title: "Abonnement activé",
      body: `Votre abonnement ${sub.plan.name} est actif. Merci de soutenir Bupo !`,
      link: "/abonnement",
    });
  }
  if ((sub.status === "ACTIVE") !== (status === "ACTIVE")) {
    await syncServiceIntegrations(sub.userId);
  }
  return updated;
}

export async function syncSubscriptionByProviderId(providerSubscriptionId: string) {
  const sub = await db.subscription.findUnique({ where: { providerSubscriptionId }, select: { id: true } });
  return sub ? syncSubscription(sub.id) : null;
}

export async function cancelSubscription(user: SessionUser, subscriptionId: string) {
  const sub = await db.subscription.findUniqueOrThrow({ where: { id: subscriptionId } });
  if (sub.userId !== user.id && !user.permissions.has("subscriptions.manage")) {
    throw new Error("Action non autorisée.");
  }
  if (sub.provider === "PAYPAL" && sub.providerSubscriptionId) {
    await getPaymentProvider().cancelSubscription(sub.providerSubscriptionId);
  }
  await db.subscription.update({ where: { id: sub.id }, data: { status: "CANCELED", canceledAt: new Date() } });
  await audit({ action: "subscription.cancel", actorId: user.id, actorLabel: user.username, targetType: "subscription", targetId: sub.id });
  await syncServiceIntegrations(sub.userId);
}

/** Attribution manuelle par un admin (ex : offert, paiement hors ligne). */
export async function adminGrantSubscription(actor: SessionUser, userId: string, planId: string, months: number) {
  const end = new Date();
  end.setMonth(end.getMonth() + months);
  const sub = await db.subscription.create({
    data: { userId, planId, status: "ACTIVE", provider: "MANUAL", currentPeriodStart: new Date(), currentPeriodEnd: end },
  });
  await audit({ action: "subscription.create", actorId: actor.id, actorLabel: actor.username, targetType: "subscription", targetId: sub.id, metadata: { manual: true, months, userId } });
  await notifyUser(userId, { type: "SUBSCRIPTION", title: "Abonnement activé", body: `Un abonnement de ${months} mois vous a été attribué.`, link: "/abonnement" });
  await syncServiceIntegrations(userId);
  return sub;
}

/** Autorise (ou non) un utilisateur à souscrire un plan privé. */
export async function adminSetPlanAccess(actor: SessionUser, userId: string, planId: string, grant: boolean) {
  const plan = await db.subscriptionPlan.findUniqueOrThrow({ where: { id: planId } });
  if (grant) {
    await db.planAccess.upsert({
      where: { userId_planId: { userId, planId } },
      create: { userId, planId, grantedById: actor.id },
      update: { grantedById: actor.id },
    });
    await notifyUser(userId, {
      type: "SUBSCRIPTION",
      title: `Offre débloquée : ${plan.name}`,
      body: `Vous pouvez désormais souscrire l'offre ${plan.name} depuis votre espace abonnement.`,
      link: "/abonnement",
    });
  } else {
    await db.planAccess.deleteMany({ where: { userId, planId } });
  }
  await audit({
    action: grant ? "plan.access_grant" : "plan.access_revoke",
    actorId: actor.id,
    actorLabel: actor.username,
    targetType: "user",
    targetId: userId,
    metadata: { planId, plan: plan.name },
  });
}

export async function listSubscriptions(params: { status?: SubscriptionStatus | "ALL"; page?: number }) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = 25;
  const where = params.status && params.status !== "ALL" ? { status: params.status } : {};
  const [items, total] = await Promise.all([
    db.subscription.findMany({
      where,
      include: { plan: true, user: { select: { id: true, username: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.subscription.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Marque expirés les abonnements dont la période est passée et notifie ceux qui expirent bientôt. */
export async function runSubscriptionMaintenance() {
  const now = new Date();
  const soon = new Date(now.getTime() + 3 * 86400_000);
  const expired = await db.subscription.findMany({
    where: { status: "ACTIVE", provider: "MANUAL", currentPeriodEnd: { lt: now } },
    select: { id: true, userId: true },
  });
  if (expired.length) {
    await db.subscription.updateMany({ where: { id: { in: expired.map((e) => e.id) } }, data: { status: "EXPIRED" } });
    for (const e of expired) {
      await syncServiceIntegrations(e.userId);
      await notifyUser(e.userId, {
        type: "SUBSCRIPTION",
        title: "Abonnement expiré",
        body: "Votre abonnement a expiré : vos accès premium ont été désactivés.",
        link: "/abonnement",
      });
    }
  }
  const expiring = await db.subscription.findMany({
    where: { status: "ACTIVE", currentPeriodEnd: { gt: now, lt: soon } },
    select: { userId: true, plan: { select: { name: true } } },
  });
  for (const s of expiring) {
    await notifyUser(s.userId, {
      type: "SUBSCRIPTION",
      title: "Abonnement bientôt expiré",
      body: `Votre abonnement ${s.plan.name} expire dans moins de 3 jours.`,
      link: "/abonnement",
      expiresAt: soon,
    });
  }
}
