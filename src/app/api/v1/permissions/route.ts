import { ok, options, withSession } from "@/server/api";
import { db } from "@/server/db";
import { PERMISSIONS } from "@/lib/permissions";

export const OPTIONS = options;

/** Catalogue des permissions et rôles (lecture admin). */
export const GET = withSession(async (req) => {
  const roles = await db.role.findMany({ include: { permissions: { select: { permission: { select: { key: true } } } }, _count: { select: { users: true } } }, orderBy: { priority: "desc" } });
  return ok(req, {
    permissions: PERMISSIONS,
    roles: roles.map((r) => ({ id: r.id, slug: r.slug, name: r.name, isSystem: r.isSystem, users: r._count.users, permissions: r.permissions.map((p) => p.permission.key) })),
  });
}, "admin.access");
