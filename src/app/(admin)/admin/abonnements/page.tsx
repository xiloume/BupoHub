import type { Metadata } from "next";
import Link from "next/link";
import { requirePermissionPage } from "@/server/auth/guards";
import { listAllPlans, listSubscriptions } from "@/server/subscriptions";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";
import { features } from "@/lib/env";
import { PageHeader, Alert, Pagination, Stat } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlansManager } from "@/components/admin/plans-manager";
import { SUBSCRIPTION_STATUS_META, formatDate, formatMoney } from "@/lib/meta";

export const metadata: Metadata = { title: "Abonnements" };

export default async function AdminSubscriptionsPage({ searchParams }: PageProps<"/admin/abonnements">) {
  await requirePermissionPage("subscriptions.manage");
  const sp = await searchParams;
  const status = (typeof sp.status === "string" ? sp.status : "ALL") as "ALL" | keyof typeof SUBSCRIPTION_STATUS_META;
  const page = Number(sp.page ?? 1) || 1;
  const [plans, subs, settings, services] = await Promise.all([
    listAllPlans(),
    listSubscriptions({ status, page }),
    getSettings(),
    db.service.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, visibility: true, requiresSubscription: true } }),
  ]);
  const enabled = settings["subscriptions.enabled"];
  const active = plans.reduce((s, p) => s + p._count.subscriptions, 0);
  const mrr = plans.reduce((s, p) => s + p._count.subscriptions * (p.interval === "YEAR" ? Math.round(p.priceCents / 12) : p.priceCents), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Administration"
        title="Abonnements"
        description="Plans, abonnés et état du système d'abonnement."
        actions={<Button asChild variant="secondary"><Link href="/admin/parametres">{enabled ? "Désactiver" : "Activer"} dans les paramètres</Link></Button>}
      />
      {!enabled ? <Alert variant="info" title="Système désactivé">Les utilisateurs ne voient aucune offre et aucun paiement n&apos;est demandé. Les plans ci-dessous restent modifiables.</Alert> : null}
      {enabled && !features.paypal ? <Alert variant="warning">PayPal n&apos;est pas configuré : seules les attributions manuelles fonctionnent.</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Abonnements actifs" value={active} />
        <Stat label="Revenu mensuel estimé" value={formatMoney(mrr)} hint="Somme des plans actifs (annuels ramenés au mois)" />
        <Stat label="Plans" value={plans.length} hint={`${plans.filter((p) => p.isActive).length} actif${plans.filter((p) => p.isActive).length > 1 ? "s" : ""}`} />
      </div>

      <PlansManager
        services={services}
        plans={plans.map((p) => ({ id: p.id, slug: p.slug, name: p.name, description: p.description, priceCents: p.priceCents, currency: p.currency, interval: p.interval, paypalPlanId: p.paypalPlanId, isActive: p.isActive, visibility: p.visibility, features: Array.isArray(p.features) ? (p.features as string[]) : [], serviceIds: p.planServices.map((ps) => ps.serviceId), sortOrder: p.sortOrder, count: p._count.subscriptions }))}
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle>Abonnés ({subs.total})</CardTitle>
          <form className="flex gap-2">
            <Select name="status" defaultValue={status} className="w-44">
              <option value="ALL">Tous</option>
              {Object.entries(SUBSCRIPTION_STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </Select>
            <Button type="submit" variant="secondary" size="md">Filtrer</Button>
          </form>
        </CardHeader>
        <CardContent className="pt-4">
          {subs.items.length === 0 ? <p className="py-6 text-center text-sm text-fg-subtle">Aucun abonnement.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-fg-subtle">
                  <tr className="border-b border-border">
                    <th className="pb-2 pr-4 font-medium">Utilisateur</th>
                    <th className="pb-2 pr-4 font-medium">Plan</th>
                    <th className="pb-2 pr-4 font-medium">Statut</th>
                    <th className="pb-2 pr-4 font-medium">Source</th>
                    <th className="pb-2 pr-4 font-medium">Période</th>
                    <th className="pb-2 font-medium">Créé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subs.items.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2.5 pr-4"><Link href={`/admin/utilisateurs/${s.user.id}`} className="font-medium hover:text-accent">{s.user.username}</Link><p className="text-xs text-fg-subtle">{s.user.email}</p></td>
                      <td className="py-2.5 pr-4">{s.plan.name}</td>
                      <td className="py-2.5 pr-4"><Badge variant={SUBSCRIPTION_STATUS_META[s.status].variant} dot>{SUBSCRIPTION_STATUS_META[s.status].label}</Badge></td>
                      <td className="py-2.5 pr-4 text-fg-muted">{s.provider}</td>
                      <td className="py-2.5 pr-4 text-fg-muted whitespace-nowrap">{s.currentPeriodEnd ? `→ ${formatDate(s.currentPeriodEnd, { dateStyle: "medium" })}` : "—"}</td>
                      <td className="py-2.5 text-fg-muted whitespace-nowrap">{formatDate(s.createdAt, { dateStyle: "medium" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4"><Pagination page={subs.page} pages={subs.pages} hrefFor={(p) => `/admin/abonnements?status=${status}&page=${p}`} /></div>
        </CardContent>
      </Card>
    </div>
  );
}
