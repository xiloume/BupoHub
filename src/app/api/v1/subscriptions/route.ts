import { ok, options, withSession } from "@/server/api";
import { getUserSubscription, listAvailablePlans, subscriptionsEnabled } from "@/server/subscriptions";

export const OPTIONS = options;

/** Abonnement de l'utilisateur courant + offres disponibles. */
export const GET = withSession(async (req, user) => {
  const enabled = await subscriptionsEnabled();
  if (!enabled) return ok(req, { enabled: false, subscription: null, plans: [] });
  const [subscription, plans] = await Promise.all([getUserSubscription(user.id), listAvailablePlans(user.id)]);
  return ok(req, {
    enabled: true,
    subscription: subscription ? { id: subscription.id, status: subscription.status, plan: subscription.plan.slug, currentPeriodEnd: subscription.currentPeriodEnd } : null,
    plans: plans.map(({ paypalPlanId: _p, ...p }) => p),
  });
});
