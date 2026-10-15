import "server-only";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";
import { setJellyfinUserDisabled } from "@/server/integrations/jellyfin";
import { features } from "@/lib/env";

/**
 * Synchronise les comptes externes (Jellyfin…) avec l'accès effectif de
 * l'utilisateur : désactive quand l'accès est perdu (abonnement expiré,
 * révocation, suspension) et réactive quand il est retrouvé.
 * À appeler après tout changement d'abonnement, d'accès ou de statut.
 */
export async function syncServiceIntegrations(userId: string) {
  if (!features.jellyfin) return;
  const user = await db.user.findUnique({ where: { id: userId }, select: { username: true, status: true } });
  if (!user) return;

  const settings = await getSettings();
  const [services, grants, activeSub] = await Promise.all([
    db.service.findMany({
      where: { integration: { not: "NONE" } },
      select: { id: true, integration: true, requiresSubscription: true, visibility: true, planServices: { select: { planId: true } } },
    }),
    db.userService.findMany({
      where: { userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { serviceId: true },
    }),
    settings["subscriptions.enabled"]
      ? db.subscription.findFirst({ where: { userId, status: "ACTIVE" }, select: { id: true, planId: true } })
      : Promise.resolve(null),
  ]);
  const granted = new Set(grants.map((g) => g.serviceId));
  const suspended = user.status !== "ACTIVE";

  const accessFor = (s: (typeof services)[number]) =>
    !suspended &&
    (s.requiresSubscription && settings["subscriptions.enabled"]
      ? (Boolean(activeSub) && (s.planServices.length === 0 || s.planServices.some((ps) => ps.planId === activeSub!.planId))) || granted.has(s.id)
      : s.visibility === "PUBLIC" || granted.has(s.id));

  // Une seule instance Jellyfin configurée : activé si un service Jellyfin est accessible.
  const jellyfinAccess = services.filter((s) => s.integration === "JELLYFIN").some(accessFor);
  try {
    await setJellyfinUserDisabled(user.username, !jellyfinAccess);
  } catch {
    // non bloquant : Jellyfin peut être hors ligne, l'accès sera resynchronisé au prochain événement
  }
}
