"use client";

import * as React from "react";
import { useActionState } from "react";
import { Heart } from "lucide-react";
import { Field, Input, Textarea, Checkbox } from "@/components/ui/input";
import { FormError, SubmitButton } from "@/components/ui/form";
import { donateAction } from "@/actions/billing";
import { formatMoney } from "@/lib/meta";
import { initialActionState, cn } from "@/lib/utils";

export function DonationForm({ amounts, loggedIn, paymentsEnabled }: { amounts: number[]; loggedIn: boolean; paymentsEnabled: boolean }) {
  const [state, action] = useActionState(donateAction, initialActionState);
  const [selected, setSelected] = React.useState<number | null>(amounts[1] ?? amounts[0] ?? 500);
  const [custom, setCustom] = React.useState("");
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="card-surface flex flex-col gap-6 rounded-3xl p-6 sm:p-8">
      <FormError state={state} />
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-fg-muted">Montant</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {amounts.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => { setSelected(a); setCustom(""); }}
              className={cn("rounded-xl border px-4 py-3 text-lg font-semibold transition-all", selected === a && !custom ? "border-accent bg-accent-soft text-accent accent-glow" : "border-border-strong hover:border-fg-subtle/50")}
            >
              {formatMoney(a)}
            </button>
          ))}
        </div>
        <input type="hidden" name="amountCents" value={selected ?? ""} />
        <Field label="Ou un montant libre (€)" htmlFor="customAmount" error={fe.amountCents}>
          <Input id="customAmount" name="customAmount" inputMode="decimal" placeholder="Ex. 12,50" value={custom} onChange={(e) => setCustom(e.target.value)} />
        </Field>
      </fieldset>
      {!loggedIn ? (
        <Field label="Votre nom (optionnel)" htmlFor="donorName" error={fe.donorName}>
          <Input id="donorName" name="donorName" placeholder="Affiché dans les derniers soutiens" />
        </Field>
      ) : null}
      <Field label="Un petit mot (optionnel)" htmlFor="message" error={fe.message}>
        <Textarea id="message" name="message" maxLength={500} placeholder="Merci pour Bupoflix !" className="min-h-20" />
      </Field>
      <Checkbox name="isAnonymous" label="Rester anonyme dans la liste des soutiens" />
      <SubmitButton size="lg" disabled={!paymentsEnabled}>
        <Heart /> {paymentsEnabled ? "Faire un don via PayPal" : "Dons bientôt disponibles"}
      </SubmitButton>
    </form>
  );
}
