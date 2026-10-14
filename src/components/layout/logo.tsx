import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn("size-8", className)} aria-hidden>
      <defs>
        <linearGradient id="bh-g" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--accent-hover)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="9" fill="url(#bh-g)" />
      <path
        d="M10 9h7.2c3.2 0 5.3 1.6 5.3 4.2 0 1.7-1 3-2.5 3.5 2 .5 3.3 2 3.3 4 0 2.9-2.3 4.8-5.9 4.8H10V9zm3.4 2.8v3.9h3.3c1.5 0 2.4-.8 2.4-2s-.9-1.9-2.4-1.9h-3.3zm0 6.6v4.3h3.7c1.7 0 2.7-.8 2.7-2.2 0-1.3-1-2.1-2.7-2.1h-3.7z"
        fill="var(--accent-fg)"
      />
    </svg>
  );
}

export function Logo({ href = "/", className, compact = false }: { href?: string; className?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <LogoMark className="transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105" />
      {!compact ? (
        <span className="text-lg">
          <span className="text-accent">Bupo</span>Hub
        </span>
      ) : null}
    </Link>
  );
}
