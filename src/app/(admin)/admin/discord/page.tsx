import type { Metadata } from "next";
import Link from "next/link";
import { requirePermissionPage } from "@/server/auth/guards";
import { listDiscordAccounts } from "@/server/discord";
import { listApiKeys } from "@/server/api-keys";
import { features, env } from "@/lib/env";
import { PageHeader, Alert } from "@/components/ui/misc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiKeysManager } from "@/components/admin/api-keys-manager";
import { formatDate, formatRelative } from "@/lib/meta";

export const metadata: Metadata = { title: "Discord & API" };

export default async function AdminDiscordPage() {
  await requirePermissionPage("discord.manage");
  const [accounts, keys] = await Promise.all([listDiscordAccounts(), listApiKeys()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Administration" title="Discord & API" description="Liaisons de comptes Discord et clés d'accès pour le bot Bupo." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Alert variant={features.discordOAuth ? "success" : "info"} title="Liaison en libre-service (OAuth2)">
          {features.discordOAuth ? <>Active. URL de redirection à déclarer sur Discord : <code className="break-all text-xs">{env.APP_URL}/api/v1/discord/callback</code></> : "Renseignez DISCORD_CLIENT_ID et DISCORD_CLIENT_SECRET pour permettre aux utilisateurs de lier leur compte eux-mêmes."}
        </Alert>
        <Alert variant={features.discordBot ? "success" : "info"} title="Bot Discord">
          {features.discordBot ? "Token configuré : les profils Discord sont récupérés automatiquement lors d'une liaison manuelle." : "Renseignez DISCORD_BOT_TOKEN pour enrichir automatiquement les liaisons manuelles."}
        </Alert>
      </div>

      <ApiKeysManager keys={keys.map((k) => ({ id: k.id, name: k.name, prefix: k.keyPrefix, scopes: k.scopes as string[], createdBy: k.createdBy.username, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt, revokedAt: k.revokedAt }))} apiUrl={`${env.APP_URL}/api/v1/bot`} />

      <Card>
        <CardHeader>
          <CardTitle>Comptes Discord liés ({accounts.length})</CardTitle>
          <CardDescription>Pour lier manuellement un compte, ouvrez la fiche de l&apos;utilisateur.</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {accounts.length === 0 ? <p className="py-6 text-center text-sm text-fg-subtle">Aucun compte lié.</p> : (
            <ul className="flex flex-col divide-y divide-border">
              {accounts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <Link href={`/admin/utilisateurs/${a.user.id}`} className="font-medium hover:text-accent">{a.user.username}</Link>
                  <span className="text-fg-muted">↔ @{a.username}{a.globalName ? ` (${a.globalName})` : ""}</span>
                  <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-fg-subtle">{a.discordUserId}</code>
                  <Badge variant="muted">{a.linkedBy === "USER" ? "par l'utilisateur" : a.linkedBy === "ADMIN" ? "par un admin" : "par le bot"}</Badge>
                  <span className="ml-auto text-xs text-fg-subtle">{formatDate(a.linkedAt, { dateStyle: "medium" })}{a.lastSyncAt ? ` · sync ${formatRelative(a.lastSyncAt)}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
