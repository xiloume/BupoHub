import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Bell, Clock, CreditCard, LayoutGrid, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { requireUserPage } from "@/server/auth/guards";
import { getSettings } from "@/server/settings";
import { listServicesForUser } from "@/server/services";
import { listNotifications } from "@/server/notifications";
import { getUserSubscription } from "@/server/subscriptions";
import { db } from "@/server/db";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/misc";
import { ServiceCard } from "@/components/services/service-card";
import { NotificationIcon } from "@/components/notifications/notification-icon";
import { formatDate, formatRelative, SUBSCRIPTION_STATUS_META } from "@/lib/meta";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUserPage();
  const [t, settings, services, notifications, subscription, sp, lastLogin] = await Promise.all([
    getTranslations("dashboard"),
    getSettings(),
    listServicesForUser(user.id),
    listNotifications(user.id, user.createdAt, { limit: 5 }),
    getUserSubscription(user.id),
    searchParams,
    db.loginHistory.findFirst({ where: { userId: user.id, success: true }, orderBy: { createdAt: "desc" }, skip: 1 }),
  ]);
  const name = user.displayName || user.username;
  const subsEnabled = settings["subscriptions.enabled"];
  const accessible = services.filter((s) => s.hasAccess);
  const locked = services.filter((s) => !s.hasAccess);

  return (
    <div className="flex flex-col gap-8">
      {sp.welcome === "1" ? (
        <Alert variant="success" title="Bienvenue sur BupoHub !">Votre compte est prêt. Explorez vos services ci-dessous.</Alert>
      ) : null}
      {sp.error === "forbidden" ? <Alert variant="danger">Vous n&apos;avez pas accès à cette section.</Alert> : null}

      {/* En-tête */}
      <section className="card-surface relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-accent-soft blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar src={user.avatarUrl} name={name} size="xl" className="ring-4 ring-accent/20" />
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("greeting", { name })}</h1>
              <p className="inline-flex items-center gap-2 text-sm text-fg-muted">
                <Clock className="size-3.5" /> {t("lastLogin")} : {lastLogin ? formatRelative(lastLogin.createdAt) : "première connexion"}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge variant="accent">{user.role.name}</Badge>
                {subsEnabled && subscription ? (
                  <Badge variant={SUBSCRIPTION_STATUS_META[subscription.status].variant} dot>
                    {subscription.plan.name} · {SUBSCRIPTION_STATUS_META[subscription.status].label}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href="/profil">Gérer mon profil</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Mes services */}
      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{t("myServices")}</h2>
            <p className="text-sm text-fg-muted">{accessible.length} service{accessible.length > 1 ? "s" : ""} accessible{accessible.length > 1 ? "s" : ""}</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/services">Tout voir <ArrowRight /></Link>
          </Button>
        </div>
        {services.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[...accessible, ...locked].slice(0, 6).map((s) => (
              <ServiceCard key={s.id} service={s} variant="dashboard" />
            ))}
          </div>
        ) : (
          <EmptyState icon={<LayoutGrid />} title={t("noServices")} />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Notifications */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="inline-flex items-center gap-2"><Bell className="size-4 text-accent" /> {t("notifications")}</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/notifications">Tout voir</Link></Button>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border pt-4">
            {notifications.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-subtle">Aucune notification pour le moment.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <NotificationIcon type={n.type} className="mt-0.5 size-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className={n.read ? "text-sm text-fg-muted" : "text-sm font-medium"}>{n.title}</p>
                    {n.body ? <p className="line-clamp-1 text-xs text-fg-subtle">{n.body}</p> : null}
                  </div>
                  <span className="shrink-0 text-xs text-fg-subtle">{formatRelative(n.createdAt)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Compte */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-accent" /> {t("account")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-4 text-sm">
            <Row icon={<Mail />} label="Email" value={user.email} />
            <Row icon={<Sparkles />} label="Membre depuis" value={formatDate(user.createdAt, { dateStyle: "long" })} />
            <Row icon={<ShieldCheck />} label="Rôle" value={user.role.name} />
            {subsEnabled ? (
              <Row
                icon={<CreditCard />}
                label="Abonnement"
                value={subscription ? `${subscription.plan.name} (${SUBSCRIPTION_STATUS_META[subscription.status].label})` : "Aucun"}
              />
            ) : null}
            {subsEnabled && !subscription ? (
              <Button asChild size="sm" className="mt-2">
                <Link href="/abonnement">Découvrir Bupo+</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-fg-subtle [&_svg]:size-4">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-fg-subtle">{label}</p>
        <p className="truncate font-medium">{value}</p>
      </div>
    </div>
  );
}
