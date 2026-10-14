import { z } from "zod";
import { ok, options, parseBody, withSession, ApiError } from "@/server/api";
import { getUserDetail, adminUpdateUser, adminDeleteUser, adminSetUserStatus } from "@/server/users";
import { adminUpdateUserSchema } from "@/lib/validation";

export const OPTIONS = options;

export const GET = withSession(async (req, _actor, { id }) => {
  const user = await getUserDetail(id);
  if (!user) throw new ApiError(404, "NOT_FOUND", "Utilisateur introuvable.");
  const { passwordHash: _ph, sessions, ...rest } = user;
  return ok(req, { ...rest, activeSessions: sessions.length });
}, "users.read");

export const PATCH = withSession(async (req, actor, { id }) => {
  const body = await parseBody(req, adminUpdateUserSchema.partial().extend({ status: z.enum(["ACTIVE", "SUSPENDED"]).optional() }));
  const current = await getUserDetail(id);
  if (!current) throw new ApiError(404, "NOT_FOUND", "Utilisateur introuvable.");
  if (body.roleId && body.roleId !== current.roleId && !actor.permissions.has("users.roles")) {
    throw new ApiError(403, "FORBIDDEN", "Permission users.roles requise.");
  }
  await adminUpdateUser(actor, id, {
    email: body.email ?? current.email,
    username: body.username ?? current.username,
    displayName: body.displayName ?? current.displayName ?? undefined,
    roleId: body.roleId ?? current.roleId,
  });
  if (body.status && body.status !== current.status) {
    if (!actor.permissions.has("users.suspend")) throw new ApiError(403, "FORBIDDEN", "Permission users.suspend requise.");
    await adminSetUserStatus(actor, id, body.status);
  }
  return ok(req, { updated: true });
}, "users.write");

export const DELETE = withSession(async (req, actor, { id }) => {
  await adminDeleteUser(actor, id);
  return ok(req, { deleted: true });
}, "users.delete");
