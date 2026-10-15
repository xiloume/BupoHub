"use client";

import * as React from "react";
import { useActionState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/misc";
import { FormError, SubmitButton, useActionToast, reportAction } from "@/components/ui/form";
import { deletePlanAction, savePlanAction } from "@/actions/admin";
import { formatMoney } from "@/lib/meta";
import { initialActionState } from "@/lib/utils";

type Plan = { id: string; slug: string; name: string; description: string | null; priceCents: number; currency: string; interval: "MONTH" | "YEAR"; paypalPlanId: string | null; isActive: boolean; visibility: "PUBLIC" | "PRIVATE"; sortOrder: number; count: number };

export function PlansManager({ plans }: { plans: Plan[] }) {
  const [editing, setEditing] = React.useState<Plan | null | "new">(null);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Plans</CardTitle>
        <Button size="sm" onClick={() => setEditing("new")}><Plus /> Nouveau plan</Button>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border pt-2">
        {plans.length === 0 ? <p className="py-6 text-center text-sm text-fg-subtle">Aucun plan.</p> : null}
        {plans.map((p) => (
          <div key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                {p.name}
                <Badge variant={p.isActive ? "success" : "muted"}>{p.isActive ? "Actif" : "Inactif"}</Badge>
                {p.visibility === "PRIVATE" ? <Badge variant="violet">Privé</Badge> : null}
                {!p.paypalPlanId ? <Badge variant="warning">Sans plan PayPal</Badge> : null}
              </p>
              <p className="text-xs text-fg-subtle">{formatMoney(p.priceCents, p.currency)} / {p.interval === "MONTH" ? "mois" : "an"} · slug {p.slug} · {p.count} abonné{p.count > 1 ? "s" : ""}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setEditing(p)}><Pencil /> Modifier</Button>
              <ConfirmDialog
                trigger={<Button variant="ghost" size="sm" className="text-red-300"><Trash2 /></Button>}
                title={`Supprimer le plan « ${p.name} » ?`}
                description="Impossible si des abonnements y sont liés."
                confirmLabel="Supprimer"
                onConfirm={async () => { reportAction(await deletePlanAction(p.id)); }}
              />
            </div>
          </div>
        ))}
      </CardContent>
      {editing ? <PlanDialog plan={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
    </Card>
  );
}

function PlanDialog({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const [state, action] = useActionState(savePlanAction.bind(null, plan?.id ?? null), initialActionState);
  const [active, setActive] = React.useState(plan?.isActive ?? true);
  useActionToast(state, onClose);
  const fe = state.fieldErrors ?? {};
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={plan ? "Modifier le plan" : "Nouveau plan"} description="Le prix est affiché aux utilisateurs ; le paiement passe par le plan PayPal associé.">
        <form action={action} className="flex flex-col gap-4">
          <FormError state={state} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom" htmlFor="p-name" error={fe.name}><Input id="p-name" name="name" defaultValue={plan?.name} required /></Field>
            <Field label="Slug" htmlFor="p-slug" error={fe.slug}><Input id="p-slug" name="slug" defaultValue={plan?.slug} required /></Field>
          </div>
          <Field label="Description" htmlFor="p-desc" error={fe.description}><Textarea id="p-desc" name="description" defaultValue={plan?.description ?? ""} /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Prix (centimes)" htmlFor="p-price" error={fe.priceCents} hint="500 = 5,00 €"><Input id="p-price" name="priceCents" type="number" min={0} defaultValue={plan?.priceCents ?? 500} required /></Field>
            <Field label="Devise" htmlFor="p-cur" error={fe.currency}><Input id="p-cur" name="currency" defaultValue={plan?.currency ?? "EUR"} maxLength={3} /></Field>
            <Field label="Période" htmlFor="p-int">
              <Select id="p-int" name="interval" defaultValue={plan?.interval ?? "MONTH"}>
                <option value="MONTH">Mensuel</option>
                <option value="YEAR">Annuel</option>
              </Select>
            </Field>
          </div>
          <Field label="ID du plan PayPal" htmlFor="p-paypal" error={fe.paypalPlanId} hint="Créé dans le tableau de bord PayPal (P-XXXX…)"><Input id="p-paypal" name="paypalPlanId" defaultValue={plan?.paypalPlanId ?? ""} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Visibilité" htmlFor="p-vis" hint="Privé : souscription uniquement pour les utilisateurs autorisés">
              <Select id="p-vis" name="visibility" defaultValue={plan?.visibility ?? "PUBLIC"}>
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Privé</option>
              </Select>
            </Field>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <p className="text-sm font-medium">Plan actif (proposé aux utilisateurs)</p>
              <input type="hidden" name="isActive" value={active ? "on" : "off"} />
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>
          <Field label="Ordre" htmlFor="p-order"><Input id="p-order" name="sortOrder" type="number" min={0} defaultValue={plan?.sortOrder ?? 0} /></Field>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="ghost">Annuler</Button></DialogClose>
            <SubmitButton>Enregistrer</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
