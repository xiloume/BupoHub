import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermissionPage } from "@/server/auth/guards";
import { getUserDetail } from "@/server/users";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserDetail } from "@/components/admin/users/user-detail";
import { USER_STATUS_META, formatDate } from "@/lib/meta";

export const metadata: Metadata = { title: "Utilisateur" };

export default async function AdminUserPage({ params }: PageProps<"/admin/utilisateurs/[id]">) {
  const actor = await requirePermissionPage("users.read");
  const { id } = await params;
  const [user, roles, services, plans, settings] = await Promise.all([
    getUserDetail(id),
    db.role.findMany({ orderBy: { priority: "desc" } }),
    db.service.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, visibility: true, requiresSubscription: true, icon: true } }),
    db.subscriptionPlan.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, isActive: true, visibility: true } }),
    getSettings(),
  ]);
  if (!user) notFound();
  const st = USER_STATUS_META[user.status];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/utilisateurs" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Utilisateurs
      </Link>
      <div className="card-surface flex flex-col gap-5 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar src={user.avatarUrl} name={user.displayName || user.username} size="xl" />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{user.displayName || user.username}</h1>
            <p className="text-sm text-fg-muted">@{user.username} · {user.email}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge variant="accent">{user.role.name}</Badge>
              <Badge variant={st.variant} dot>{st.label}</Badge>
              {user.discordAccount ? <Badge variant="violet">Discord : @{user.discordAccount.username}</Badge> : null}
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-fg-subtle sm:text-right">
          <dt>Inscrit le</dt><dd className="text-fg-muted">{formatDate(user.createdAt, { dateStyle: "medium" })}</dd>
          <dt>Dernière connexion</dt><dd className="text-fg-muted">{formatDate(user.lastLoginAt)}</dd>
          <dt>Dernière IP</dt><dd className="font-mono text-fg-muted">{user.lastLoginIp ?? "—"}</dd>
          <dt>ID</dt><dd className="font-mono text-fg-muted">{user.id}</dd>
        </dl>
      </div>

      <UserDetail
        user={{
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          status: user.status,
          roleId: user.roleId,
          discord: user.discordAccount ? { username: user.discordAccount.username, discordUserId: user.discordAccount.discordUserId, linkedAt: user.discordAccount.linkedAt } : null,
          subscriptions: user.subscriptions.map((s) => ({ id: s.id, status: s.status, planName: s.plan.name, provider: s.provider, currentPeriodEnd: s.currentPeriodEnd, createdAt: s.createdAt })),
          grantedServiceIds: user.userServices.map((us) => us.serviceId),
          grantedPlanIds: user.planAccesses.map((pa) => pa.planId),
          sessions: user.sessions.map((s) => ({ id: s.id, ip: s.ip, userAgent: s.userAgent, lastActiveAt: s.lastActiveAt })),
          loginHistory: user.loginHistory.map((h) => ({ id: h.id, ip: h.ip, success: h.success, reason: h.reason, createdAt: h.createdAt })),
        }}
        roles={roles}
        services={services}
        plans={plans}
        isSelf={actor.id === user.id}
        can={{
          write: actor.permissions.has("users.write"),
          roles: actor.permissions.has("users.roles"),
          suspend: actor.permissions.has("users.suspend"),
          delete: actor.permissions.has("users.delete"),
          services: actor.permissions.has("services.access"),
          subscriptions: actor.permissions.has("subscriptions.manage") && settings["subscriptions.enabled"],
          discord: actor.permissions.has("discord.manage"),
        }}
      />
      {user.status === "DELETED" ? (
        <Button asChild variant="ghost"><Link href="/admin/utilisateurs">Retour</Link></Button>
      ) : null}
    </div>
  );
}
