import "server-only";
import { db, type NotificationType } from "@/server/db";

type NotifyInput = {
  type?: NotificationType;
  title: string;
  body?: string;
  link?: string;
  expiresAt?: Date;
};

/** Notification destinée à un utilisateur précis. */
export async function notifyUser(userId: string, input: NotifyInput) {
  return db.notification.create({ data: { userId, ...input } });
}

/** Notification destinée à tous les utilisateurs (broadcast, userId = null). */
export async function notifyAll(input: NotifyInput) {
  return db.notification.create({ data: { userId: null, ...input } });
}

export async function notifyUsers(userIds: string[], input: NotifyInput) {
  if (!userIds.length) return;
  await db.notification.createMany({ data: userIds.map((userId) => ({ userId, ...input })) });
}

export type UserNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: Date;
  read: boolean;
  broadcast: boolean;
};

/**
 * Liste les notifications visibles par un utilisateur : les siennes + les broadcasts
 * non expirés créés après son inscription.
 */
export async function listNotifications(
  userId: string,
  userCreatedAt: Date,
  { limit = 20, unreadOnly = false }: { limit?: number; unreadOnly?: boolean } = {},
): Promise<UserNotification[]> {
  const now = new Date();
  const rows = await db.notification.findMany({
    where: {
      AND: [
        { OR: [{ userId }, { userId: null, createdAt: { gte: userCreatedAt } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    },
    include: { reads: { where: { userId }, select: { readAt: true } } },
    orderBy: { createdAt: "desc" },
    take: unreadOnly ? limit * 3 : limit,
  });
  const mapped = rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    createdAt: n.createdAt,
    broadcast: n.userId === null,
    read: n.userId === null ? n.reads.length > 0 : n.readAt !== null,
  }));
  return unreadOnly ? mapped.filter((n) => !n.read).slice(0, limit) : mapped;
}

export async function countUnread(userId: string, userCreatedAt: Date) {
  const now = new Date();
  const [personal, broadcasts] = await Promise.all([
    db.notification.count({
      where: { userId, readAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    }),
    db.notification.count({
      where: {
        userId: null,
        createdAt: { gte: userCreatedAt },
        reads: { none: { userId } },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
  ]);
  return personal + broadcasts;
}

export async function markRead(userId: string, notificationId: string) {
  const n = await db.notification.findUnique({ where: { id: notificationId } });
  if (!n) return;
  if (n.userId === userId) {
    await db.notification.update({ where: { id: n.id }, data: { readAt: new Date() } });
  } else if (n.userId === null) {
    await db.notificationRead.upsert({
      where: { notificationId_userId: { notificationId: n.id, userId } },
      create: { notificationId: n.id, userId },
      update: {},
    });
  }
}

export async function markAllRead(userId: string, userCreatedAt: Date) {
  await db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  const broadcasts = await db.notification.findMany({
    where: { userId: null, createdAt: { gte: userCreatedAt }, reads: { none: { userId } } },
    select: { id: true },
  });
  if (broadcasts.length) {
    await db.notificationRead.createMany({
      data: broadcasts.map((b) => ({ notificationId: b.id, userId })),
      skipDuplicates: true,
    });
  }
}
