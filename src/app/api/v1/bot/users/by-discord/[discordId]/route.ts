import { ok, options, withBotKey, ApiError } from "@/server/api";
import { findUserByDiscordId } from "@/server/bot";

export const OPTIONS = options;

/** GET /api/v1/bot/users/by-discord/:discordId — profil BupoHub d'un membre Discord. */
export const GET = withBotKey(async (req, _key, { discordId }) => {
  const user = await findUserByDiscordId(discordId);
  if (!user) throw new ApiError(404, "NOT_LINKED", "Aucun compte BupoHub lié à cet identifiant Discord.");
  return ok(req, user);
}, "users:read");
