"use client";

import * as React from "react";
import { Avatar as RadixAvatar } from "radix-ui";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/meta";

const sizes = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-xl",
  "2xl": "size-28 text-3xl",
};

export function Avatar({
  src,
  name,
  size = "md",
  className,
}: {
  src?: string | null;
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <RadixAvatar.Root
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full border border-border-strong bg-surface-2 font-semibold text-fg",
        sizes[size],
        className,
      )}
    >
      {src ? <RadixAvatar.Image src={src} alt={name} className="size-full object-cover" /> : null}
      <RadixAvatar.Fallback
        delayMs={src ? 300 : 0}
        className="flex size-full items-center justify-center bg-gradient-to-br from-accent/30 to-accent/5 text-accent"
      >
        {initials(name) || "?"}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
}
