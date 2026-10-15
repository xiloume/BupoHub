"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/dialog";
import { FormError, SubmitButton, useActionToast } from "@/components/ui/form";
import { ServiceIcon, SERVICE_ICON_NAMES } from "@/components/ui/icon";
import { deleteServiceAction, saveServiceAction } from "@/actions/admin";
import { initialActionState, cn } from "@/lib/utils";

export type ServiceFormValues = {
  id?: string;
  slug: string;
  name: string;
  description: string;
  url: string;
  icon: string | null;
  imageUrl: string | null;
  status: "ONLINE" | "OFFLINE" | "MAINTENANCE" | "HIDDEN";
  visibility: "PUBLIC" | "PRIVATE";
  requiresSubscription: boolean;
  integration: "NONE" | "JELLYFIN";
  ctaLabel: string | null;
  sortOrder: number;
  healthcheckUrl: string | null;
};

const EMPTY: ServiceFormValues = {
  slug: "",
  name: "",
  description: "",
  url: "https://",
  icon: "Box",
  imageUrl: null,
  status: "ONLINE",
  visibility: "PUBLIC",
  requiresSubscription: false,
  integration: "NONE",
  ctaLabel: null,
  sortOrder: 0,
  healthcheckUrl: null,
};

export function ServiceForm({ initial }: { initial?: ServiceFormValues }) {
  const v = initial ?? EMPTY;
  const [state, action] = useActionState(saveServiceAction.bind(null, v.id ?? null), initialActionState);
  const [icon, setIcon] = React.useState(v.icon ?? "Box");
  const [requiresSub, setRequiresSub] = React.useState(v.requiresSubscription);
  const [name, setName] = React.useState(v.name);
  const [slug, setSlug] = React.useState(v.slug);
  const slugTouched = React.useRef(Boolean(v.id));
  useActionToast(state);
  const fe = state.fieldErrors ?? {};

  const onName = (val: string) => {
    setName(val);
    if (!slugTouched.current) {
      setSlug(val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormError state={state} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom" htmlFor="name" error={fe.name}>
                <Input id="name" name="name" value={name} onChange={(e) => onName(e.target.value)} required />
              </Field>
              <Field label="Slug" htmlFor="slug" error={fe.slug} hint="Identifiant unique (URL, API)">
                <Input id="slug" name="slug" value={slug} onChange={(e) => { slugTouched.current = true; setSlug(e.target.value); }} required />
              </Field>
            </div>
            <Field label="Description" htmlFor="description" error={fe.description}>
              <Textarea id="description" name="description" defaultValue={v.description} required />
            </Field>
            <Field label="URL du service" htmlFor="url" error={fe.url}>
              <Input id="url" name="url" type="url" defaultValue={v.url} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Libellé du bouton" htmlFor="ctaLabel" error={fe.ctaLabel} hint="Ex. « Ouvrir Bupoflix »">
                <Input id="ctaLabel" name="ctaLabel" defaultValue={v.ctaLabel ?? ""} />
              </Field>
              <Field label="Image de couverture (URL)" htmlFor="imageUrl" error={fe.imageUrl} hint="Optionnel">
                <Input id="imageUrl" name="imageUrl" type="url" defaultValue={v.imageUrl ?? ""} />
              </Field>
            </div>
            <Field label="URL de healthcheck" htmlFor="healthcheckUrl" error={fe.healthcheckUrl} hint="Optionnel — pour un statut automatique futur">
              <Input id="healthcheckUrl" name="healthcheckUrl" type="url" defaultValue={v.healthcheckUrl ?? ""} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Icône</CardTitle>
            <CardDescription>Choisissez une icône représentant le service.</CardDescription>
          </CardHeader>
          <CardContent>
            <input type="hidden" name="icon" value={icon} />
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-9 md:grid-cols-11">
              {SERVICE_ICON_NAMES.map((n) => (
                <button
                  key={n}
                  type="button"
                  title={n}
                  onClick={() => setIcon(n)}
                  className={cn("flex aspect-square items-center justify-center rounded-lg border transition-colors", icon === n ? "border-accent bg-accent-soft text-accent" : "border-border text-fg-muted hover:border-border-strong hover:text-fg")}
                >
                  <ServiceIcon name={n} className="size-5" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Publication</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Statut" htmlFor="status">
              <Select id="status" name="status" defaultValue={v.status}>
                <option value="ONLINE">En ligne</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="OFFLINE">Hors ligne</option>
                <option value="HIDDEN">Masqué</option>
              </Select>
            </Field>
            <Field label="Visibilité" htmlFor="visibility" hint="Privé : visible uniquement par les utilisateurs autorisés">
              <Select id="visibility" name="visibility" defaultValue={v.visibility}>
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Privé</option>
              </Select>
            </Field>
            <Field label="Intégration" htmlFor="integration" hint="Jellyfin : création de compte et connexion automatique depuis BupoHub">
              <Select id="integration" name="integration" defaultValue={v.integration}>
                <option value="NONE">Aucune</option>
                <option value="JELLYFIN">Jellyfin</option>
              </Select>
            </Field>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium">Réservé aux abonnés</p>
                <p className="text-xs text-fg-subtle">Actif seulement si les abonnements sont activés.</p>
              </div>
              <input type="hidden" name="requiresSubscription" value={requiresSub ? "on" : "off"} />
              <Switch checked={requiresSub} onCheckedChange={setRequiresSub} />
            </div>
            <Field label="Ordre d'affichage" htmlFor="sortOrder">
              <Input id="sortOrder" name="sortOrder" type="number" min={0} defaultValue={v.sortOrder} />
            </Field>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-2">
          <SubmitButton size="lg">{v.id ? "Enregistrer" : "Créer le service"}</SubmitButton>
          {v.id ? (
            <ConfirmDialog
              trigger={<Button type="button" variant="danger"><Trash2 /> Supprimer le service</Button>}
              title={`Supprimer « ${v.name} » ?`}
              description="Les accès accordés seront également supprimés. Cette action est irréversible."
              confirmLabel="Supprimer"
              onConfirm={async () => { const r = await deleteServiceAction(v.id!); if (r?.error) toast.error(r.error); }}
            />
          ) : null}
        </div>
      </div>
    </form>
  );
}
