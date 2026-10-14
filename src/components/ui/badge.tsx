import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-border-strong bg-surface-2 text-fg-muted",
        accent: "border-accent/30 bg-accent-soft text-accent",
        success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
        danger: "border-red-500/30 bg-red-500/10 text-red-300",
        info: "border-sky-500/30 bg-sky-500/10 text-sky-300",
        violet: "border-violet-500/30 bg-violet-500/10 text-violet-300",
        muted: "border-transparent bg-white/5 text-fg-subtle",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export function Badge({
  className,
  variant,
  dot,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {props.children}
    </span>
  );
}

export function StatusDot({ className, pulse = false }: { className?: string; pulse?: boolean }) {
  return (
    <span className="relative inline-flex size-2.5">
      {pulse ? <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", className)} /> : null}
      <span className={cn("relative inline-flex size-2.5 rounded-full", className)} />
    </span>
  );
}
