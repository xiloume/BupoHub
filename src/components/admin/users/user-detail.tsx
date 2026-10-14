"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { Ban, Check, Copy, KeyRound, LogOut, MessageCircle, Trash2, Undo2, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Switch, Alert } from "@/components/ui/misc";
import { FormError, SubmitButton, useActionToast } from "@/components/ui/form";
import { ServiceIcon } from "@/components/ui/icon";
import {
  adminCancelSubscriptionAction,
  adminLinkDiscordAction,
  adminUnlinkDiscordAction,
  deleteUserAction,
  grantSubscriptionAction,
  resetPasswordLinkAction,
  revokeUserSessionsAction,
  setServiceAccessAction,
  setUserStatusAction,
  updateUserAction,
} from "@/actions/admin";
import { SUBSCRIPTION_STATUS_META, formatDate, formatRelative } from "@/lib/meta";
import { initialActionState, type ActionState } from "@/lib/utils";

type Props = {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    status: "ACTIVE" | "SUSPENDED" | "DELETED";
    roleId: string;
    discord: { username: string; discordUserId: string; linkedAt: Date } | null;
    subscriptions: { id: string; status: keyof typeof SUBSCRIPTION_STATUS_META; planName: string; provider: string; currentPeriodEnd: Date | null; createdAt: Date }[];
    grantedServiceIds: string[];
    sessions: { id: string; ip: string | null; userAgent: string | null; lastActiveAt: Date }[];
    loginHistory: { id: string; ip: string | null; success: boolean; reason: string | null; createdAt: Date }[];
  };
  roles: { id: string; slug: string; name: string }[];
  services: { id: string; name: string; visibility: "PUBLIC" | "PRIVATE"; requiresSubscription: boolean; icon: string | null }[];
  plans: { id: string; name: string }[];
  isSelf: boolean;
  can: { write: boolean; roles: boolean; suspend: boolean; delete: boolean; services: boolean; subscriptions: boolean; discord: boolean };
};

function report(r: ActionState) {
  if (r.ok) toast.success(r.message ?? "OK");
  else if (r.error) toast.error(r.error);
}

export function UserDetail({ user, roles, services, plans, isSelf, can }: Props) {
  const deleted = user.status === "DELETED";
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        {!deleted && can.write ? <EditForm user={user} roles={roles} canRoles={can.roles && !isSelf} /> : null}
        {can.services ? <ServicesCard user={user} services={services} /> : null}
        {can.subscriptions ? <SubscriptionsCard user={user} plans={plans} /> : null}
        <HistoryCard user={user} />
      </div>
      <div className="flex flex-col gap-6">
        {!deleted ? <ActionsCard user={user} isSelf={isSelf} can={can} /> : null}
        {can.discord && !deleted ? <DiscordCard user={user} /> : null}
      </div>
    </div>
  );
}

function EditForm({ user, roles, canRoles }: { user: Props["user"]; roles: Props["roles"]; canRoles: boolean }) {
  const [state, action] = useActionState(updateUserAction.bind(null, user.id), initialActionState);
  useActionToast(state);
  const fe = state.fieldErrors ?? {};
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <FormError state={state} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom d'utilisateur" htmlFor="username" error={fe.username}><Input id="username" name="username" defaultValue={user.username} required /></Field>
            <Field label="Nom affiché" htmlFor="displayName" error={fe.displayName}><Input id="displayName" name="displayName" defaultValue={user.displayName ?? ""} /></Field>
          </div>
          <Field label="Email" htmlFor="email" error={fe.email}><Input id="email" name="email" type="email" defaultValue={user.email} required /></Field>
          <Field label="Rôle" htmlFor="roleId" error={fe.roleId} hint={!canRoles ? "Vous ne pouvez pas modifier ce rôle." : undefined}>
            <Select id="roleId" name="roleId" defaultValue={user.roleId} disabled={!canRoles}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
            {!canRoles ? <input type="hidden" name="roleId" value={user.roleId} /> : null}
          </Field>
          <div className="flex justify-end"><SubmitButton>Enregistrer</SubmitButton></div>
        </form>
      </CardContent>
    </Card>
  );
}

function ActionsCard({ user, isSelf, can }: { user: Props["user"]; isSelf: boolean; can: Props["can"] }) {
  const [pending, start] = React.useTransition();
  const [link, setLink] = React.useState<string | null>(null);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
        <CardDescription>{isSelf ? "Certaines actions sont désactivées sur votre propre compte." : "Actions sensibles : confirmations requises."}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {can.write ? (
          <>
            <Button variant="secondary" className="justify-start" loading={pending} onClick={() => start(async () => { const r = await resetPasswordLinkAction(user.id); report(r); if (r.ok && r.data) setLink(r.data.link); })}>
              <KeyRound /> Générer un lien de réinitialisation
            </Button>
            {link ? (
              <Alert variant="info" className="break-all text-xs">
                <div className="flex items-start gap-2">
                  <code className="flex-1">{link}</code>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(link); toast.success("Copié"); }} className="shrink-0 rounded p-1 hover:bg-white/10"><Copy className="size-3.5" /></button>
                </div>
              </Alert>
            ) : null}
            <ConfirmDialog
              trigger={<Button variant="secondary" className="justify-start"><LogOut /> Révoquer toutes les sessions</Button>}
              title="Révoquer les sessions ?"
              description="L'utilisateur sera déconnecté de tous ses appareils."
              confirmLabel="Révoquer"
              onConfirm={async () => report(await revokeUserSessionsAction(user.id))}
            />
          </>
        ) : null}
        {can.suspend && !isSelf ? (
          user.status === "SUSPENDED" ? (
            <Button variant="secondary" className="justify-start" loading={pending} onClick={() => start(async () => report(await setUserStatusAction(user.id, "ACTIVE")))}>
              <Undo2 /> Réactiver le compte
            </Button>
          ) : (
            <ConfirmDialog
              trigger={<Button variant="secondary" className="justify-start text-amber-300"><Ban /> Désactiver le compte</Button>}
              title="Désactiver ce compte ?"
              description="L'utilisateur ne pourra plus se connecter tant que le compte ne sera pas réactivé."
              confirmLabel="Désactiver"
              onConfirm={async () => report(await setUserStatusAction(user.id, "SUSPENDED"))}
            />
          )
        ) : null}
        {can.delete && !isSelf ? (
          <ConfirmDialog
            trigger={<Button variant="danger" className="justify-start"><Trash2 /> Supprimer le compte</Button>}
            title="Supprimer définitivement ce compte ?"
            description="Le compte sera anonymisé et désactivé. Cette action est irréversible."
            confirmLabel="Supprimer"
            onConfirm={async () => { const r = await deleteUserAction(user.id); if (r?.error) toast.error(r.error); }}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function ServicesCard({ user, services }: { user: Props["user"]; services: Props["services"] }) {
  const [pending, start] = React.useTransition();
  const granted = new Set(user.grantedServiceIds);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accès aux services</CardTitle>
        <CardDescription>Les services publics sont accessibles à tous. Accordez un accès explicite pour les services privés ou réservés aux abonnés.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border pt-2">
        {services.map((s) => {
          const explicit = granted.has(s.id);
          return (
            <div key={s.id} className="flex items-center gap-3 py-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-bg-elevated text-accent"><ServiceIcon name={s.icon} className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-fg-subtle">
                  {s.visibility === "PUBLIC" ? "Public" : "Privé"}{s.requiresSubscription ? " · abonnement requis" : ""}
                </p>
              </div>
              <Switch checked={explicit} disabled={pending} onCheckedChange={(v) => start(async () => report(await setServiceAccessAction(user.id, s.id, v)))} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function SubscriptionsCard({ user, plans }: { user: Props["user"]; plans: Props["plans"] }) {
  const [state, action] = useActionState(grantSubscriptionAction.bind(null, user.id), initialActionState);
  useActionToast(state);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Abonnement</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {user.subscriptions.length === 0 ? <p className="text-sm text-fg-subtle">Aucun abonnement.</p> : (
          <ul className="flex flex-col divide-y divide-border">
            {user.subscriptions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{s.planName} <Badge variant={SUBSCRIPTION_STATUS_META[s.status].variant} className="ml-1">{SUBSCRIPTION_STATUS_META[s.status].label}</Badge></p>
                  <p className="text-xs text-fg-subtle">{s.provider} · {s.currentPeriodEnd ? `jusqu'au ${formatDate(s.currentPeriodEnd, { dateStyle: "medium" })}` : `créé ${formatRelative(s.createdAt)}`}</p>
                </div>
                {s.status === "ACTIVE" || s.status === "PAST_DUE" ? (
                  <ConfirmDialog
                    trigger={<Button variant="ghost" size="sm">Annuler</Button>}
                    title="Annuler cet abonnement ?"
                    confirmLabel="Annuler l'abonnement"
                    onConfirm={async () => report(await adminCancelSubscriptionAction(s.id, user.id))}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {plans.length ? (
          <form action={action} className="flex flex-col gap-3 rounded-xl border border-border bg-bg-elevated/50 p-4 sm:flex-row sm:items-end">
            <Field label="Attribuer manuellement" htmlFor="planId" className="flex-1">
              <Select id="planId" name="planId">{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
            </Field>
            <Field label="Durée (mois)" htmlFor="months" className="sm:w-28">
              <Input id="months" name="months" type="number" min={1} max={36} defaultValue={1} />
            </Field>
            <SubmitButton variant="secondary">Attribuer</SubmitButton>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DiscordCard({ user }: { user: Props["user"] }) {
  const [state, action] = useActionState(adminLinkDiscordAction.bind(null, user.id), initialActionState);
  useActionToast(state);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2"><MessageCircle className="size-4 text-[#5865F2]" /> Discord</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {user.discord ? (
          <>
            <div className="rounded-xl border border-border bg-bg-elevated p-3 text-sm">
              <p className="font-medium">@{user.discord.username}</p>
              <p className="font-mono text-xs text-fg-subtle">{user.discord.discordUserId}</p>
              <p className="text-xs text-fg-subtle">Lié le {formatDate(user.discord.linkedAt, { dateStyle: "medium" })}</p>
            </div>
            <ConfirmDialog
              trigger={<Button variant="outline" size="sm">Délier</Button>}
              title="Délier le compte Discord ?"
              confirmLabel="Délier"
              onConfirm={async () => report(await adminUnlinkDiscordAction(user.id))}
            />
          </>
        ) : (
          <form action={action} className="flex flex-col gap-3">
            <FormError state={state} />
            <Field label="ID utilisateur Discord" htmlFor="discordUserId" hint="Clic droit sur l'utilisateur → Copier l'identifiant">
              <Input id="discordUserId" name="discordUserId" inputMode="numeric" placeholder="123456789012345678" required />
            </Field>
            <Field label="Nom Discord (si bot non configuré)" htmlFor="d-username">
              <Input id="d-username" name="username" placeholder="pseudo" />
            </Field>
            <SubmitButton variant="secondary" size="sm">Lier</SubmitButton>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryCard({ user }: { user: Props["user"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessions & connexions</CardTitle>
        <CardDescription>{user.sessions.length} session{user.sessions.length > 1 ? "s" : ""} active{user.sessions.length > 1 ? "s" : ""}.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {user.sessions.length ? (
          <ul className="flex flex-col divide-y divide-border text-sm">
            {user.sessions.map((s) => (
              <li key={s.id} className="flex justify-between gap-3 py-2">
                <span className="truncate text-fg-muted">{s.userAgent?.slice(0, 60) ?? "Appareil inconnu"}</span>
                <span className="shrink-0 text-xs text-fg-subtle">{s.ip ?? "—"} · {formatRelative(s.lastActiveAt)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-fg-subtle">Dernières connexions</p>
          <ul className="flex flex-col divide-y divide-border text-sm">
            {user.loginHistory.length === 0 ? <li className="py-2 text-fg-subtle">Aucune.</li> : null}
            {user.loginHistory.map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-2">
                {h.success ? <Check className="size-4 text-emerald-400" /> : <X className="size-4 text-red-400" />}
                <span className="flex-1 text-fg-muted">{formatDate(h.createdAt)}{h.reason ? ` · ${h.reason}` : ""}</span>
                <span className="font-mono text-xs text-fg-subtle">{h.ip ?? "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
