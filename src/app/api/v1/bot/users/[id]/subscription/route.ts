import { ok, options, withBotKey, ApiError } from "@/server/api";
import { botUserPayload } from "@/server/bot";

export const OPTIONS = options;

/** GET /api/v1/bot/users/:id/subscription — vérification d'abonnement (pour attribuer un rôle Discord par ex.). */
export const GET = withBotKey(async (req, _key, { id }) => {
  const user = await botUserPayload(id);
  if (!user) throw new ApiError(404, "NOT_FOUND", "Utilisateur introuvable.");
  return ok(req, { userId: user.id, ...user.subscription });
}, "subscriptions:read");
