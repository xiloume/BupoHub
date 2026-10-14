"use client";

import * as React from "react";
import { DropdownMenu as RD } from "radix-ui";
import { cn } from "@/lib/utils";

export const Dropdown = RD.Root;
export const DropdownTrigger = RD.Trigger;

export function DropdownContent({ className, sideOffset = 8, ...props }: React.ComponentPropsWithoutRef<typeof RD.Content>) {
  return (
    <RD.Portal>
      <RD.Content
        sideOffset={sideOffset}
        className={cn(
          "glass z-50 min-w-48 overflow-hidden rounded-xl p-1.5 shadow-2xl shadow-black/50 data-[state=open]:animate-fade-up",
          className,
        )}
        {...props}
      />
    </RD.Portal>
  );
}

export function DropdownItem({ className, inset, ...props }: React.ComponentPropsWithoutRef<typeof RD.Item> & { inset?: boolean }) {
  return (
    <RD.Item
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-fg-muted outline-none transition-colors data-[highlighted]:bg-white/6 data-[highlighted]:text-fg data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        inset && "pl-8",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof RD.Label>) {
  return <RD.Label className={cn("px-2.5 py-1.5 text-xs font-medium text-fg-subtle", className)} {...props} />;
}

export function DropdownSeparator({ className, ...props }: React.ComponentPropsWithoutRef<typeof RD.Separator>) {
  return <RD.Separator className={cn("my-1 h-px bg-border", className)} {...props} />;
}
