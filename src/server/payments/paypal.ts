import "server-only";
import { env } from "@/lib/env";
import type { PaymentProvider } from "@/server/payments/provider";

/**
 * Implémentation PayPal via l'API REST v2 (orders) et v1 (subscriptions, webhooks).
 * Documentation : https://developer.paypal.com/docs/api/
 */
export class PayPalProvider implements PaymentProvider {
  readonly name = "PAYPAL" as const;
  readonly enabled = true;
  private token: { value: string; expiresAt: number } | null = null;

  private get base() {
    return env.PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  }

  private async accessToken() {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const creds = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString("base64");
    const res = await fetch(`${this.base}/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return data.access_token;
  }

  private async call<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
    const token = await this.accessToken();
    const res = await fetch(`${this.base}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`PayPal ${init.method ?? "GET"} ${path} → ${res.status} ${text.slice(0, 300)}`);
    }
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }

  private approveLink(links: { rel: string; href: string }[] | undefined) {
    const link = links?.find((l) => l.rel === "approve" || l.rel === "payer-action");
    if (!link) throw new Error("PayPal : lien d'approbation introuvable");
    return link.href;
  }

  async createOneTimeOrder(input: Parameters<PaymentProvider["createOneTimeOrder"]>[0]) {
    const data = await this.call<{ id: string; links: { rel: string; href: string }[] }>("/v2/checkout/orders", {
      method: "POST",
      json: {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: input.reference,
            description: input.description,
            amount: { currency_code: input.currency, value: (input.amountCents / 100).toFixed(2) },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: env.APP_NAME,
              user_action: "PAY_NOW",
              return_url: input.returnUrl,
              cancel_url: input.cancelUrl,
            },
          },
        },
      },
    });
    return { orderId: data.id, approveUrl: this.approveLink(data.links) };
  }

  async captureOrder(orderId: string) {
    const data = await this.call<{ status: string; payer?: { email_address?: string } }>(
      `/v2/checkout/orders/${orderId}/capture`,
      { method: "POST", json: {} },
    );
    const status = data.status === "COMPLETED" ? "COMPLETED" : data.status === "PENDING" ? "PENDING" : "FAILED";
    return { status: status as "COMPLETED" | "PENDING" | "FAILED", payerEmail: data.payer?.email_address };
  }

  async createSubscription(input: Parameters<PaymentProvider["createSubscription"]>[0]) {
    const data = await this.call<{ id: string; links: { rel: string; href: string }[] }>("/v1/billing/subscriptions", {
      method: "POST",
      json: {
        plan_id: input.providerPlanId,
        custom_id: input.reference,
        application_context: {
          brand_name: env.APP_NAME,
          user_action: "SUBSCRIBE_NOW",
          return_url: input.returnUrl,
          cancel_url: input.cancelUrl,
        },
      },
    });
    return { subscriptionId: data.id, approveUrl: this.approveLink(data.links) };
  }

  async getSubscription(subscriptionId: string) {
    const data = await this.call<{ status: string; billing_info?: { next_billing_time?: string } }>(
      `/v1/billing/subscriptions/${subscriptionId}`,
    );
    return {
      status: data.status as "ACTIVE" | "APPROVAL_PENDING" | "SUSPENDED" | "CANCELLED" | "EXPIRED",
      currentPeriodEnd: data.billing_info?.next_billing_time ? new Date(data.billing_info.next_billing_time) : undefined,
    };
  }

  async cancelSubscription(subscriptionId: string, reason = "Annulation par l'utilisateur") {
    await this.call(`/v1/billing/subscriptions/${subscriptionId}/cancel`, { method: "POST", json: { reason } });
  }

  async verifyWebhook(headers: Headers, rawBody: string) {
    if (!env.PAYPAL_WEBHOOK_ID) return false;
    const data = await this.call<{ verification_status: string }>("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      json: {
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: env.PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(rawBody),
      },
    });
    return data.verification_status === "SUCCESS";
  }
}
