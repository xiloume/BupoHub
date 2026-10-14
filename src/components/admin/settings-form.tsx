"use client";

import * as React from "react";
import { useActionState } from "react";
import { Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Switch, Alert } from "@/components/ui/misc";
import { FormError, SubmitButton, useActionToast } from "@/components/ui/form";
import { updateSettingsAction } from "@/actions/admin";
import { initialActionState } from "@/lib/utils";
import type { Settings } from "@/server/settings";

function Toggle({ name, label, description, defaultChecked, warning }: { name: string; label: string; description: string; defaultChecked: boolean; warning?: string }) {
  const [on, setOn] = React.useState(defaultChecked);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-fg-subtle">{description}</p>
        </div>
        <input type="hidden" name={name} value={on ? "on" : "off"} />
        <Switch checked={on} onCheckedChange={setOn} />
      </div>
      {on && warning ? <Alert variant="warning" className="text-xs">{warning}</Alert> : null}
    </div>
  );
}

function Integration({ label, ok, hint }: { label: string; ok: boolean; hint: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <span className={`flex size-7 items-center justify-center rounded-full ${ok ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-fg-subtle"}`}>
        {ok ? <Check className="size-4" /> : <X className="size-4" />}
      </span>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-fg-subtle">{ok ? "Configuré" : hint}</p>
      </div>
    </div>
  );
}

export function SettingsForm({ settings, integrations }: { settings: Settings; integrations: { mail: boolean; paypal: boolean; discordOAuth: boolean; discordBot: boolean } }) {
  const [state, action] = useActionState(updateSettingsAction, initialActionState);
  useActionToast(state);
  return (
    <form action={action} className="grid gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <FormError state={state} />
        <Card>
          <CardHeader><CardTitle>Comptes</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Mode d'inscription" htmlFor="registration.mode">
              <Select id="registration.mode" name="registration.mode" defaultValue={settings["registration.mode"]}>
                <option value="INVITE_ONLY">Sur invitation uniquement</option>
                <option value="OPEN">Ouvertes à tous</option>
                <option value="CLOSED">Fermées</option>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monétisation</CardTitle>
            <CardDescription>Les abonnements sont optionnels : désactivés, BupoHub fonctionne normalement sans aucun paiement.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Toggle
              name="subscriptions.enabled"
              label="Système d'abonnement"
              description="Affiche l'offre Bupo+ et permet de souscrire."
              defaultChecked={settings["subscriptions.enabled"]}
              warning={!integrations.paypal ? "PayPal n'est pas configuré : les utilisateurs verront l'offre mais ne pourront pas payer. Les attributions manuelles restent possibles." : undefined}
            />
            <Toggle name="donations.enabled" label="Donations" description="Affiche la section « Soutenir Bupo » et la page de don." defaultChecked={settings["donations.enabled"]} warning={!integrations.paypal ? "PayPal n'est pas configuré : le bouton de don sera inactif." : undefined} />
            <Field label="Montants suggérés (€, séparés par des virgules)" htmlFor="donations.suggestedAmounts">
              <Input id="donations.suggestedAmounts" name="donations.suggestedAmounts" defaultValue={settings["donations.suggestedAmounts"].map((c) => c / 100).join(", ")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Apparence & contenu</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Accroche de la page d'accueil" htmlFor="site.tagline">
              <Input id="site.tagline" name="site.tagline" defaultValue={settings["site.tagline"]} />
            </Field>
            <Field label="Couleur d'accent par défaut" htmlFor="site.accent" hint="Chaque utilisateur peut la personnaliser dans son profil.">
              <Select id="site.accent" name="site.accent" defaultValue={settings["site.accent"]}>
                <option value="amber">Ambre</option>
                <option value="orange">Orange</option>
                <option value="violet">Violet</option>
              </Select>
            </Field>
            <Field label="Lien d'invitation Discord" htmlFor="discord.inviteUrl">
              <Input id="discord.inviteUrl" name="discord.inviteUrl" defaultValue={settings["discord.inviteUrl"]} placeholder="https://discord.gg/…" />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Maintenance</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Toggle name="maintenance.enabled" label="Bandeau de maintenance" description="Affiche un message en haut de toutes les pages." defaultChecked={settings["maintenance.enabled"]} />
            <Field label="Message" htmlFor="maintenance.message">
              <Textarea id="maintenance.message" name="maintenance.message" defaultValue={settings["maintenance.message"]} placeholder="Une maintenance est prévue ce soir à 22h…" />
            </Field>
          </CardContent>
        </Card>

        <div className="flex justify-end"><SubmitButton size="lg">Enregistrer les paramètres</SubmitButton></div>
      </div>

      <Card className="self-start">
        <CardHeader>
          <CardTitle>Intégrations</CardTitle>
          <CardDescription>État des services externes, lu depuis le fichier .env.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Integration label="Emails (SMTP)" ok={integrations.mail} hint="SMTP_HOST manquant — emails loggés en console" />
          <Integration label="PayPal" ok={integrations.paypal} hint="PAYPAL_CLIENT_ID / SECRET manquants" />
          <Integration label="Discord OAuth2" ok={integrations.discordOAuth} hint="DISCORD_CLIENT_ID / SECRET manquants" />
          <Integration label="Bot Discord" ok={integrations.discordBot} hint="DISCORD_BOT_TOKEN manquant" />
        </CardContent>
      </Card>
    </form>
  );
}
