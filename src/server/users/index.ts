import "server-only";
import { db, type Prisma, type UserStatus } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { audit } from "@/server/audit";
import { notifyUser } from "@/server/notifications";
import { createPasswordResetLink } from "@/server/auth";
import { syncServiceIntegrations } from "@/server/integrations/access";
import { setJellyfinUserDisabled } from "@/server/integrations/jellyfin";
import { features } from "@/lib/env";
import type { SessionUser } from "@/server/auth/session";

export const userListSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  status: true,
  createdAt: true,
  lastLoginAt: true,
  role: { select: { id: true, slug: true, name: true } },
  discordAccount: { select: { username: true } },
  subscriptions: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 },
} satisfies Prisma.UserSelect;

export type UserListItem = Prisma.UserGetPayload<{ select: typeof userListSelect }>;

export type UserListParams = {
  q?: string;
  role?: string;
  status?: UserStatus | "ALL";
  page?: number;
  pageSize?: number;
  sort?: "createdAt" | "lastLoginAt" | "username";
  order?: "asc" | "desc";
};

export async function listUsers(params: UserListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 20));
  const where: Prisma.UserWhereInput = {
    ...(params.q
      ? {
          OR: [
            { email: { contains: params.q } },
            { username: { contains: params.q } },
            { displayName: { contains: params.q } },
          ],
        }
      : {}),
    ...(params.role && params.role !== "ALL" ? { role: { slug: params.role } } : {}),
    ...(params.status && params.status !== "ALL" ? { status: params.status } : { status: { not: "DELETED" } }),
  };
  const [items, total] = await Promise.all([
    db.user.findMany({
      where,
      select: userListSelect,
      orderBy: { [params.sort ?? "createdAt"]: params.order ?? "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.user.count({ where }),
  ]);
  return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getUserDetail(id: string) {
  return db.user.findUnique({
    where: { id },
    include: {
      role: true,
      discordAccount: true,
      subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" } },
      userServices: { include: { service: true } },
      sessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastActiveAt: "desc" } },
      loginHistory: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
}

function assertNotSelf(actor: SessionUser, targetId: string, message: string) {
  if (actor.id === targetId) throw new Error(message);
}

export async function adminCreateUser(
  actor: SessionUser,
  input: { email: string; username: string; displayName?: string; password: string; roleId: string },
) {
  const user = await db.user.create({
    data: {
      email: input.email,
      username: input.username,
      displayName: input.displayName || null,
      passwordHash: await hashPassword(input.password),
      roleId: input.roleId,
    },
  });
  await audit({
    action: "user.create",
    actorId: actor.id,
    actorLabel: actor.username,
    targetType: "user",
    targetId: user.id,
    targetLabel: user.username,
  });
  await notifyUser(user.id, {
    type: "ACCOUNT",
    title: "Compte créé",
    body: "Votre compte BupoHub a été créé par un administrateur.",
  });
  return user;
}

export async function adminUpdateUser(
  actor: SessionUser,
  id: string,
  input: { email: string; username: string; displayName?: string; roleId: string },
) {
  const before = await db.user.findUniqueOrThrow({ where: { id }, include: { role: true } });
  if (before.roleId !== input.roleId) {
    assertNotSelf(actor, id, "Vous ne pouvez pas modifier votre propre rôle.");
  }
  const user = await db.user.update({
    where: { id },
    data: {
      email: input.email,
      username: input.username,
      displayName: input.displayName || null,
      roleId: input.roleId,
    },
    include: { role: true },
  });
  const changes: Record<string, [unknown, unknown]> = {};
  for (const k of ["email", "username", "displayName"] as const) {
    if (before[k] !== user[k]) changes[k] = [before[k], user[k]];
  }
  if (before.roleId !== user.roleId) {
    changes.role = [before.role.slug, user.role.slug];
    await audit({
      action: "user.role_change",
      actorId: actor.id,
      actorLabel: actor.username,
      targetType: "user",
      targetId: id,
      targetLabel: user.username,
      metadata: { from: before.role.slug, to: user.role.slug },
    });
  }
  if (Object.keys(changes).length) {
    await audit({
      action: "user.update",
      actorId: actor.id,
      actorLabel: actor.username,
      targetType: "user",
      targetId: id,
      targetLabel: user.username,
      metadata: changes as Prisma.InputJsonValue,
    });
  }
  return user;
}

export async function adminSetUserStatus(actor: SessionUser, id: string, status: "ACTIVE" | "SUSPENDED") {
  assertNotSelf(actor, id, "Vous ne pouvez pas modifier le statut de votre propre compte.");
  const user = await db.user.update({ where: { id }, data: { status } });
  if (status === "SUSPENDED") {
    await db.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  }
  await syncServiceIntegrations(id);
  await audit({
    action: status === "SUSPENDED" ? "user.suspend" : "user.reactivate",
    actorId: actor.id,
    actorLabel: actor.username,
    targetType: "user",
    targetId: id,
    targetLabel: user.username,
  });
  return user;
}

export async function adminDeleteUser(actor: SessionUser, id: string) {
  assertNotSelf(actor, id, "Vous ne pouvez pas supprimer votre propre compte.");
  const user = await db.user.findUniqueOrThrow({ where: { id } });
  if (features.jellyfin) {
    try {
      await setJellyfinUserDisabled(user.username, true);
    } catch {
      // non bloquant
    }
  }
  const stamp = Date.now();
  await db.$transaction([
    db.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
    db.user.update({
      where: { id },
      data: {
        status: "DELETED",
        deletedAt: new Date(),
        email: `deleted+${stamp}+${user.email}`,
        username: `deleted_${stamp}_${user.username}`.slice(0, 32),
        displayName: null,
        avatarUrl: null,
      },
    }),
    db.discordAccount.deleteMany({ where: { userId: id } }),
  ]);
  await audit({
    action: "user.delete",
    actorId: actor.id,
    actorLabel: actor.username,
    targetType: "user",
    targetId: id,
    targetLabel: user.username,
  });
}

export async function adminResetPasswordLink(actor: SessionUser, id: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id } });
  const link = await createPasswordResetLink(id, 24 * 60 * 60 * 1000);
  await audit({
    action: "user.password_reset_link",
    actorId: actor.id,
    actorLabel: actor.username,
    targetType: "user",
    targetId: id,
    targetLabel: user.username,
  });
  return link;
}

export async function adminRevokeSessions(actor: SessionUser, id: string) {
  await db.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit({ action: "user.sessions_revoked", actorId: actor.id, actorLabel: actor.username, targetType: "user", targetId: id });
}

export async function adminSetServiceAccess(actor: SessionUser, userId: string, serviceId: string, grant: boolean) {
  const service = await db.service.findUniqueOrThrow({ where: { id: serviceId } });
  if (grant) {
    await db.userService.upsert({
      where: { userId_serviceId: { userId, serviceId } },
      create: { userId, serviceId, grantedById: actor.id },
      update: { grantedById: actor.id, expiresAt: null },
    });
    await notifyUser(userId, {
      type: "SERVICE",
      title: `Accès à ${service.name}`,
      body: `Vous avez maintenant accès à ${service.name}.`,
      link: "/services",
    });
  } else {
    await db.userService.deleteMany({ where: { userId, serviceId } });
  }
  await syncServiceIntegrations(userId);
  await audit({
    action: grant ? "user.service_grant" : "user.service_revoke",
    actorId: actor.id,
    actorLabel: actor.username,
    targetType: "user",
    targetId: userId,
    metadata: { serviceId, service: service.name },
  });
}
