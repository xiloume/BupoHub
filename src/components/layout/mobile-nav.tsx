"use client";

import * as React from "react";
import Link from "next/link";
import { Dialog as RD } from "radix-ui";
import { Menu, X, LogOut } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useIsActive, type NavLink } from "@/components/layout/nav-links";
import { logoutAction } from "@/actions/auth";
import { cn } from "@/lib/utils";
import type { NavUser } from "@/components/layout/user-menu";

export function MobileNav({ links, user }: { links: NavLink[]; user: NavUser | null }) {
  const [open, setOpen] = React.useState(false);
  const isActive = useIsActive();
  return (
    <RD.Root open={open} onOpenChange={setOpen}>
      <RD.Trigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Ouvrir le menu">
          <Menu className="size-5" />
        </Button>
      </RD.Trigger>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-fade-in md:hidden" />
        <RD.Content className="fixed inset-y-0 right-0 z-50 flex w-[86vw] max-w-sm flex-col border-l border-border-strong bg-bg-elevated p-5 shadow-2xl outline-none data-[state=open]:animate-fade-in md:hidden">
          <RD.Title className="sr-only">Menu</RD.Title>
          <div className="flex items-center justify-between">
            <Logo />
            <RD.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fermer le menu">
                <X className="size-5" />
              </Button>
            </RD.Close>
          </div>
          {user ? (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <Avatar src={user.avatarUrl} name={user.displayName || user.username} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.displayName || user.username}</p>
                <p className="truncate text-xs text-fg-subtle">{user.email}</p>
              </div>
            </div>
          ) : null}
          <nav className="mt-6 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-base font-medium transition-colors",
                  isActive(l.href, l.exact) ? "bg-accent-soft text-accent" : "text-fg-muted hover:bg-white/5 hover:text-fg",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-2 pt-6">
            {user ? (
              <form action={logoutAction}>
                <Button variant="outline" className="w-full" type="submit">
                  <LogOut /> Déconnexion
                </Button>
              </form>
            ) : (
              <>
                <Button asChild variant="outline" className="w-full" onClick={() => setOpen(false)}>
                  <Link href="/connexion">Connexion</Link>
                </Button>
              </>
            )}
          </div>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
