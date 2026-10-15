import { NextRequest, NextResponse } from "next/server";
import { exchangeSsoCode } from "@/server/sso";
import { rateLimit, RATE_LIMITS } from "@/server/rate-limit";
import { clientIp } from "@/server/api";

/**
 * POST /api/sso/token — { client_id, client_secret, code }
 * Appel serveur-à-serveur : échange le code d'autorisation contre le profil.
 */
export async function POST(req: NextRequest) {
  const rl = await rateLimit("api", clientIp(req), RATE_LIMITS.api);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: { client_id?: string; client_secret?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.client_id || !body.client_secret || !body.code) {
    return NextResponse.json({ error: "missing_parameters" }, { status: 400 });
  }

  const result = await exchangeSsoCode(body.client_id, body.client_secret, body.code);
  if (!result) return NextResponse.json({ error: "invalid_grant" }, { status: 401 });

  const { user, access } = result;
  return NextResponse.json({
    sub: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    hasServiceAccess: access,
  });
}
