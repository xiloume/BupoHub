"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Popover } from "radix-ui";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationIcon } from "@/components/notifications/notification-icon";
import { formatRelative } from "@/lib/meta";
import { cn } from "@/lib/utils";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/actions/notifications";
import type { UserNotification } from "@/server/notifications";

export function NotificationBell({ items, unread }: { items: UserNotification[]; unread: number }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${unread} non lues)`}>
          <Bell className="size-5" />
          {unread > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-accent-fg">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="glass z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl shadow-2xl shadow-black/50 data-[state=open]:animate-fade-up"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                loading={pending}
                onClick={() => start(async () => { await markAllNotificationsReadAction(); router.refresh(); })}
              >
                <CheckCheck /> Tout lire
              </Button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-fg-subtle">Aucune notification.</p>
            ) : (
              items.map((n) => (
                <NotificationRow key={n.id} n={n} onRead={() => start(async () => { await markNotificationReadAction(n.id); router.refresh(); })} />
              ))
            )}
          </div>
          <div className="border-t border-border p-2">
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href="/notifications">Voir toutes les notifications</Link>
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function NotificationRow({ n, onRead }: { n: UserNotification; onRead: () => void }) {
  const inner = (
    <div className={cn("flex gap-3 px-4 py-3 transition-colors hover:bg-white/4", !n.read && "bg-accent-soft/40")}>
      <NotificationIcon type={n.type} className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", !n.read ? "font-medium text-fg" : "text-fg-muted")}>{n.title}</p>
        {n.body ? <p className="mt-0.5 line-clamp-2 text-xs text-fg-subtle">{n.body}</p> : null}
        <p className="mt-1 text-[11px] text-fg-subtle">{formatRelative(n.createdAt)}</p>
      </div>
      {!n.read ? <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" /> : null}
    </div>
  );
  return n.link ? (
    <Link href={n.link} onClick={() => !n.read && onRead()} className="block">
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={() => !n.read && onRead()} className="block w-full text-left">
      {inner}
    </button>
  );
}
