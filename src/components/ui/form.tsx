"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import type { ActionState } from "@/lib/utils";

export function SubmitButton({ children, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} {...props}>
      {children}
    </Button>
  );
}

export function FormError({ state }: { state?: ActionState }) {
  if (!state?.error) return null;
  return <Alert variant="danger">{state.error}</Alert>;
}

export function FormSuccess({ state }: { state?: ActionState }) {
  if (!state?.ok || !state.message) return null;
  return <Alert variant="success">{state.message}</Alert>;
}

/** Affiche un toast selon le résultat d'une action appelée directement (hors useActionState). */
export function reportAction(r: ActionState | undefined | void) {
  if (!r) return;
  if (r.ok) toast.success(r.message ?? "Opération réussie.");
  else if (r.error) toast.error(r.error);
}

/** Affiche un toast quand l'état d'une action change (succès ou erreur). */
export function useActionToast(state: ActionState | undefined, onSuccess?: () => void) {
  const last = React.useRef<ActionState | undefined>(undefined);
  React.useEffect(() => {
    if (!state || state === last.current) return;
    last.current = state;
    if (state.ok && state.message) {
      toast.success(state.message);
      onSuccess?.();
    } else if (state.ok) {
      onSuccess?.();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, onSuccess]);
}
