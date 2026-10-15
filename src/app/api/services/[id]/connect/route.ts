import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { userCanAccessService } from "@/server/services";
import { jellyfinConnectUrl } from "@/server/integrations/jellyfin";
import { audit } from "@/server/audit";
import { rateLimit } from "@/server/rate-limit";
import { features } from "@/lib/env";

function error(req: NextRequest, message: string, status: number) {
  const target = new URL("/dashboard", req.url);
  target.searchParams.set("error", "connect");
  target.searchParams.set("reason", message);
  return NextResponse.redirect(target, { status });
}

/**
 * GET /api/services/:id/connect
 * Provisionne le compte externe du service (ex. Jellyfin) et redirige
 * vers le service avec une session ouverte. Réservé aux services
 * dont le champ `integration` est renseigné.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    const login = new URL("/connexion", req.url);
    login.searchParams.set("next", `/api/services/${id}/connect`);
    return NextResponse.redirect(login);
  }

  const rl = await rateLimit("service.connect", user.id, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return error(req, "rate_limit", 303);

  const service = await db.service.findUnique({ where: { id } });
  if (!service || service.integration === "NONE") return error(req, "unknown", 303);
  if (service.status !== "ONLINE") return error(req, "unavailable", 303);
  if (!(await userCanAccessService(user.id, service.id))) return error(req, "forbidden", 303);

  try {
    let target: string;
    if (service.integration === "JELLYFIN") {
      if (!features.jellyfin) return error(req, "not_configured", 303);
      target = await jellyfinConnectUrl(user, service);
    } else {
      return error(req, "unknown", 303);
    }
    await audit({
      action: "service.connect",
      actorId: user.id,
      actorLabel: user.username,
      targetType: "service",
      targetId: service.id,
      targetLabel: service.name,
    });
    return NextResponse.redirect(target);
  } catch {
    return error(req, "upstream", 303);
  }
}
