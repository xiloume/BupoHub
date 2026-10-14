"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger, ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, Checkbox } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/misc";
import { FormError, SubmitButton, useActionToast, reportAction } from "@/components/ui/form";
import { createApiKeyAction, revokeApiKeyAction } from "@/actions/admin";
import { BOT_SCOPES } from "@/lib/validation";
import { formatDate, formatRelative } from "@/lib/meta";
import { initialActionState, type ActionState } from "@/lib/utils";

type Key = { id: string; name: string; prefix: string; scopes: string[]; createdBy: string; createdAt: Date; lastUsedAt: Date | null; revokedAt: Date | null };

export function ApiKeysManager({ keys, apiUrl }: { keys: Key[]; apiUrl: string }) {
  const [open, setOpen] = React.useState(false);
  const [state, action] = useActionState(createApiKeyAction, initialActionState as ActionState<{ key: string }>);
  useActionToast(state);
  const fe = state.fieldErrors ?? {};
  const created = state.ok ? state.data?.key : undefined;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Clés API (bot Discord)</CardTitle>
          <CardDescription>Authentification par <code className="text-xs">Authorization: Bearer &lt;clé&gt;</code> sur <code className="break-all text-xs">{`${apiUrl}/*`}</code>. Chaque appel est journalisé.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); }}>
          <DialogTrigger asChild><Button size="sm"><Plus /> Nouvelle clé</Button></DialogTrigger>
          <DialogContent title="Nouvelle clé API" description="Choisissez les scopes strictement nécessaires au bot.">
            {created ? (
              <div className="flex flex-col gap-4">
                <Alert variant="success" title="Clé créée — copiez-la maintenant">
                  <div className="mt-2 flex items-start gap-2 break-all font-mono text-xs">
                    <code className="flex-1">{created}</code>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(created); toast.success("Clé copiée"); }} className="shrink-0 rounded p-1 hover:bg-white/10" aria-label="Copier"><Copy className="size-3.5" /></button>
                  </div>
                  <p className="mt-2 text-xs">Elle ne sera plus jamais affichée. Stockez-la dans la configuration du bot (variable d&apos;environnement).</p>
                </Alert>
                <DialogFooter><DialogClose asChild><Button>Fermer</Button></DialogClose></DialogFooter>
              </div>
            ) : (
              <form action={action} className="flex flex-col gap-4">
                <FormError state={state} />
                <Field label="Nom" htmlFor="k-name" error={fe.name} hint="Ex. « Bot Bupo — production »"><Input id="k-name" name="name" required /></Field>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 text-sm font-medium text-fg-muted">Scopes</legend>
                  {fe.scopes ? <p className="text-xs text-red-400">{fe.scopes}</p> : null}
                  {Object.entries(BOT_SCOPES).map(([k, label]) => (
                    <Checkbox key={k} name="scopes" value={k} label={<span><code className="text-xs text-accent">{k}</code> — {label}</span>} />
                  ))}
                </fieldset>
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="ghost">Annuler</Button></DialogClose>
                  <SubmitButton><KeyRound /> Créer la clé</SubmitButton>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border pt-2">
        {keys.length === 0 ? <p className="py-6 text-center text-sm text-fg-subtle">Aucune clé.</p> : null}
        {keys.map((k) => (
          <div key={k.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {k.name} <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-fg-subtle">{k.prefix}.…</code>
                {k.revokedAt ? <Badge variant="danger">Révoquée</Badge> : <Badge variant="success">Active</Badge>}
              </p>
              <p className="mt-1 flex flex-wrap gap-1">{k.scopes.map((s) => <Badge key={s} variant="muted">{s}</Badge>)}</p>
              <p className="mt-1 text-xs text-fg-subtle">par {k.createdBy} · {formatDate(k.createdAt, { dateStyle: "medium" })} · {k.lastUsedAt ? `utilisée ${formatRelative(k.lastUsedAt)}` : "jamais utilisée"}</p>
            </div>
            {!k.revokedAt ? (
              <ConfirmDialog
                trigger={<Button variant="ghost" size="sm" className="text-red-300">Révoquer</Button>}
                title={`Révoquer « ${k.name} » ?`}
                description="Le bot utilisant cette clé perdra immédiatement l'accès."
                confirmLabel="Révoquer"
                onConfirm={async () => { reportAction(await revokeApiKeyAction(k.id)); }}
              />
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
