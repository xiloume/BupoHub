import "server-only";
import { db } from "@/server/db";
import { hasActiveSubscription, getUserSubscription, subscriptionsEnabled } from "@/server/subscriptions";
import { listServicesForUser } from "@/server/services";

const botUserSelect = {
  id: true,
  username: true,
  displayName: true,
  email: true,
  avatarUrl: true,
  status: true,
  createdAt: true,
  lastLoginAt: true,
  role: { select: { slug: true, name: true } },
  discordAccount: { select: { discordUserId: true, username: true, linkedAt: true } },
} as const;

/** Représentation d'un utilisateur exposée au bot (pas de données sensibles). */
export async function botUserPayload(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: botUserSelect });
  if (!user) return null;
  const [enabled, subscription, services] = await Promise.all([
    subscriptionsEnabled(),
    getUserSubscription(userId),
    listServicesForUser(userId),
  ]);
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    status: user.status,
    role: user.role.slug,
    roleName: user.role.name,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    discord: user.discordAccount,
    subscription: {
      enabled,
      active: enabled ? subscription?.status === "ACTIVE" : true,
      status: subscription?.status ?? null,
      plan: subscription?.plan.slug ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    },
    services: services.filter((s) => s.hasAccess).map((s) => ({ slug: s.slug, name: s.name, url: s.url, status: s.status })),
  };
}

export async function findUserByDiscordId(discordUserId: string) {
  const link = await db.discordAccount.findUnique({ where: { discordUserId }, select: { userId: true } });
  return link ? botUserPayload(link.userId) : null;
}

export { hasActiveSubscription };
