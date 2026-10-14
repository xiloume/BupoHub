import { ok, options, withBotKey } from "@/server/api";
import { db } from "@/server/db";

export const OPTIONS = options;

/** GET /api/v1/bot/services — liste des services (pour afficher les statuts sur Discord). */
export const GET = withBotKey(async (req) => {
  const services = await db.service.findMany({
    where: { status: { not: "HIDDEN" } },
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true, description: true, url: true, icon: true, status: true, visibility: true, requiresSubscription: true },
  });
  return ok(req, services);
}, "services:read");
