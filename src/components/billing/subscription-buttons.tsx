"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { reportAction } from "@/components/ui/form";
import { cancelMySubscriptionAction, subscribeAction } from "@/actions/billing";

export function SubscribeButton({ planId, disabled }: { planId: string; disabled?: boolean }) {
  const [pending, start] = React.useTransition();
  return (
    <Button
      size="lg"
      className="w-full"
      disabled={disabled}
      loading={pending}
      onClick={() => start(async () => { const r = await subscribeAction(planId); if (r?.error) toast.error(r.error); })}
    >
      {disabled ? "Bientôt disponible" : "Souscrire"}
    </Button>
  );
}

export function CancelSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  return (
    <ConfirmDialog
      trigger={<Button variant="outline" size="sm">Annuler l&apos;abonnement</Button>}
      title="Annuler votre abonnement ?"
      description="Vous conserverez l'accès jusqu'à la fin de la période déjà payée. Aucun remboursement automatique."
      confirmLabel="Annuler l'abonnement"
      onConfirm={async () => { reportAction(await cancelMySubscriptionAction(subscriptionId)); }}
    />
  );
}
