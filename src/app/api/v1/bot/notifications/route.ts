import { z } from "zod";
import { ok, options, parseBody, withBotKey, ApiError } from "@/server/api";
import { db } from "@/server/db";
import { notifyAll, notifyUser } from "@/server/notifications";
import { audit } from "@/server/audit";

export const OPTIONS = options;

const schema = z.object({
  userId: z.string().optional(),
  discordUserId: z.string().regex(/^\d{15,22}$/).optional(),
  broadcast: z.boolean().default(false),
  type: z.enum(["INFO", "SUCCESS", "WARNING", "SERVICE", "SUBSCRIPTION", "ACCOUNT", "MAINTENANCE", "ADMIN"]).default("INFO"),
  title: z.string().min(2).max(120),
  body: z.string().max(2000).optional(),
  link: z.string().max(500).optional(),
});

/** POST /api/v1/bot/notifications — envoie une notification BupoHub depuis le bot. */
export const POST = withBotKey(async (req, key) => {
  const body = await parseBody(req, schema);
  const payload = { type: body.type, title: body.title, body: body.body, link: body.link };

  let userId = body.userId ?? null;
  if (!userId && body.discordUserId) {
    const link = await db.discordAccount.findUnique({ where: { discordUserId: body.discordUserId }, select: { userId: true } });
    if (!link) throw new ApiError(404, "NOT_LINKED", "Aucun compte lié à cet identifiant Discord.");
    userId = link.userId;
  }

  if (body.broadcast) {
    await notifyAll(payload);
  } else if (userId) {
    const exists = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!exists) throw new ApiError(404, "NOT_FOUND", "Utilisateur introuvable.");
    await notifyUser(userId, payload);
  } else {
    throw new ApiError(422, "VALIDATION_ERROR", "Indiquez userId, discordUserId ou broadcast=true.");
  }

  await audit({ action: "notification.send", actorType: "BOT", actorLabel: `bot:${key.name}`, targetType: body.broadcast ? "broadcast" : "user", targetId: userId, metadata: { title: body.title } });
  return ok(req, { sent: true }, { status: 201 });
}, "notifications:write");
