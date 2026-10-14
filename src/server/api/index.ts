import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { AuthError, requirePermission, requireUser } from "@/server/auth/guards";
import { authenticateApiKey, type ApiKeyContext } from "@/server/api-keys";
import { rateLimit, RATE_LIMITS } from "@/server/rate-limit";
import type { SessionUser } from "@/server/auth/session";
import type { PermissionKey } from "@/lib/permissions";
import type { BotScope } from "@/lib/validation";
import { flattenErrors } from "@/lib/validation";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

function corsHeaders(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
  if (origin && (origin === env.APP_URL || env.CORS_ORIGINS.includes(origin))) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return headers;
}

export function ok<T>(req: NextRequest, data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, { ...init, headers: { ...corsHeaders(req), ...(init?.headers ?? {}) } });
}

export function fail(req: NextRequest, status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json(
    { error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status, headers: corsHeaders(req) },
  );
}

export function options(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function parseBody<T extends z.ZodTypeAny>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Corps de requête JSON invalide.");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ApiError(422, "VALIDATION_ERROR", "Données invalides.", flattenErrors(parsed.error));
  return parsed.data;
}

type Handler<Ctx> = (req: NextRequest, ctx: Ctx, params: Record<string, string>) => Promise<Response>;

function handleError(req: NextRequest, e: unknown) {
  if (e instanceof ApiError) return fail(req, e.status, e.code, e.message, e.details);
  if (e instanceof AuthError) {
    return fail(req, e.code === "UNAUTHENTICATED" ? 401 : 403, e.code, e.message);
  }
  console.error("[api]", e);
  return fail(req, 500, "INTERNAL_ERROR", "Une erreur interne est survenue.");
}

type RouteContext = { params: Promise<Record<string, string>> };

/** Route publique (rate limit par IP). */
export function withPublic(handler: Handler<null>) {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      const rl = await rateLimit("api", clientIp(req), RATE_LIMITS.api);
      if (!rl.ok) throw new ApiError(429, "RATE_LIMITED", "Trop de requêtes.");
      return await handler(req, null, await ctx.params);
    } catch (e) {
      return handleError(req, e);
    }
  };
}

/** Route authentifiée par session cookie, avec permissions optionnelles. */
export function withSession(handler: Handler<SessionUser>, ...permissions: PermissionKey[]) {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      const rl = await rateLimit("api", clientIp(req), RATE_LIMITS.api);
      if (!rl.ok) throw new ApiError(429, "RATE_LIMITED", "Trop de requêtes.");
      const user = permissions.length ? await requirePermission(...permissions) : await requireUser();
      return await handler(req, user, await ctx.params);
    } catch (e) {
      return handleError(req, e);
    }
  };
}

/** Route pour le bot Discord : clé API + scopes. */
export function withBotKey(handler: Handler<ApiKeyContext>, ...scopes: BotScope[]) {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      const key = await authenticateApiKey(req.headers.get("authorization"));
      if (!key) throw new ApiError(401, "INVALID_API_KEY", "Clé API manquante ou invalide.");
      const rl = await rateLimit("bot", key.id, RATE_LIMITS.bot);
      if (!rl.ok) throw new ApiError(429, "RATE_LIMITED", "Trop de requêtes.");
      for (const s of scopes) {
        if (!key.scopes.has(s)) throw new ApiError(403, "INSUFFICIENT_SCOPE", `Scope requis : ${s}`);
      }
      return await handler(req, key, await ctx.params);
    } catch (e) {
      return handleError(req, e);
    }
  };
}

export function serializeUser(u: SessionUser) {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    role: u.role.slug,
    permissions: [...u.permissions],
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
  };
}
