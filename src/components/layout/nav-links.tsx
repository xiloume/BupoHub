"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavLink = { href: string; label: string; exact?: boolean };

export function useIsActive() {
  const pathname = usePathname();
  return (href: string, exact = false) => (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
}

export function NavLinks({ links, className, onNavigate }: { links: NavLink[]; className?: string; onNavigate?: () => void }) {
  const isActive = useIsActive();
  return (
    <nav className={cn("flex items-center gap-1", className)}>
      {links.map((l) => {
        const active = isActive(l.href, l.exact);
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            className={cn(
              "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "text-fg" : "text-fg-muted hover:text-fg hover:bg-white/5",
            )}
          >
            {l.label}
            {active ? <span className="absolute inset-x-3 -bottom-px h-px bg-accent" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
