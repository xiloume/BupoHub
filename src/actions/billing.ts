"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/guards";
import { getCurrentUser } from "@/server/auth/session";
import { cancelSubscription, startSubscription } from "@/server/subscriptions";
import { startDonation } from "@/server/donations";
import { PaymentsDisabledError } from "@/server/payments";
import { donationSchema, flattenErrors } from "@/lib/validation";
import type { ActionState } from "@/lib/utils";

export async function subscribeAction(planId: string): Promise<ActionState> {
  let url: string;
  try {
    const user = await requireUser();
    url = await startSubscription(user, planId);
  } catch (e) {
    if (e instanceof PaymentsDisabledError) return { error: "Le paiement en ligne n'est pas encore disponible. Contactez un administrateur." };
    return { error: e instanceof Error ? e.message : "Impossible de démarrer l'abonnement." };
  }
  redirect(url);
}

export async function cancelMySubscriptionAction(subscriptionId: string): Promise<ActionState> {
  try {
    const user = await requireUser();
    await cancelSubscription(user, subscriptionId);
    revalidatePath("/abonnement");
    return { ok: true, message: "Abonnement annulé. Il reste actif jusqu'à la fin de la période en cours chez PayPal." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Annulation impossible." };
  }
}

export async function donateAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const custom = fd.get("customAmount");
  const amountEuros = custom && String(custom).trim() ? Number(String(custom).replace(",", ".")) : Number(fd.get("amountCents")) / 100;
  const parsed = donationSchema.safeParse({
    amountCents: Math.round(amountEuros * 100),
    message: fd.get("message"),
    donorName: fd.get("donorName"),
    isAnonymous: fd.get("isAnonymous") === "on",
  });
  if (!parsed.success) return { error: "Veuillez vérifier le formulaire.", fieldErrors: flattenErrors(parsed.error) };
  let url: string;
  try {
    const user = await getCurrentUser();
    url = await startDonation({ ...parsed.data, userId: user?.id ?? null });
  } catch (e) {
    if (e instanceof PaymentsDisabledError) return { error: "Les dons en ligne ne sont pas encore disponibles. Merci pour l'intention !" };
    return { error: e instanceof Error ? e.message : "Impossible de démarrer le don." };
  }
  redirect(url);
}
