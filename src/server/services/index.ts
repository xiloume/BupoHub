import "server-only";
import { db } from "@/server/db";
import type { Service } from "@/generated/prisma/client";
import { getSettings } from "@/server/settings";

export type ServiceWithAccess = Service & { hasAccess: boolean; accessReason: "public" | "granted" | "subscription" | "none" };

/** Services visibles sur la page d'accueil (publics, non masqués). */
export async function listPublicServices() {
  return db.service.findMany({
    where: { visibility: "PUBLIC", status: { not: "HIDDEN" } },
    orderBy: { sortOrder: "asc" },
  });
}

/** Services visibles par un utilisateur avec résolution d'accès côté serveur. */
export async function listServicesForUser(userId: string): Promise<ServiceWithAccess[]> {
  const settings = await getSettings();
  const [services, grants, activeSub] = await Promise.all([
    db.service.findMany({
      where: { status: { not: "HIDDEN" } },
      orderBy: { sortOrder: "asc" },
      include: { planServices: { select: { planId: true } } },
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

  return services
    .map((s): ServiceWithAccess => {
      const { planServices: _links, ...service } = s;
      if (s.requiresSubscription && settings["subscriptions.enabled"]) {
        // Service lié à des plans précis : seul un abonnement à l'un de ces plans débloque l'accès.
        // Sans liaison : n'importe quel abonnement actif suffit.
        const subOk = Boolean(activeSub) && (s.planServices.length === 0 || s.planServices.some((ps) => ps.planId === activeSub!.planId));
        if (subOk || granted.has(s.id)) return { ...service, hasAccess: true, accessReason: subOk ? "subscription" : "granted" };
        return { ...service, hasAccess: false, accessReason: "none" };
      }
      if (s.visibility === "PUBLIC") return { ...service, hasAccess: true, accessReason: "public" };
      if (granted.has(s.id)) return { ...service, hasAccess: true, accessReason: "granted" };
      return { ...service, hasAccess: false, accessReason: "none" };
    })
    .filter((s) => s.hasAccess || s.visibility === "PUBLIC");
}

export async function userCanAccessService(userId: string, serviceId: string) {
  const list = await listServicesForUser(userId);
  return list.find((s) => s.id === serviceId)?.hasAccess ?? false;
}
