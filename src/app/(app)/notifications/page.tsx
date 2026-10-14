import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { requireUserPage } from "@/server/auth/guards";
import { listNotifications } from "@/server/notifications";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/actions/notifications";
import { NotificationIcon } from "@/components/notifications/notification-icon";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUserPage();
  const items = await listNotifications(user.id, user.createdAt, { limit: 100 });
  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Mon espace"
        title="Notifications"
        description={unread ? `${unread} notification${unread > 1 ? "s" : ""} non lue${unread > 1 ? "s" : ""}.` : "Vous êtes à jour."}
        actions={
          unread ? (
            <form action={markAllNotificationsReadAction}>
              <Button variant="secondary" type="submit"><CheckCheck /> Tout marquer comme lu</Button>
            </form>
          ) : null
        }
      />
      {items.length === 0 ? (
        <EmptyState icon={<Bell />} title="Aucune notification" description="Les nouveautés, alertes et messages apparaîtront ici." />
      ) : (
        <ul className="card-surface divide-y divide-border overflow-hidden rounded-2xl">
          {items.map((n) => (
            <li key={n.id} className={cn("flex gap-4 p-4 sm:p-5", !n.read && "bg-accent-soft/30")}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-bg-elevated">
                <NotificationIcon type={n.type} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className={cn("text-sm", !n.read ? "font-semibold" : "font-medium text-fg-muted")}>{n.title}</p>
                  <span className="text-xs text-fg-subtle">{formatDate(n.createdAt)}</span>
                </div>
                {n.body ? <p className="mt-1 text-sm text-fg-muted">{n.body}</p> : null}
                <div className="mt-2 flex gap-3">
                  {n.link ? (
                    <Link href={n.link} className="text-xs font-medium text-accent hover:underline">Ouvrir</Link>
                  ) : null}
                  {!n.read ? (
                    <form action={markNotificationReadAction.bind(null, n.id)}>
                      <button type="submit" className="text-xs text-fg-subtle hover:text-fg">Marquer comme lu</button>
                    </form>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
