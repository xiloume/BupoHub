import { NextResponse, type NextRequest } from "next/server";
import { getPaymentProvider } from "@/server/payments";
import { syncSubscriptionByProviderId } from "@/server/subscriptions";
import { completeDonation } from "@/server/donations";
import { db } from "@/server/db";
import { audit } from "@/server/audit";

/**
 * Webhook PayPal. La signature est vérifiée auprès de PayPal avant tout traitement.
 * Événements gérés : abonnements (BILLING.SUBSCRIPTION.*) et paiements ponctuels (CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.*).
 */
export async function POST(req: NextRequest) {
  const provider = getPaymentProvider();
  if (!provider.enabled) return NextResponse.json({ error: "disabled" }, { status: 503 });

  const raw = await req.text();
  const valid = await provider.verifyWebhook(req.headers, raw).catch(() => false);
  if (!valid) return NextResponse.json({ error: "invalid signature" }, { status: 400 });

  const event = JSON.parse(raw) as { id: string; event_type: string; resource?: Record<string, unknown> };
  const type = event.event_type;
  const resource = event.resource ?? {};

  try {
    if (type.startsWith("BILLING.SUBSCRIPTION.")) {
      const id = String(resource.id ?? "");
      if (id) await syncSubscriptionByProviderId(id);
    } else if (type === "PAYMENT.SALE.COMPLETED" && resource.billing_agreement_id) {
      await syncSubscriptionByProviderId(String(resource.billing_agreement_id));
    } else if (type === "CHECKOUT.ORDER.APPROVED") {
      const orderId = String(resource.id ?? "");
      const donation = await db.donation.findUnique({ where: { providerOrderId: orderId }, select: { id: true } });
      if (donation) await completeDonation(donation.id);
    } else if (type === "PAYMENT.CAPTURE.REFUNDED") {
      const orderId = (resource.supplementary_data as { related_ids?: { order_id?: string } } | undefined)?.related_ids?.order_id;
      if (orderId) await db.donation.updateMany({ where: { providerOrderId: orderId }, data: { status: "REFUNDED" } });
    }
    await audit({ action: "webhook.paypal", actorType: "SYSTEM", actorLabel: "PayPal", targetType: "webhook", targetId: event.id, metadata: { type } });
  } catch (e) {
    console.error("[paypal webhook]", e);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
