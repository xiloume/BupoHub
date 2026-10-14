import type { Metadata } from "next";
import Link from "next/link";
import { requirePermissionPage } from "@/server/auth/guards";
import { listDonations } from "@/server/donations";
import { getSettings } from "@/server/settings";
import { PageHeader, Alert, Pagination, Stat } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DONATION_STATUS_META, formatDate, formatMoney } from "@/lib/meta";

export const metadata: Metadata = { title: "Donations" };

export default async function AdminDonationsPage({ searchParams }: PageProps<"/admin/donations">) {
  await requirePermissionPage("donations.read");
  const sp = await searchParams;
  const page = Number(sp.page ?? 1) || 1;
  const [data, settings] = await Promise.all([listDonations({ page }), getSettings()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Administration" title="Donations" description="Les dons sont volontaires et indépendants des abonnements." />
      {!settings["donations.enabled"] ? <Alert variant="info">Les donations sont désactivées : la section « Soutenir Bupo » n&apos;est pas affichée.</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total reçu" value={formatMoney(data.totalCents)} />
        <Stat label="Dons reçus" value={data.completedCount} />
        <Stat label="Tentatives" value={data.total} hint="Toutes les donations, y compris en attente ou échouées" />
      </div>
      <Card>
        <CardContent>
          {data.items.length === 0 ? <p className="py-6 text-center text-sm text-fg-subtle">Aucune donation.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-fg-subtle">
                  <tr className="border-b border-border">
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 pr-4 font-medium">Montant</th>
                    <th className="pb-2 pr-4 font-medium">Donateur</th>
                    <th className="pb-2 pr-4 font-medium">Statut</th>
                    <th className="pb-2 font-medium">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.items.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-fg-muted">{formatDate(d.createdAt)}</td>
                      <td className="py-2.5 pr-4 font-medium tabular-nums">{formatMoney(d.amountCents, d.currency)}</td>
                      <td className="py-2.5 pr-4">
                        {d.user ? <Link href={`/admin/utilisateurs/${d.user.id}`} className="hover:text-accent">{d.user.username}</Link> : d.donorName || <span className="text-fg-subtle">Anonyme</span>}
                        {d.isAnonymous ? <Badge variant="muted" className="ml-2">anonyme public</Badge> : null}
                      </td>
                      <td className="py-2.5 pr-4"><Badge variant={DONATION_STATUS_META[d.status].variant} dot>{DONATION_STATUS_META[d.status].label}</Badge></td>
                      <td className="max-w-xs truncate py-2.5 text-fg-muted">{d.message ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4"><Pagination page={data.page} pages={data.pages} hrefFor={(p) => `/admin/donations?page=${p}`} /></div>
        </CardContent>
      </Card>
    </div>
  );
}
