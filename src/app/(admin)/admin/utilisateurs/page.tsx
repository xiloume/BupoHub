import type { Metadata } from "next";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { requirePermissionPage } from "@/server/auth/guards";
import { listUsers } from "@/server/users";
import { db } from "@/server/db";
import { PageHeader, Pagination, EmptyState, Alert } from "@/components/ui/misc";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CreateUserDialog } from "@/components/admin/users/create-user-dialog";
import { USER_STATUS_META, formatRelative } from "@/lib/meta";

export const metadata: Metadata = { title: "Utilisateurs" };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/utilisateurs">) {
  const actor = await requirePermissionPage("users.read");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const role = typeof sp.role === "string" ? sp.role : "ALL";
  const status = (typeof sp.status === "string" ? sp.status : "ALL") as "ALL" | "ACTIVE" | "SUSPENDED" | "DELETED";
  const page = Number(sp.page ?? 1) || 1;

  const [result, roles] = await Promise.all([
    listUsers({ q, role, status, page }),
    db.role.findMany({ orderBy: { priority: "desc" } }),
  ]);

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role !== "ALL") params.set("role", role);
    if (status !== "ALL") params.set("status", status);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/utilisateurs${s ? `?${s}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Administration"
        title="Utilisateurs"
        description={`${result.total} compte${result.total > 1 ? "s" : ""}`}
        actions={actor.permissions.has("users.write") ? <CreateUserDialog roles={roles} trigger={<Button><UserPlus /> Nouvel utilisateur</Button>} /> : null}
      />
      {sp.deleted === "1" ? <Alert variant="success">Compte supprimé.</Alert> : null}

      <form className="card-surface flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <Input name="q" defaultValue={q} placeholder="Rechercher par email, nom d'utilisateur…" className="pl-9" />
        </div>
        <Select name="role" defaultValue={role} className="sm:w-44">
          <option value="ALL">Tous les rôles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.slug}>{r.name}</option>
          ))}
        </Select>
        <Select name="status" defaultValue={status} className="sm:w-44">
          <option value="ALL">Actifs & suspendus</option>
          <option value="ACTIVE">Actifs</option>
          <option value="SUSPENDED">Suspendus</option>
          <option value="DELETED">Supprimés</option>
        </Select>
        <Button type="submit" variant="secondary">Filtrer</Button>
      </form>

      {result.items.length === 0 ? (
        <EmptyState title="Aucun utilisateur" description="Aucun résultat pour ces critères." />
      ) : (
        <>
          {/* Table desktop */}
          <div className="card-surface hidden overflow-hidden rounded-2xl md:block">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated/60 text-left text-xs uppercase tracking-wider text-fg-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">Utilisateur</th>
                  <th className="px-4 py-3 font-medium">Rôle</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Abonnement</th>
                  <th className="px-4 py-3 font-medium">Discord</th>
                  <th className="px-4 py-3 font-medium">Dernière connexion</th>
                  <th className="px-4 py-3 font-medium">Inscrit</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.items.map((u) => {
                  const st = USER_STATUS_META[u.status];
                  return (
                    <tr key={u.id} className="transition-colors hover:bg-white/3">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={u.avatarUrl} name={u.displayName || u.username} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{u.displayName || u.username}</p>
                            <p className="truncate text-xs text-fg-subtle">@{u.username} · {u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge variant={u.role.slug === "admin" ? "accent" : u.role.slug === "moderator" ? "info" : "muted"}>{u.role.name}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={st.variant} dot>{st.label}</Badge></td>
                      <td className="px-4 py-3">{u.subscriptions.length ? <Badge variant="success">Actif</Badge> : <span className="text-fg-subtle">—</span>}</td>
                      <td className="px-4 py-3 text-fg-muted">{u.discordAccount ? `@${u.discordAccount.username}` : <span className="text-fg-subtle">—</span>}</td>
                      <td className="px-4 py-3 text-fg-muted">{u.lastLoginAt ? formatRelative(u.lastLoginAt) : "Jamais"}</td>
                      <td className="px-4 py-3 text-fg-muted">{formatRelative(u.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild variant="ghost" size="sm"><Link href={`/admin/utilisateurs/${u.id}`}>Gérer</Link></Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Cartes mobile */}
          <ul className="flex flex-col gap-3 md:hidden">
            {result.items.map((u) => {
              const st = USER_STATUS_META[u.status];
              return (
                <li key={u.id}>
                  <Link href={`/admin/utilisateurs/${u.id}`} className="card-surface flex items-center gap-3 rounded-2xl p-4">
                    <Avatar src={u.avatarUrl} name={u.displayName || u.username} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{u.displayName || u.username}</p>
                      <p className="truncate text-xs text-fg-subtle">{u.email}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge variant="muted">{u.role.name}</Badge>
                        <Badge variant={st.variant} dot>{st.label}</Badge>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Pagination page={result.page} pages={result.pages} hrefFor={hrefFor} />
        </>
      )}
    </div>
  );
}
