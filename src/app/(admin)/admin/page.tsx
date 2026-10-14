import type { Metadata } from "next";
import Link from "next/link";
import { Users, UserCheck, UserPlus, LayoutGrid, UserX, CreditCard, Heart, Mail, MessageCircle, ArrowRight } from "lucide-react";
import { requirePermissionPage } from "@/server/auth/guards";
import { getAdminStats } from "@/server/admin/stats";
import { PageHeader, Stat } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuditRow } from "@/components/admin/audit-row";
import { formatMoney, formatRelative } from "@/lib/meta";
import { SignupsChart } from "@/components/admin/signups-chart";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminHomePage() {
  await requirePermissionPage("admin.access", "admin.stats");
  const s = await getAdminStats();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Administration" title="Vue générale" description="L'état de la plateforme BupoHub en un coup d'œil." />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Utilisateurs" value={s.totalUsers} icon={<Users />} hint={`${s.suspended} suspendu${s.suspended > 1 ? "s" : ""}`} />
        <Stat label="Actifs (30 j)" value={s.activeUsers} icon={<UserCheck />} hint="Connectés ces 30 derniers jours" />
        <Stat label="Nouveaux (7 j)" value={s.newUsers7} icon={<UserPlus />} trend={{ value: s.newUsers30, label: "sur 30 j" }} />
        <Stat label="Services actifs" value={`${s.servicesActive}/${s.servicesTotal}`} icon={<LayoutGrid />} />
        <Stat label="Comptes suspendus" value={s.suspended} icon={<UserX />} />
        <Stat label="Invitations en attente" value={s.pendingInvites} icon={<Mail />} />
        <Stat label="Comptes Discord liés" value={s.discordLinked} icon={<MessageCircle />} />
        {s.subscriptionsEnabled ? (
          <Stat label="Abonnements actifs" value={s.activeSubs} icon={<CreditCard />} hint={`Revenu mensuel estimé : ${formatMoney(s.mrrCents)}`} />
        ) : (
          <Stat label="Abonnements" value="Désactivés" icon={<CreditCard />} hint="Activables dans Paramètres" />
        )}
        {s.donationsEnabled ? (
          <Stat label="Donations (30 j)" value={formatMoney(s.donationsCents30)} icon={<Heart />} hint={`${s.donationsCount30} don${s.donationsCount30 > 1 ? "s" : ""}`} />
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Inscriptions sur 30 jours</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <SignupsChart data={s.signups} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Derniers inscrits</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/admin/utilisateurs">Tout voir <ArrowRight /></Link></Button>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border pt-4">
            {s.recentUsers.map((u) => (
              <Link key={u.id} href={`/admin/utilisateurs/${u.id}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-90">
                <Avatar src={u.avatarUrl} name={u.username} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.username}</p>
                  <p className="truncate text-xs text-fg-subtle">{u.email}</p>
                </div>
                <Badge variant="muted">{u.role.name}</Badge>
                <span className="text-xs text-fg-subtle">{formatRelative(u.createdAt)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Activité récente</CardTitle>
          <Button asChild variant="ghost" size="sm"><Link href="/admin/audit">Journal complet <ArrowRight /></Link></Button>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border pt-4">
          {s.recentAudit.length === 0 ? <p className="py-6 text-center text-sm text-fg-subtle">Aucune activité.</p> : null}
          {s.recentAudit.map((log) => (
            <AuditRow key={log.id} log={log} compact />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
