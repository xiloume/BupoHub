"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { Copy, Link2, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/dialog";
import { FormError, SubmitButton, useActionToast, reportAction } from "@/components/ui/form";
import { createInvitationAction, revokeInvitationAction } from "@/actions/admin";
import { formatDate, formatRelative } from "@/lib/meta";
import { initialActionState, type ActionState } from "@/lib/utils";

type Inv = { id: string; email: string | null; roleName: string; createdBy: string; usedBy: string | null; createdAt: Date; expiresAt: Date; usedAt: Date | null; revokedAt: Date | null };

function statusOf(i: Inv) {
  if (i.usedAt) return { label: `Utilisée par ${i.usedBy ?? "?"}`, variant: "success" as const };
  if (i.revokedAt) return { label: "Révoquée", variant: "muted" as const };
  if (i.expiresAt < new Date()) return { label: "Expirée", variant: "danger" as const };
  return { label: "En attente", variant: "warning" as const };
}

export function InvitationsManager({ roles, invitations }: { roles: { id: string; slug: string; name: string }[]; invitations: Inv[] }) {
  const [state, action] = useActionState(createInvitationAction, initialActionState as ActionState<{ link: string }>);
  const formRef = React.useRef<HTMLFormElement>(null);
  useActionToast(state, () => formRef.current?.reset());
  const fe = state.fieldErrors ?? {};

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="self-start">
        <CardHeader>
          <CardTitle>Nouvelle invitation</CardTitle>
          <CardDescription>Laissez l&apos;email vide pour un lien ouvert (utilisable une seule fois).</CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={action} className="flex flex-col gap-4">
            <FormError state={state} />
            <Field label="Email (optionnel)" htmlFor="inv-email" error={fe.email} hint="Si renseigné, l'invitation lui est envoyée et réservée.">
              <Input id="inv-email" name="email" type="email" placeholder="ami@exemple.com" />
            </Field>
            <Field label="Rôle attribué" htmlFor="inv-role">
              <Select id="inv-role" name="roleId" defaultValue={roles.find((r) => r.slug === "user")?.id}>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </Field>
            <Field label="Validité (jours)" htmlFor="inv-days">
              <Input id="inv-days" name="expiresInDays" type="number" min={1} max={90} defaultValue={7} />
            </Field>
            <SubmitButton><Link2 /> Générer le lien</SubmitButton>
            {state.ok && state.data?.link ? (
              <Alert variant="success" className="break-all text-xs">
                <div className="flex items-start gap-2">
                  <code className="flex-1">{state.data.link}</code>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(state.data!.link); toast.success("Lien copié"); }} className="shrink-0 rounded p-1 hover:bg-white/10" aria-label="Copier">
                    <Copy className="size-3.5" />
                  </button>
                </div>
              </Alert>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Invitations ({invitations.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border pt-2">
          {invitations.length === 0 ? <p className="py-8 text-center text-sm text-fg-subtle">Aucune invitation.</p> : null}
          {invitations.map((i) => {
            const st = statusOf(i);
            const pending = st.variant === "warning";
            return (
              <div key={i.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-bg-elevated text-fg-muted">
                  {i.email ? <Mail className="size-4" /> : <Link2 className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.email ?? "Lien ouvert"} <Badge variant="muted" className="ml-1">{i.roleName}</Badge></p>
                  <p className="text-xs text-fg-subtle">
                    par {i.createdBy} · {formatRelative(i.createdAt)} · expire le {formatDate(i.expiresAt, { dateStyle: "medium" })}
                  </p>
                </div>
                <Badge variant={st.variant}>{st.label}</Badge>
                {pending ? (
                  <ConfirmDialog
                    trigger={<Button variant="ghost" size="sm">Révoquer</Button>}
                    title="Révoquer cette invitation ?"
                    confirmLabel="Révoquer"
                    onConfirm={async () => { reportAction(await revokeInvitationAction(i.id)); }}
                  />
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
