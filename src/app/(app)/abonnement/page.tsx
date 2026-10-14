import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { requireUserPage } from "@/server/auth/guards";
import { getSettings } from "@/server/settings";
import { getUserSubscription, listActivePlans, syncSubscription } from "@/server/subscriptions";
import { features } from "@/lib/env";
import { PageHeader, Alert } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubscribeButton, CancelSubscriptionButton } from "@/components/billing/subscription-buttons";
import { SUBSCRIPTION_STATUS_META, formatDate, formatMoney } from "@/lib/meta";

export const metadata: Metadata = { title: "Abonnement" };

export default async function SubscriptionPage({ searchParams }: PageProps<"/abonnement">) {
  const user = await requireUserPage();
  const settings = await getSettings();
  if (!settings["subscriptions.enabled"]) notFound();
  const sp = await searchParams;

  if (sp.status === "approved" && typeof sp.sub === "string") {
    await syncSubscription(sp.sub).catch(() => null);
  }

  const [plans, subscription] = await Promise.all([listActivePlans(), getUserSubscription(user.id)]);
  const active = subscription && (subscription.status === "ACTIVE" || subscription.status === "PAST_DUE");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Mon espace" title="Abonnement" description="Soutenez l'écosystème Bupo et accédez aux services premium." />
      {sp.status === "approved" ? <Alert variant="success">Merci ! Votre abonnement est en cours d&apos;activation.</Alert> : null}
      {sp.status === "cancelled" ? <Alert variant="warning">Le paiement a été annulé. Aucun montant n&apos;a été prélevé.</Alert> : null}
      {!features.paypal ? <Alert variant="info">Le paiement en ligne n&apos;est pas encore activé sur cette instance. Un administrateur peut attribuer un abonnement manuellement.</Alert> : null}

      {subscription ? (
        <Card className="accent-glow">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{subscription.plan.name}</CardTitle>
              <CardDescription>
                {formatMoney(subscription.plan.priceCents, subscription.plan.currency)} / {subscription.plan.interval === "MONTH" ? "mois" : "an"}
                {subscription.currentPeriodEnd ? ` · ${subscription.status === "CANCELED" ? "accès jusqu'au" : "renouvellement le"} ${formatDate(subscription.currentPeriodEnd, { dateStyle: "long" })}` : ""}
              </CardDescription>
            </div>
            <Badge variant={SUBSCRIPTION_STATUS_META[subscription.status].variant} dot>{SUBSCRIPTION_STATUS_META[subscription.status].label}</Badge>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-4">
            <p className="text-sm text-fg-muted">Source : {subscription.provider === "MANUAL" ? "attribué par un administrateur" : "PayPal"}</p>
            {active && subscription.provider === "PAYPAL" ? <CancelSubscriptionButton subscriptionId={subscription.id} /> : null}
          </CardContent>
        </Card>
      ) : null}

      {!active ? (
        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const feats = Array.isArray(p.features) ? (p.features as string[]) : [];
            return (
              <Card key={p.id} className="relative flex flex-col overflow-hidden">
                <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-accent-soft blur-3xl" />
                <CardHeader>
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent"><Sparkles className="size-3" /> {p.name}</span>
                  <p className="mt-3 text-4xl font-semibold tracking-tight">
                    {formatMoney(p.priceCents, p.currency)} <span className="text-base font-normal text-fg-muted">/ {p.interval === "MONTH" ? "mois" : "an"}</span>
                  </p>
                  {p.description ? <CardDescription className="mt-2">{p.description}</CardDescription> : null}
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  {feats.length ? (
                    <ul className="flex flex-col gap-2 text-sm">
                      {feats.map((f) => <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-accent" /> {f}</li>)}
                    </ul>
                  ) : null}
                  <div className="mt-auto"><SubscribeButton planId={p.id} disabled={!features.paypal || !p.paypalPlanId} /></div>
                </CardContent>
              </Card>
            );
          })}
          {plans.length === 0 ? <p className="text-fg-muted">Aucune offre disponible pour le moment.</p> : null}
        </section>
      ) : null}
      <p className="text-xs text-fg-subtle">Le paiement est traité par PayPal. BupoHub ne stocke aucune donnée bancaire. Annulation possible à tout moment.</p>
    </div>
  );
}
