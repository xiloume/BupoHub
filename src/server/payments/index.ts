import "server-only";
import { features } from "@/lib/env";
import { PaymentsDisabledError, type PaymentProvider } from "@/server/payments/provider";
import { PayPalProvider } from "@/server/payments/paypal";

class DisabledProvider implements PaymentProvider {
  readonly name = "DISABLED" as const;
  readonly enabled = false;
  private fail(): never {
    throw new PaymentsDisabledError();
  }
  createOneTimeOrder(): never {
    return this.fail();
  }
  captureOrder(): never {
    return this.fail();
  }
  createSubscription(): never {
    return this.fail();
  }
  getSubscription(): never {
    return this.fail();
  }
  cancelSubscription(): never {
    return this.fail();
  }
  async verifyWebhook() {
    return false;
  }
}

let provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  provider ??= features.paypal ? new PayPalProvider() : new DisabledProvider();
  return provider;
}

export { PaymentsDisabledError } from "@/server/payments/provider";
export type { PaymentProvider } from "@/server/payments/provider";
