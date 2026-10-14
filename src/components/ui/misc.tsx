import * as React from "react";
import Link from "next/link";
import { Tabs as RTabs, Switch as RSwitch } from "radix-ui";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-lg bg-white/6", className)} {...props} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-strong px-6 py-14 text-center", className)}>
      {icon ? <div className="flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent [&_svg]:size-6">{icon}</div> : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-fg-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex flex-col gap-1.5">
        {eyebrow ? <span className="text-xs font-medium uppercase tracking-wider text-accent">{eyebrow}</span> : null}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-fg-muted sm:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: "info" | "success" | "warning" | "danger";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const styles = {
    info: "border-sky-500/30 bg-sky-500/8 text-sky-200",
    success: "border-emerald-500/30 bg-emerald-500/8 text-emerald-200",
    warning: "border-amber-500/30 bg-amber-500/8 text-amber-200",
    danger: "border-red-500/30 bg-red-500/8 text-red-200",
  }[variant];
  return (
    <div role="alert" className={cn("rounded-xl border px-4 py-3 text-sm", styles, className)}>
      {title ? <p className="mb-0.5 font-semibold">{title}</p> : null}
      {children}
    </div>
  );
}

export const Tabs = RTabs.Root;
export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof RTabs.List>) {
  return (
    <RTabs.List
      className={cn("no-scrollbar inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-bg-elevated p-1", className)}
      {...props}
    />
  );
}
export function TabsTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof RTabs.Trigger>) {
  return (
    <RTabs.Trigger
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-medium text-fg-muted transition-all hover:text-fg data-[state=active]:bg-surface-2 data-[state=active]:text-fg data-[state=active]:shadow-sm [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}
export function TabsContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof RTabs.Content>) {
  return <RTabs.Content className={cn("mt-6 outline-none data-[state=active]:animate-fade-in", className)} {...props} />;
}

export function Switch({ className, ...props }: React.ComponentPropsWithoutRef<typeof RSwitch.Root>) {
  return (
    <RSwitch.Root
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-border-strong bg-surface-2 transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RSwitch.Thumb className="block size-4.5 translate-x-0.5 rounded-full bg-fg shadow transition-transform data-[state=checked]:translate-x-5.5 data-[state=checked]:bg-accent-fg" />
    </RSwitch.Root>
  );
}

export function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (p: number) => string }) {
  if (pages <= 1) return null;
  const items = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pages || Math.abs(p - page) <= 1,
  );
  const withGaps: (number | "…")[] = [];
  items.forEach((p, i) => {
    if (i > 0 && p - items[i - 1] > 1) withGaps.push("…");
    withGaps.push(p);
  });
  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      {withGaps.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-2 text-fg-subtle">…</span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg text-sm transition-colors",
              p === page ? "bg-accent text-accent-fg font-semibold" : "text-fg-muted hover:bg-white/5 hover:text-fg",
            )}
          >
            {p}
          </Link>
        ),
      )}
    </nav>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
  trend,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label?: string };
}) {
  return (
    <div className="card-surface flex flex-col gap-3 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-fg-muted">{label}</span>
        {icon ? <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent [&_svg]:size-4">{icon}</span> : null}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
        {trend ? (
          <span className={cn("mb-1 text-xs font-medium", trend.value >= 0 ? "text-emerald-400" : "text-red-400")}>
            {trend.value >= 0 ? "+" : ""}
            {trend.value}
            {trend.label ? ` ${trend.label}` : ""}
          </span>
        ) : null}
      </div>
      {hint ? <span className="text-xs text-fg-subtle">{hint}</span> : null}
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-border-strong bg-bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">{children}</kbd>;
}
