import { ok, options, withBotKey } from "@/server/api";
import { runSubscriptionMaintenance } from "@/server/subscriptions";

export const OPTIONS = options;

/**
 * POST /api/v1/admin/maintenance — tâches périodiques (expiration des
 * abonnements, notifications d'échéance). À appeler par cron, ex. toutes les
 * heures :
 *   curl -X POST -H "Authorization: Bearer <clé_api>" https://bupohub.fr/api/v1/admin/maintenance
 */
export const POST = withBotKey(async (req) => {
  await runSubscriptionMaintenance();
  return ok(req, { ran: true, at: new Date().toISOString() });
}, "admin:maintenance");
