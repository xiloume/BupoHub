import "server-only";

/**
 * Abstraction des fournisseurs de paiement.
 * Aucune donnée bancaire ne transite ni n'est stockée par BupoHub :
 * seuls des identifiants opaques (order/subscription IDs) sont conservés.
 */
export interface PaymentProvider {
  readonly name: "PAYPAL" | "DISABLED";
  readonly enabled: boolean;

  /** Crée une commande ponctuelle (donation). Retourne l'URL d'approbation et l'ID de commande. */
  createOneTimeOrder(input: {
    amountCents: number;
    currency: string;
    description: string;
    returnUrl: string;
    cancelUrl: string;
    reference: string;
  }): Promise<{ orderId: string; approveUrl: string }>;

  /** Capture une commande approuvée. */
  captureOrder(orderId: string): Promise<{ status: "COMPLETED" | "PENDING" | "FAILED"; payerEmail?: string }>;

  /** Démarre un abonnement sur un plan du fournisseur. */
  createSubscription(input: {
    providerPlanId: string;
    returnUrl: string;
    cancelUrl: string;
    reference: string;
  }): Promise<{ subscriptionId: string; approveUrl: string }>;

  getSubscription(subscriptionId: string): Promise<{
    status: "ACTIVE" | "APPROVAL_PENDING" | "SUSPENDED" | "CANCELLED" | "EXPIRED";
    currentPeriodEnd?: Date;
  }>;

  cancelSubscription(subscriptionId: string, reason?: string): Promise<void>;

  /** Vérifie l'authenticité d'un webhook entrant. */
  verifyWebhook(headers: Headers, rawBody: string): Promise<boolean>;
}

export class PaymentsDisabledError extends Error {
  constructor() {
    super("Les paiements ne sont pas configurés sur cette instance.");
  }
}
