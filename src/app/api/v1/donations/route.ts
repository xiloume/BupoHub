import { ok, options, parseBody, withPublic, ApiError } from "@/server/api";
import { getCurrentUser } from "@/server/auth/session";
import { donationsEnabled, startDonation } from "@/server/donations";
import { PaymentsDisabledError } from "@/server/payments";
import { donationSchema } from "@/lib/validation";

export const OPTIONS = options;

/** Démarre un don : retourne l'URL d'approbation PayPal. */
export const POST = withPublic(async (req) => {
  if (!(await donationsEnabled())) throw new ApiError(404, "DISABLED", "Les donations sont désactivées.");
  const body = await parseBody(req, donationSchema);
  const user = await getCurrentUser();
  try {
    const approveUrl = await startDonation({ ...body, userId: user?.id ?? null });
    return ok(req, { approveUrl });
  } catch (e) {
    if (e instanceof PaymentsDisabledError) throw new ApiError(503, "PAYMENTS_DISABLED", e.message);
    throw e;
  }
});
