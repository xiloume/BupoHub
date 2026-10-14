import { LogoMark } from "@/components/layout/logo";
import { ServiceIcon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type Node = { icon: string | null; name: string };

/**
 * Illustration animée de l'écosystème : BupoHub au centre, les services en orbite.
 * CSS pur (animations définies dans globals.css) — légère et sans JS.
 */
export function EcosystemIllustration({ services, className }: { services: Node[]; className?: string }) {
  const inner = services.slice(0, 3);
  const outer = services.slice(3, 8);
  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-md select-none", className)} aria-hidden>
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,var(--accent-soft),transparent_60%)] blur-2xl" />
      <div className="absolute inset-[18%] rounded-full border border-border-strong/60" />
      <div className="absolute inset-[2%] rounded-full border border-dashed border-border" />

      <div className="absolute left-1/2 top-1/2 flex size-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-3xl glass accent-glow">
        <LogoMark className="size-12" />
      </div>

      <div className="absolute inset-[18%] animate-orbit">
        {inner.map((s, i) => (
          <OrbitNode key={s.name} node={s} angle={(360 / Math.max(inner.length, 1)) * i} counter="animate-orbit-reverse" size="lg" />
        ))}
      </div>
      {outer.length ? (
        <div className="absolute inset-[2%] animate-orbit-reverse">
          {outer.map((s, i) => (
            <OrbitNode key={s.name} node={s} angle={(360 / outer.length) * i + 30} counter="animate-orbit" size="sm" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OrbitNode({ node, angle, counter, size }: { node: Node; angle: number; counter: string; size: "sm" | "lg" }) {
  return (
    <div className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
        <div style={{ transform: `rotate(${-angle}deg)` }}>
          <div className={cn("flex items-center justify-center rounded-2xl glass text-fg shadow-xl shadow-black/40", counter, size === "lg" ? "size-14" : "size-10")}>
            <ServiceIcon name={node.icon} className={cn("text-accent", size === "lg" ? "size-6" : "size-4")} />
          </div>
        </div>
      </div>
    </div>
  );
}
