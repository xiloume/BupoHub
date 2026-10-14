import { requirePermissionPage } from "@/server/auth/guards";
import { getSettings } from "@/server/settings";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar, type SidebarSection } from "@/components/layout/sidebar";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requirePermissionPage("admin.access");
  const settings = await getSettings();
  const can = (k: Parameters<typeof user.permissions.has>[0]) => user.permissions.has(k);

  const sections: SidebarSection[] = [
    {
      items: [
        { href: "/admin", label: "Vue générale", icon: "BarChart3" as const, exact: true },
        ...(can("users.read") ? [{ href: "/admin/utilisateurs", label: "Utilisateurs", icon: "Users" as const }] : []),
        ...(can("invitations.manage") ? [{ href: "/admin/invitations", label: "Invitations", icon: "Mail" as const }] : []),
        ...(can("services.manage") ? [{ href: "/admin/services", label: "Services", icon: "LayoutGrid" as const }] : []),
      ],
    },
    {
      title: "Monétisation",
      items: [
        ...(can("subscriptions.manage") ? [{ href: "/admin/abonnements", label: `Abonnements${settings["subscriptions.enabled"] ? "" : " (off)"}`, icon: "CreditCard" as const }] : []),
        ...(can("donations.read") ? [{ href: "/admin/donations", label: "Donations", icon: "Heart" as const }] : []),
      ],
    },
    {
      title: "Plateforme",
      items: [
        ...(can("discord.manage") ? [{ href: "/admin/discord", label: "Discord & API", icon: "MessageCircle" as const }] : []),
        ...(can("notifications.send") ? [{ href: "/admin/notifications", label: "Notifications", icon: "Bell" as const }] : []),
        ...(can("audit.read") ? [{ href: "/admin/audit", label: "Journal d'audit", icon: "ScrollText" as const }] : []),
        ...(can("settings.manage") ? [{ href: "/admin/parametres", label: "Paramètres", icon: "Settings" as const }] : []),
      ],
    },
    { items: [{ href: "/dashboard", label: "Retour à mon espace", icon: "Home" as const }] },
  ];
  const visible = sections.filter((s) => s.items.length);

  return (
    <>
      <Navbar />
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <Sidebar sections={visible} className="sticky top-24 hidden w-60 shrink-0 self-start lg:flex" />
        <div className="min-w-0 flex-1">
          <AdminMobileNav sections={visible} />
          <main className="animate-fade-in">{children}</main>
        </div>
      </div>
    </>
  );
}
