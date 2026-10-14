"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LayoutGrid,
  UserRound,
  Bell,
  CreditCard,
  ShieldCheck,
  Users,
  Mail,
  ScrollText,
  Settings,
  Heart,
  MessageCircle,
  BarChart3,
  Home,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SidebarItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean; badge?: number };
export type SidebarSection = { title?: string; items: SidebarItem[] };

const ICONS = {
  LayoutDashboard,
  LayoutGrid,
  UserRound,
  Bell,
  CreditCard,
  ShieldCheck,
  Users,
  Mail,
  ScrollText,
  Settings,
  Heart,
  MessageCircle,
  BarChart3,
  Home,
} satisfies Record<string, LucideIcon>;

export function Sidebar({ sections, className }: { sections: SidebarSection[]; className?: string }) {
  const pathname = usePathname();
  return (
    <aside className={cn("flex flex-col gap-6", className)}>
      {sections.map((section, i) => (
        <div key={i} className="flex flex-col gap-1">
          {section.title ? <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{section.title}</p> : null}
          {section.items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active ? "bg-accent-soft text-accent" : "text-fg-muted hover:bg-white/5 hover:text-fg",
                )}
              >
                <Icon className={cn("size-4.5 shrink-0 transition-colors", active ? "text-accent" : "text-fg-subtle group-hover:text-fg")} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold leading-4 text-accent-fg">{item.badge > 99 ? "99+" : item.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

/** Barre de navigation mobile en bas de l'écran (espace connecté). */
export function MobileTabBar({ items }: { items: SidebarItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/85 backdrop-blur-xl md:hidden">
      <ul className="grid auto-cols-fr grid-flow-col">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link href={item.href} className={cn("relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", active ? "text-accent" : "text-fg-subtle")}>
                <Icon className="size-5" />
                {item.label}
                {item.badge ? <span className="absolute right-1/4 top-1.5 size-2 rounded-full bg-accent" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
