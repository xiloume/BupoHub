import { ok, options, withSession } from "@/server/api";
import { db, type Prisma } from "@/server/db";

export const OPTIONS = options;

export const GET = withSession(async (req) => {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const pageSize = Math.min(100, Number(sp.get("pageSize") ?? 50));
  const where: Prisma.AuditLogWhereInput = {
    ...(sp.get("action") ? { action: { startsWith: sp.get("action")! } } : {}),
    ...(sp.get("actorId") ? { actorId: sp.get("actorId")! } : {}),
    ...(sp.get("targetId") ? { targetId: sp.get("targetId")! } : {}),
  };
  const [items, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { actor: { select: { username: true } } } }),
    db.auditLog.count({ where }),
  ]);
  return ok(req, { items, total, page, pages: Math.ceil(total / pageSize) });
}, "audit.read");
