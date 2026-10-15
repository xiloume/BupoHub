import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { userCanAccessService } from "@/server/services";
import { findSsoClient, createSsoCode } from "@/server/sso";
import { audit } from "@/server/audit";
import { rateLimit, RATE_LIMITS } from "@/server/rate-limit";
import { clientIp } from "@/server/api";
import { env } from "@/lib/env";

function backWith(redirectUri: string, params: Record<string, string>) {
  const url = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

/**
 * GET /api/sso/authorize?client_id&redirect_uri&state
 * Point d'entrée « Se connecter avec BupoHub » : exige une session BupoHub,
 * vérifie l'accès au service, puis renvoie un code d'autorisation.
 */
export async function GET(req: NextRequest) {
  const rl = await rateLimit("api", clientIp(req), RATE_LIMITS.api);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const sp = req.nextUrl.searchParams;
  const clientId = sp.get("client_id") ?? "";
  const redirectUri = sp.get("redirect_uri") ?? "";
  const state = sp.get("state") ?? "";

  const service = await findSsoClient(clientId);
  if (!service || !service.ssoRedirectUri || redirectUri !== service.ssoRedirectUri) {
    return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    const login = new URL("/connexion", env.APP_URL);
    login.searchParams.set("next", `/api/sso/authorize?${sp.toString()}`);
    return NextResponse.redirect(login);
  }

  const ok = await userCanAccessService(user.id, service.id);
  if (!ok) {
    return backWith(redirectUri, { error: "access_denied", state });
  }

  const code = createSsoCode(service.id, user.id);
  await audit({
    action: "sso.authorize",
    actorId: user.id,
    actorLabel: user.username,
    targetType: "service",
    targetId: service.id,
    targetLabel: service.name,
  });
  return backWith(redirectUri, { code, state });
}
