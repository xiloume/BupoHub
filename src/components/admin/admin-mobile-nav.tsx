"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { SidebarSection } from "@/components/layout/sidebar";

/** Navigation admin horizontale (mobile / tablette). */
export function AdminMobileNav({ sections }: { sections: SidebarSection[] }) {
  const pathname = usePathname();
  const items = sections.flatMap((s) => s.items);
  return (
    <nav className="no-scrollbar -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-border px-4 pb-3 lg:hidden">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active ? "border-accent/40 bg-accent-soft text-accent" : "border-border text-fg-muted hover:text-fg",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
