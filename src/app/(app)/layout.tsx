import { headers } from "next/headers";
import { requireUserPage } from "@/server/auth/guards";
import { getSettings } from "@/server/settings";
import { countUnread } from "@/server/notifications";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar, MobileTabBar, type SidebarSection } from "@/components/layout/sidebar";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const h = await headers();
  const user = await requireUserPage(h.get("x-pathname") ?? undefined);
  const [settings, unread] = await Promise.all([getSettings(), countUnread(user.id, user.createdAt)]);
  const subsEnabled = settings["subscriptions.enabled"];

  const main: SidebarSection = {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/services", label: "Services", icon: "LayoutGrid" },
      { href: "/notifications", label: "Notifications", icon: "Bell", badge: unread },
      { href: "/profil", label: "Profil", icon: "UserRound" },
    ],
  };
  const extra: SidebarSection = {
    title: "Bupo",
    items: [
      ...(subsEnabled ? [{ href: "/abonnement", label: "Abonnement", icon: "CreditCard" as const }] : []),
      ...(settings["donations.enabled"] ? [{ href: "/soutenir", label: "Soutenir Bupo", icon: "Heart" as const }] : []),
      ...(user.permissions.has("admin.access") ? [{ href: "/admin", label: "Administration", icon: "ShieldCheck" as const }] : []),
    ],
  };

  return (
    <>
      <Navbar />
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-8 pb-24 sm:px-6 md:pb-8 lg:px-8">
        <Sidebar sections={[main, ...(extra.items.length ? [extra] : [])]} className="sticky top-24 hidden w-56 shrink-0 self-start md:flex" />
        <main className="min-w-0 flex-1 animate-fade-in">{children}</main>
      </div>
      <MobileTabBar items={main.items} />
    </>
  );
}
