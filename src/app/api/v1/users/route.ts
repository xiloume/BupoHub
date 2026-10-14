import { ok, options, parseBody, withSession, ApiError } from "@/server/api";
import { listUsers, adminCreateUser } from "@/server/users";
import { db } from "@/server/db";
import { adminCreateUserSchema } from "@/lib/validation";

export const OPTIONS = options;

export const GET = withSession(async (req) => {
  const sp = req.nextUrl.searchParams;
  const result = await listUsers({
    q: sp.get("q") ?? undefined,
    role: sp.get("role") ?? undefined,
    status: (sp.get("status") as "ACTIVE" | "SUSPENDED" | "DELETED" | "ALL" | null) ?? undefined,
    page: Number(sp.get("page") ?? 1),
    pageSize: Number(sp.get("pageSize") ?? 20),
  });
  return ok(req, result);
}, "users.read");

export const POST = withSession(async (req, actor) => {
  const body = await parseBody(req, adminCreateUserSchema);
  const taken = await db.user.findFirst({ where: { OR: [{ email: body.email }, { username: body.username }] } });
  if (taken) throw new ApiError(409, "CONFLICT", "Email ou nom d'utilisateur déjà utilisé.");
  const user = await adminCreateUser(actor, body);
  return ok(req, { id: user.id, username: user.username, email: user.email }, { status: 201 });
}, "users.write");
