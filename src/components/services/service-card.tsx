import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceIcon } from "@/components/ui/icon";
import { StatusDot } from "@/components/ui/badge";
import { SERVICE_STATUS_META } from "@/lib/meta";
import { cn } from "@/lib/utils";

export type ServiceCardData = {
  id: string;
  slug: string;
  name: string;
  description: string;
  url: string;
  icon: string | null;
  imageUrl: string | null;
  status: keyof typeof SERVICE_STATUS_META;
  ctaLabel: string | null;
  requiresSubscription?: boolean;
  hasAccess?: boolean;
  integration?: string;
};

export function ServiceCard({
  service,
  variant = "marketing",
  className,
}: {
  service: ServiceCardData;
  variant?: "marketing" | "dashboard";
  className?: string;
}) {
  const status = SERVICE_STATUS_META[service.status] ?? SERVICE_STATUS_META.ONLINE;
  const locked = variant === "dashboard" && service.hasAccess === false;
  const unavailable = service.status === "OFFLINE";
  const cta = service.ctaLabel || (variant === "dashboard" ? `Accéder à ${service.name}` : `Ouvrir ${service.name}`);
  const integrated = variant === "dashboard" && service.integration && service.integration !== "NONE";
  const href = integrated ? `/api/services/${service.id}/connect` : service.url;

  return (
    <article
      className={cn(
        "card-surface group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-border-strong",
        className,
      )}
    >
      {service.imageUrl ? (
        <div className="relative h-36 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={service.imageUrl} alt="" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
        </div>
      ) : (
        <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-accent-soft blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-60" />
      )}
      <div className="relative flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl border border-border-strong bg-bg-elevated text-accent shadow-inner shadow-black/30">
            <ServiceIcon name={service.icon} className="size-6" />
          </div>
          <span className={cn("inline-flex items-center gap-2 rounded-full border border-border bg-bg-elevated/60 px-2.5 py-1 text-xs font-medium", status.color)}>
            <StatusDot className={status.dot} pulse={service.status === "ONLINE"} />
            {status.label}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-lg font-semibold tracking-tight">{service.name}</h3>
          <p className="line-clamp-3 text-sm leading-relaxed text-fg-muted">{service.description}</p>
        </div>
        <div className="mt-auto pt-2">
          {locked ? (
            <Button variant="secondary" className="w-full" asChild>
              <Link href={service.requiresSubscription ? "/abonnement" : "/dashboard"}>
                <Lock /> {service.requiresSubscription ? "Réservé aux abonnés" : "Accès sur demande"}
              </Link>
            </Button>
          ) : (
            <Button
              variant={variant === "dashboard" ? "primary" : "secondary"}
              className="w-full"
              asChild
              disabled={unavailable}
            >
              <a href={href} target="_blank" rel="noopener noreferrer" aria-disabled={unavailable}>
                {cta} <ArrowUpRight />
              </a>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
