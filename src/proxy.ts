import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "bupohub_session";
const PROTECTED_PREFIXES = ["/dashboard", "/services", "/profil", "/notifications", "/abonnement", "/admin"];

/**
 * Proxy léger : redirige vers la connexion si aucun cookie de session n'est présent
 * sur les routes protégées, et transmet le chemin courant via un header.
 * La vérification réelle de la session et des permissions se fait côté serveur
 * dans les layouts/guards (src/server/auth/guards.ts).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname);

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected && !request.cookies.get(SESSION_COOKIE)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|uploads|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml)$).*)"],
};
