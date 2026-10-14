import type { Metadata } from "next";
import { requirePermissionPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationIcon } from "@/components/notifications/notification-icon";
import { SendNotificationForm } from "@/components/admin/send-notification-form";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/meta";

export const metadata: Metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  await requirePermissionPage("notifications.send");
  const [recent, users] = await Promise.all([
    db.notification.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { user: { select: { username: true } }, _count: { select: { reads: true } } } }),
    db.user.findMany({ where: { status: "ACTIVE" }, orderBy: { username: "asc" }, select: { id: true, username: true, email: true }, take: 500 }),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Administration" title="Notifications" description="Envoyez un message à tous les utilisateurs ou à une personne en particulier." />
      <div className="grid gap-6 lg:grid-cols-3">
        <SendNotificationForm users={users} />
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Dernières notifications</CardTitle></CardHeader>
          <CardContent className="flex flex-col divide-y divide-border pt-2">
            {recent.length === 0 ? <p className="py-8 text-center text-sm text-fg-subtle">Aucune notification envoyée.</p> : null}
            {recent.map((n) => (
              <div key={n.id} className="flex gap-3 py-3">
                <NotificationIcon type={n.type} className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body ? <p className="line-clamp-2 text-xs text-fg-muted">{n.body}</p> : null}
                  <p className="mt-1 text-xs text-fg-subtle">{formatDate(n.createdAt)} · {n.userId ? `→ ${n.user?.username ?? "utilisateur"}` : `diffusion générale · ${n._count.reads} lecture${n._count.reads > 1 ? "s" : ""}`}</p>
                </div>
                <Badge variant={n.userId ? "muted" : "accent"}>{n.userId ? "Individuelle" : "Tous"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
