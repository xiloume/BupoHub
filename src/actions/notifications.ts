"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/server/auth/guards";
import { markAllRead, markRead } from "@/server/notifications";

export async function markNotificationReadAction(id: string) {
  const user = await requireUser();
  await markRead(user.id, id);
  refresh();
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await markAllRead(user.id, user.createdAt);
  refresh();
}
