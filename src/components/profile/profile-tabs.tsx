"use client";

import * as React from "react";
import { useActionState } from "react";
import { Monitor, Smartphone, UserRound, KeyRound, Laptop, History, Settings2, MessageCircle, Trash2, LogOut, Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger, Alert, Switch } from "@/components/ui/misc";
import { Field, Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { FormError, SubmitButton, useActionToast, reportAction } from "@/components/ui/form";
import { PasswordInput } from "@/components/auth/password-input";
import {
  changePasswordAction,
  linkDiscordAction,
  removeAvatarAction,
  revokeOtherSessionsAction,
  revokeSessionAction,
  unlinkDiscordAction,
  updateAvatarAction,
  updatePreferencesAction,
  updateProfileAction,
} from "@/actions/profile";
import { formatDate, formatRelative } from "@/lib/meta";
import { initialActionState, cn } from "@/lib/utils";

type SessionRow = { id: string; ip: string | null; userAgent: string | null; createdAt: Date; lastActiveAt: Date };
type HistoryRow = { id: string; ip: string | null; userAgent: string | null; success: boolean; reason: string | null; createdAt: Date };
type DiscordInfo = { username: string; globalName: string | null; discordUserId: string; avatar: string | null; linkedAt: Date };

export function ProfileTabs({
  defaultTab,
  user,
  sessions,
  currentSessionId,
  history,
  discord,
  discordOAuthAvailable,
  flash,
}: {
  defaultTab: string;
  user: { id: string; email: string; username: string; displayName: string | null; avatarUrl: string | null; locale: string; accent: string; emailNotifications: boolean };
  sessions: SessionRow[];
  currentSessionId: string | null;
  history: HistoryRow[];
  discord: DiscordInfo | null;
  discordOAuthAvailable: boolean;
  flash?: string;
}) {
  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        <TabsTrigger value="infos"><UserRound /> Informations</TabsTrigger>
        <TabsTrigger value="securite"><KeyRound /> Sécurité</TabsTrigger>
        <TabsTrigger value="sessions"><Laptop /> Sessions</TabsTrigger>
        <TabsTrigger value="historique"><History /> Historique</TabsTrigger>
        <TabsTrigger value="preferences"><Settings2 /> Préférences</TabsTrigger>
        <TabsTrigger value="discord"><MessageCircle /> Discord</TabsTrigger>
      </TabsList>

      <TabsContent value="infos" className="grid gap-6 lg:grid-cols-3">
        <AvatarCard user={user} />
        <InfoForm user={user} />
      </TabsContent>

      <TabsContent value="securite">
        <PasswordForm />
      </TabsContent>

      <TabsContent value="sessions">
        <SessionsCard sessions={sessions} currentSessionId={currentSessionId} />
      </TabsContent>

      <TabsContent value="historique">
        <HistoryCard history={history} />
      </TabsContent>

      <TabsContent value="preferences">
        <PreferencesForm user={user} />
      </TabsContent>

      <TabsContent value="discord">
        <DiscordCard discord={discord} available={discordOAuthAvailable} flash={flash} />
      </TabsContent>
    </Tabs>
  );
}

function AvatarCard({ user }: { user: { username: string; displayName: string | null; avatarUrl: string | null } }) {
  const [state, action] = useActionState(updateAvatarAction, initialActionState);
  const formRef = React.useRef<HTMLFormElement>(null);
  useActionToast(state);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Avatar</CardTitle>
        <CardDescription>PNG, JPG, WebP ou GIF · 2 Mo max.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-5">
        <Avatar src={user.avatarUrl} name={user.displayName || user.username} size="2xl" className="ring-4 ring-accent/20" />
        <form ref={formRef} action={action} className="flex w-full flex-col gap-2">
          <input
            type="file"
            name="avatar"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="block w-full text-sm text-fg-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-fg hover:file:bg-surface-2/70"
            onChange={() => formRef.current?.requestSubmit()}
          />
          <FormError state={state} />
        </form>
        {user.avatarUrl ? (
          <form action={async () => reportAction(await removeAvatarAction())}>
            <Button type="submit" variant="ghost" size="sm"><Trash2 /> Supprimer l&apos;avatar</Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

function InfoForm({ user }: { user: { email: string; username: string; displayName: string | null } }) {
  const [state, action] = useActionState(updateProfileAction, initialActionState);
  useActionToast(state);
  const fe = state.fieldErrors ?? {};
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Informations du compte</CardTitle>
        <CardDescription>Votre identité sur BupoHub et les services connectés.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-5">
          <FormError state={state} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nom d'utilisateur" htmlFor="username" error={fe.username}>
              <Input id="username" name="username" defaultValue={user.username} required />
            </Field>
            <Field label="Nom affiché" htmlFor="displayName" error={fe.displayName} hint="Optionnel">
              <Input id="displayName" name="displayName" defaultValue={user.displayName ?? ""} />
            </Field>
          </div>
          <Field label="Adresse email" htmlFor="email" error={fe.email}>
            <Input id="email" name="email" type="email" defaultValue={user.email} required />
          </Field>
          <div className="flex justify-end">
            <SubmitButton>Enregistrer</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initialActionState);
  const ref = React.useRef<HTMLFormElement>(null);
  useActionToast(state, () => ref.current?.reset());
  const fe = state.fieldErrors ?? {};
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Changer le mot de passe</CardTitle>
        <CardDescription>Après modification, vos autres sessions seront déconnectées.</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={ref} action={action} className="flex flex-col gap-5">
          <FormError state={state} />
          <Field label="Mot de passe actuel" htmlFor="current" error={fe.current}>
            <PasswordInput id="current" name="current" autoComplete="current-password" required />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nouveau mot de passe" htmlFor="password" error={fe.password} hint="8 caractères min., lettre + chiffre">
              <PasswordInput id="password" name="password" autoComplete="new-password" required />
            </Field>
            <Field label="Confirmer" htmlFor="confirm" error={fe.confirm}>
              <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required />
            </Field>
          </div>
          <div className="flex justify-end">
            <SubmitButton>Mettre à jour</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function deviceLabel(ua: string | null) {
  if (!ua) return { label: "Appareil inconnu", mobile: false };
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navigateur";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "";
  return { label: [browser, os].filter(Boolean).join(" · "), mobile };
}

function SessionsCard({ sessions, currentSessionId }: { sessions: SessionRow[]; currentSessionId: string | null }) {
  const [pending, start] = React.useTransition();
  const others = sessions.filter((s) => s.id !== currentSessionId);
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Sessions connectées</CardTitle>
          <CardDescription>{sessions.length} session{sessions.length > 1 ? "s" : ""} active{sessions.length > 1 ? "s" : ""}.</CardDescription>
        </div>
        {others.length ? (
          <ConfirmDialog
            trigger={<Button variant="outline" size="sm" loading={pending}><LogOut /> Déconnecter les autres</Button>}
            title="Déconnecter les autres sessions ?"
            description="Tous vos autres appareils devront se reconnecter."
            confirmLabel="Déconnecter"
            onConfirm={() => start(async () => { reportAction(await revokeOtherSessionsAction()); })}
          />
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border pt-4">
        {sessions.map((s) => {
          const d = deviceLabel(s.userAgent);
          const current = s.id === currentSessionId;
          return (
            <div key={s.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <span className="flex size-10 items-center justify-center rounded-xl bg-bg-elevated text-fg-muted">
                {d.mobile ? <Smartphone className="size-5" /> : <Monitor className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {d.label}
                  {current ? <Badge variant="success" dot>Cette session</Badge> : null}
                </p>
                <p className="text-xs text-fg-subtle">
                  {s.ip ?? "IP inconnue"} · active {formatRelative(s.lastActiveAt)} · créée le {formatDate(s.createdAt, { dateStyle: "medium" })}
                </p>
              </div>
              {!current ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => start(async () => { reportAction(await revokeSessionAction(s.id)); })}
                >
                  Révoquer
                </Button>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function HistoryCard({ history }: { history: HistoryRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des connexions</CardTitle>
        <CardDescription>Les 20 dernières tentatives de connexion à votre compte.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {history.length === 0 ? (
          <p className="py-6 text-center text-sm text-fg-subtle">Aucune connexion enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-fg-subtle">
                <tr className="border-b border-border">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Résultat</th>
                  <th className="pb-2 pr-4 font-medium">Appareil</th>
                  <th className="pb-2 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="py-2.5 pr-4 whitespace-nowrap text-fg-muted">{formatDate(h.createdAt)}</td>
                    <td className="py-2.5 pr-4">
                      {h.success ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400"><Check className="size-3.5" /> Réussie</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-red-400"><X className="size-3.5" /> Échec{h.reason ? ` (${h.reason})` : ""}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-fg-muted">{deviceLabel(h.userAgent).label}</td>
                    <td className="py-2.5 font-mono text-xs text-fg-subtle">{h.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const ACCENTS = [
  { value: "amber", label: "Ambre", color: "#f59e0b" },
  { value: "orange", label: "Orange", color: "#f97316" },
  { value: "violet", label: "Violet", color: "#8b5cf6" },
];

function PreferencesForm({ user }: { user: { locale: string; accent: string; emailNotifications: boolean } }) {
  const [state, action] = useActionState(updatePreferencesAction, initialActionState);
  const [accent, setAccent] = React.useState(user.accent);
  const [emailNotif, setEmailNotif] = React.useState(user.emailNotifications);
  useActionToast(state);
  React.useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Préférences</CardTitle>
        <CardDescription>Personnalisez votre expérience BupoHub.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-6">
          <FormError state={state} />
          <Field label="Langue" htmlFor="locale">
            <Select id="locale" name="locale" defaultValue={user.locale}>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </Select>
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-fg-muted">Couleur d&apos;accent</legend>
            <div className="flex gap-3">
              {ACCENTS.map((a) => (
                <label key={a.value} className={cn("flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors", accent === a.value ? "border-accent bg-accent-soft" : "border-border-strong hover:bg-white/5")}>
                  <input type="radio" name="accent" value={a.value} checked={accent === a.value} onChange={() => setAccent(a.value)} className="sr-only" />
                  <span className="size-4 rounded-full" style={{ background: a.color }} />
                  {a.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-medium">Notifications par email</p>
              <p className="text-xs text-fg-subtle">Recevoir les informations importantes par email.</p>
            </div>
            <input type="hidden" name="emailNotifications" value={emailNotif ? "on" : "off"} />
            <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
          </div>
          <div className="flex justify-end">
            <SubmitButton>Enregistrer</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function DiscordCard({ discord, available, flash }: { discord: DiscordInfo | null; available: boolean; flash?: string }) {
  const [pending, start] = React.useTransition();
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Compte Discord</CardTitle>
        <CardDescription>Liez votre compte Discord pour synchroniser vos rôles et recevoir des notifications via le bot Bupo.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {flash === "linked" ? <Alert variant="success">Compte Discord lié avec succès.</Alert> : null}
        {flash === "error" ? <Alert variant="danger">La liaison Discord a échoué. Réessayez.</Alert> : null}
        {discord ? (
          <div className="flex items-center gap-4 rounded-xl border border-border bg-bg-elevated p-4">
            <Avatar
              src={discord.avatar ? `https://cdn.discordapp.com/avatars/${discord.discordUserId}/${discord.avatar}.png?size=128` : null}
              name={discord.globalName || discord.username}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{discord.globalName || discord.username}</p>
              <p className="text-xs text-fg-subtle">@{discord.username} · ID {discord.discordUserId}</p>
              <p className="text-xs text-fg-subtle">Lié le {formatDate(discord.linkedAt, { dateStyle: "medium" })}</p>
            </div>
            <Badge variant="success" dot>Connecté</Badge>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border-strong p-6 text-center text-sm text-fg-muted">
            Aucun compte Discord lié.
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {discord ? (
            <ConfirmDialog
              trigger={<Button variant="outline" loading={pending}>Délier le compte</Button>}
              title="Délier votre compte Discord ?"
              description="Les rôles synchronisés et les notifications Discord seront désactivés."
              confirmLabel="Délier"
              onConfirm={() => start(async () => { reportAction(await unlinkDiscordAction()); })}
            />
          ) : available ? (
            <form action={linkDiscordAction}>
              <Button type="submit" className="bg-[#5865F2] text-white hover:bg-[#6a75f5]"><MessageCircle /> Lier mon compte Discord</Button>
            </form>
          ) : (
            <p className="text-xs text-fg-subtle">La liaison en libre-service n&apos;est pas activée. Un administrateur peut lier votre compte manuellement.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
