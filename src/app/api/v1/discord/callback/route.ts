import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { completeOAuth, linkDiscord } from "@/server/discord";
import { env } from "@/lib/env";

/** Retour OAuth2 Discord : lie le compte Discord à l'utilisateur connecté. */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(`${env.APP_URL}/connexion?next=/profil?tab=discord`);
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state) return NextResponse.redirect(`${env.APP_URL}/profil?tab=discord&discord=error`);
  try {
    const profile = await completeOAuth(code, state);
    await linkDiscord(user.id, profile, "USER");
    return NextResponse.redirect(`${env.APP_URL}/profil?tab=discord&discord=linked`);
  } catch (e) {
    console.error("[discord oauth]", e);
    return NextResponse.redirect(`${env.APP_URL}/profil?tab=discord&discord=error`);
  }
}
