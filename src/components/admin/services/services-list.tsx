"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ExternalLink, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, StatusDot } from "@/components/ui/badge";
import { ServiceIcon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/misc";
import { reorderServicesAction } from "@/actions/admin";
import { SERVICE_STATUS_META } from "@/lib/meta";

type Row = {
  id: string;
  slug: string;
  name: string;
  description: string;
  url: string;
  icon: string | null;
  status: keyof typeof SERVICE_STATUS_META;
  visibility: "PUBLIC" | "PRIVATE";
  requiresSubscription: boolean;
  grants: number;
};

export function ServicesList({ services }: { services: Row[] }) {
  const [items, setItems] = React.useState(services);
  const [prevServices, setPrevServices] = React.useState(services);
  const [pending, start] = React.useTransition();
  if (services !== prevServices) {
    setPrevServices(services);
    setItems(services);
  }

  const move = (index: number, dir: -1 | 1) => {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    start(async () => {
      const r = await reorderServicesAction(next.map((s) => s.id));
      if (r.error) toast.error(r.error);
    });
  };

  if (!items.length) {
    return <EmptyState title="Aucun service" description="Ajoutez votre premier service pour l'afficher sur la page d'accueil." action={<Button asChild><Link href="/admin/services/nouveau">Nouveau service</Link></Button>} />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((s, i) => {
        const st = SERVICE_STATUS_META[s.status];
        return (
          <li key={s.id} className="card-surface flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-1">
              <Button variant="ghost" size="icon-sm" disabled={i === 0 || pending} onClick={() => move(i, -1)} aria-label="Monter"><ArrowUp /></Button>
              <Button variant="ghost" size="icon-sm" disabled={i === items.length - 1 || pending} onClick={() => move(i, 1)} aria-label="Descendre"><ArrowDown /></Button>
            </div>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border-strong bg-bg-elevated text-accent">
              <ServiceIcon name={s.icon} className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{s.name}</p>
                <span className={`inline-flex items-center gap-1.5 text-xs ${st.color}`}><StatusDot className={st.dot} /> {st.label}</span>
                <Badge variant={s.visibility === "PUBLIC" ? "muted" : "info"}>{s.visibility === "PUBLIC" ? "Public" : "Privé"}</Badge>
                {s.requiresSubscription ? <Badge variant="accent">Abonnés</Badge> : null}
                {s.grants ? <Badge variant="muted">{s.grants} accès</Badge> : null}
              </div>
              <p className="mt-0.5 line-clamp-1 text-sm text-fg-muted">{s.description}</p>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs text-fg-subtle hover:text-accent">
                {s.url} <ExternalLink className="size-3" />
              </a>
            </div>
            <Button asChild variant="secondary" size="sm"><Link href={`/admin/services/${s.id}`}><Pencil /> Modifier</Link></Button>
          </li>
        );
      })}
    </ul>
  );
}
