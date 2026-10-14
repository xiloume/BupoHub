import { ok, options, withPublic } from "@/server/api";
import { getCurrentUser } from "@/server/auth/session";
import { listPublicServices, listServicesForUser } from "@/server/services";

export const OPTIONS = options;

/** Services : publics pour un visiteur, avec résolution d'accès pour un utilisateur connecté. */
export const GET = withPublic(async (req) => {
  const user = await getCurrentUser();
  if (user) {
    const services = await listServicesForUser(user.id);
    return ok(req, services.map(({ healthcheckUrl: _h, ...s }) => s));
  }
  const services = await listPublicServices();
  return ok(req, services.map(({ healthcheckUrl: _h, ...s }) => ({ ...s, hasAccess: true, accessReason: "public" })));
});
