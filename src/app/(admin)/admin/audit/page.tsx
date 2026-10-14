import type { Metadata } from "next";
import { Search } from "lucide-react";
import { requirePermissionPage } from "@/server/auth/guards";
import { db, type Prisma } from "@/server/db";
import { AUDIT_ACTION_LABELS } from "@/server/audit";
import { PageHeader, Pagination, EmptyState } from "@/components/ui/misc";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuditRow } from "@/components/admin/audit-row";

export const metadata: Metadata = { title: "Journal d'audit" };

const PAGE_SIZE = 40;

export default async function AdminAuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requirePermissionPage("audit.read");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const action = typeof sp.action === "string" ? sp.action : "";
  const actorType = typeof sp.actorType === "string" ? sp.actorType : "";
  const from = typeof sp.from === "string" && sp.from ? new Date(sp.from) : undefined;
  const to = typeof sp.to === "string" && sp.to ? new Date(`${sp.to}T23:59:59`) : undefined;
  const page = Number(sp.page ?? 1) || 1;

  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action: action.endsWith(".") ? { startsWith: action } : action } : {}),
    ...(actorType ? { actorType: actorType as "USER" | "BOT" | "SYSTEM" } : {}),
    ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
    ...(q
      ? { OR: [{ actorLabel: { contains: q } }, { targetLabel: { contains: q } }, { targetId: { contains: q } }, { actor: { username: { contains: q } } }, { ip: { contains: q } }] }
      : {}),
  };
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({ where, include: { actor: { select: { username: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.auditLog.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, action, actorType, from: sp.from, to: sp.to })) if (typeof v === "string" && v) params.set(k, v);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/audit${s ? `?${s}` : ""}`;
  };
  const categories = [...new Set(Object.keys(AUDIT_ACTION_LABELS).map((k) => k.split(".")[0]))];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Administration" title="Journal d'audit" description={`${total} événement${total > 1 ? "s" : ""} enregistré${total > 1 ? "s" : ""}.`} />
      <form className="card-surface grid gap-3 rounded-2xl p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <Input name="q" defaultValue={q} placeholder="Acteur, cible, IP…" className="pl-9" />
        </div>
        <Select name="action" defaultValue={action}>
          <option value="">Toutes les actions</option>
          {categories.map((c) => (
            <optgroup key={c} label={c}>
              <option value={`${c}.`}>Tout « {c} »</option>
              {Object.entries(AUDIT_ACTION_LABELS).filter(([k]) => k.startsWith(`${c}.`)).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </optgroup>
          ))}
        </Select>
        <Select name="actorType" defaultValue={actorType}>
          <option value="">Tout acteur</option>
          <option value="USER">Utilisateurs</option>
          <option value="BOT">Bot</option>
          <option value="SYSTEM">Système</option>
        </Select>
        <Input name="from" type="date" defaultValue={typeof sp.from === "string" ? sp.from : ""} />
        <div className="flex gap-2">
          <Input name="to" type="date" defaultValue={typeof sp.to === "string" ? sp.to : ""} />
          <Button type="submit" variant="secondary">Filtrer</Button>
        </div>
      </form>
      {logs.length === 0 ? (
        <EmptyState title="Aucun événement" description="Aucun résultat pour ces filtres." />
      ) : (
        <div className="card-surface divide-y divide-border rounded-2xl">
          {logs.map((log) => <AuditRow key={log.id} log={log} />)}
        </div>
      )}
      <Pagination page={page} pages={pages} hrefFor={hrefFor} />
    </div>
  );
}
