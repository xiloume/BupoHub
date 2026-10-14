import { z } from "zod";
import { ok, options, parseBody, withBotKey, ApiError } from "@/server/api";
import { db } from "@/server/db";
import { linkDiscord, unlinkDiscord } from "@/server/discord";

export const OPTIONS = options;

const schema = z.object({
  discordUserId: z.string().regex(/^\d{15,22}$/),
  username: z.string().min(1).max(64),
  globalName: z.string().max(64).nullable().optional(),
  avatar: z.string().max(128).nullable().optional(),
});

/** POST /api/v1/bot/users/:id/link — lie un compte Discord à un utilisateur BupoHub. */
export const POST = withBotKey(async (req, key, { id }) => {
  const body = await parseBody(req, schema);
  const user = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) throw new ApiError(404, "NOT_FOUND", "Utilisateur introuvable.");
  try {
    const account = await linkDiscord(
      id,
      { id: body.discordUserId, username: body.username, global_name: body.globalName ?? null, avatar: body.avatar ?? null },
      "BOT",
      { id: null, label: `bot:${key.name}`, type: "BOT" },
    );
    return ok(req, { linked: true, discordUserId: account.discordUserId });
  } catch (e) {
    throw new ApiError(409, "CONFLICT", e instanceof Error ? e.message : "Liaison impossible.");
  }
}, "users:write");

/** DELETE /api/v1/bot/users/:id/link — délie le compte Discord. */
export const DELETE = withBotKey(async (req, key, { id }) => {
  await unlinkDiscord(id, { id: null, label: `bot:${key.name}`, type: "BOT" });
  return ok(req, { linked: false });
}, "users:write");
