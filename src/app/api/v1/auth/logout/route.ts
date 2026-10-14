import { ok, options, withSession } from "@/server/api";
import { logout } from "@/server/auth";
import { audit } from "@/server/audit";

export const OPTIONS = options;
export const POST = withSession(async (req, user) => {
  await audit({ action: "auth.logout", actorId: user.id, actorLabel: user.username });
  await logout();
  return ok(req, { loggedOut: true });
});
