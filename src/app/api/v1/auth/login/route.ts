import { ApiError, ok, options, parseBody, withPublic } from "@/server/api";
import { login, AuthFlowError } from "@/server/auth";
import { audit } from "@/server/audit";
import { loginSchema } from "@/lib/validation";

export const OPTIONS = options;

/** Connexion par API : pose le cookie de session (usage applications web/mobile même origine). */
export const POST = withPublic(async (req) => {
  const body = await parseBody(req, loginSchema);
  try {
    const user = await login(body.identifier, body.password);
    await audit({ action: "auth.login", actorId: user.id, actorLabel: user.username, metadata: { via: "api" } });
    return ok(req, { id: user.id, username: user.username, email: user.email });
  } catch (e) {
    if (e instanceof AuthFlowError) throw new ApiError(e.retryAfter ? 429 : 401, "INVALID_CREDENTIALS", e.message);
    throw e;
  }
});
