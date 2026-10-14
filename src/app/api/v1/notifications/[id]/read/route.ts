import { ok, options, withSession } from "@/server/api";
import { markRead } from "@/server/notifications";

export const OPTIONS = options;
export const POST = withSession(async (req, user, { id }) => {
  await markRead(user.id, id);
  return ok(req, { read: true });
});
