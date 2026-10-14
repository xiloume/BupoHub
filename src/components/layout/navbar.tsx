import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/server/auth/session";
import { getSettings } from "@/server/settings";
import { countUnread, listNotifications } from "@/server/notifications";
import { Logo } from "@/components/layout/logo";
import { NavLinks, type NavLink } from "@/components/layout/nav-links";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu, type NavUser } from "@/components/layout/user-menu";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Button } from "@/components/ui/button";

export async function Navbar() {
  const [user, settings, t] = await Promise.all([getCurrentUser(), getSettings(), getTranslations("nav")]);
  const subsEnabled = settings["subscriptions.enabled"];

  const links: NavLink[] = user
    ? [
        { href: "/dashboard", label: t("dashboard") },
        { href: "/services", label: t("services") },
        { href: "/profil", label: t("profile") },
        ...(subsEnabled ? [{ href: "/abonnement", label: t("subscription") }] : []),
        ...(user.permissions.has("admin.access") ? [{ href: "/admin", label: t("admin") }] : []),
      ]
    : [
        { href: "/", label: t("home"), exact: true },
        { href: "/#services", label: t("services"), exact: true },
        { href: "/connexion", label: t("mySpace") },
      ];

  const navUser: NavUser | null = user
    ? {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        isAdmin: user.permissions.has("admin.access"),
        roleName: user.role.name,
      }
    : null;

  const [notifications, unread] = user
    ? await Promise.all([listNotifications(user.id, user.createdAt, { limit: 8 }), countUnread(user.id, user.createdAt)])
    : [[], 0];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/70 backdrop-blur-xl">
      {settings["maintenance.enabled"] && settings["maintenance.message"] ? (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs font-medium text-amber-200">
          {settings["maintenance.message"]}
        </div>
      ) : null}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo />
          <NavLinks links={links} className="hidden md:flex" />
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {user && navUser ? (
            <>
              <NotificationBell items={notifications} unread={unread} />
              <UserMenu user={navUser} showSubscription={subsEnabled} />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/connexion">{t("login")}</Link>
              </Button>
              <Button asChild>
                <Link href="/connexion">{t("mySpace")}</Link>
              </Button>
            </>
          )}
          <MobileNav links={links} user={navUser} />
        </div>
      </div>
    </header>
  );
}
