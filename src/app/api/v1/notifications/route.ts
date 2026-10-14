import { ok, options, withSession } from "@/server/api";
import { countUnread, listNotifications, markAllRead } from "@/server/notifications";

export const OPTIONS = options;

export const GET = withSession(async (req, user) => {
  const unreadOnly = req.nextUrl.searchParams.get("unread") === "1";
  const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? 20));
  const [items, unread] = await Promise.all([
    listNotifications(user.id, user.createdAt, { limit, unreadOnly }),
    countUnread(user.id, user.createdAt),
  ]);
  return ok(req, { items, unread });
});

/** Marque toutes les notifications comme lues. */
export const POST = withSession(async (req, user) => {
  await markAllRead(user.id, user.createdAt);
  return ok(req, { read: true });
});
