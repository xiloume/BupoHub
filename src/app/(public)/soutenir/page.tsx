import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Heart, Server, Shield, Sparkles } from "lucide-react";
import { getSettings } from "@/server/settings";
import { getCurrentUser } from "@/server/auth/session";
import { completeDonation } from "@/server/donations";
import { db } from "@/server/db";
import { features } from "@/lib/env";
import { Alert } from "@/components/ui/misc";
import { DonationForm } from "@/components/billing/donation-form";
import { formatMoney, formatRelative } from "@/lib/meta";

export const metadata: Metadata = { title: "Soutenir Bupo" };

export default async function SupportPage({ searchParams }: PageProps<"/soutenir">) {
  const [settings, user, sp] = await Promise.all([getSettings(), getCurrentUser(), searchParams]);
  if (!settings["donations.enabled"]) notFound();

  let completed = false;
  if (sp.status === "approved" && typeof sp.don === "string") {
    const d = await completeDonation(sp.don).catch(() => null);
    completed = d?.status === "COMPLETED";
  }

  const recent = await db.donation.findMany({
    where: { status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    take: 6,
    select: { id: true, amountCents: true, currency: true, isAnonymous: true, donorName: true, completedAt: true, message: true, user: { select: { username: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col items-center gap-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium text-accent"><Heart className="size-3.5" /> Soutenir Bupo</span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Un don, c&apos;est des serveurs qui tournent</h1>
        <p className="max-w-2xl text-lg text-fg-muted">BupoHub et ses services sont indépendants et sans publicité. Les dons sont volontaires, sans engagement, et ne conditionnent aucun accès.</p>
      </div>

      {completed ? <Alert variant="success" title="Merci infiniment !" className="mb-8">Votre don a bien été reçu. Il contribue directement au fonctionnement des services Bupo.</Alert> : null}
      {sp.status === "approved" && !completed ? <Alert variant="warning" className="mb-8">Le paiement est en cours de traitement. Si rien n&apos;apparaît, contactez un administrateur.</Alert> : null}
      {sp.status === "cancelled" ? <Alert variant="info" className="mb-8">Don annulé. Aucun montant n&apos;a été prélevé.</Alert> : null}

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <DonationForm amounts={settings["donations.suggestedAmounts"]} loggedIn={Boolean(user)} paymentsEnabled={features.paypal} />
        </div>
        <aside className="flex flex-col gap-6 lg:col-span-2">
          <ul className="card-surface flex flex-col gap-4 rounded-2xl p-6 text-sm">
            <li className="flex gap-3"><Server className="mt-0.5 size-4 shrink-0 text-accent" /><span><strong>Hébergement</strong> — serveurs, stockage et bande passante de Bupoflix & co.</span></li>
            <li className="flex gap-3"><Shield className="mt-0.5 size-4 shrink-0 text-accent" /><span><strong>Sécurité</strong> — noms de domaine, certificats, sauvegardes.</span></li>
            <li className="flex gap-3"><Sparkles className="mt-0.5 size-4 shrink-0 text-accent" /><span><strong>Évolution</strong> — nouveaux services et fonctionnalités.</span></li>
          </ul>
          {recent.length ? (
            <div className="card-surface rounded-2xl p-6">
              <p className="mb-3 text-sm font-semibold">Derniers soutiens</p>
              <ul className="flex flex-col gap-2.5 text-sm">
                {recent.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3">
                    <span className="truncate text-fg-muted">{d.isAnonymous ? "Anonyme" : d.user?.username || d.donorName || "Anonyme"}</span>
                    <span className="shrink-0 font-medium text-accent">{formatMoney(d.amountCents, d.currency)}</span>
                    <span className="shrink-0 text-xs text-fg-subtle">{d.completedAt ? formatRelative(d.completedAt) : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-xs text-fg-subtle">Paiement sécurisé via PayPal. Aucune donnée bancaire n&apos;est stockée par BupoHub. Un don n&apos;est ni un abonnement ni un achat.</p>
        </aside>
      </div>
    </div>
  );
}
