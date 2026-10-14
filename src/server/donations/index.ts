import "server-only";
import { db } from "@/server/db";
import { getPaymentProvider } from "@/server/payments";
import { getSettings } from "@/server/settings";
import { audit } from "@/server/audit";
import { notifyUser } from "@/server/notifications";
import { env } from "@/lib/env";

export async function donationsEnabled() {
  return (await getSettings())["donations.enabled"];
}

/** Crée une donation PENDING et retourne l'URL d'approbation PayPal. */
export async function startDonation(input: {
  userId?: string | null;
  amountCents: number;
  currency?: string;
  message?: string;
  donorName?: string;
  isAnonymous?: boolean;
}) {
  if (!(await donationsEnabled())) throw new Error("Les donations sont désactivées.");
  const provider = getPaymentProvider();
  const donation = await db.donation.create({
    data: {
      userId: input.userId ?? null,
      amountCents: input.amountCents,
      currency: input.currency ?? "EUR",
      message: input.message || null,
      donorName: input.donorName || null,
      isAnonymous: input.isAnonymous ?? false,
      provider: "PAYPAL",
    },
  });
  const { orderId, approveUrl } = await provider.createOneTimeOrder({
    amountCents: donation.amountCents,
    currency: donation.currency,
    description: `Don à ${env.APP_NAME}`,
    reference: donation.id,
    returnUrl: `${env.APP_URL}/soutenir?status=approved&don=${donation.id}`,
    cancelUrl: `${env.APP_URL}/soutenir?status=cancelled`,
  });
  await db.donation.update({ where: { id: donation.id }, data: { providerOrderId: orderId } });
  return approveUrl;
}

/** Capture après retour PayPal. Idempotent. */
export async function completeDonation(donationId: string) {
  const donation = await db.donation.findUnique({ where: { id: donationId } });
  if (!donation?.providerOrderId) return null;
  if (donation.status === "COMPLETED") return donation;
  const result = await getPaymentProvider().captureOrder(donation.providerOrderId);
  const status = result.status === "COMPLETED" ? "COMPLETED" : result.status === "PENDING" ? "PENDING" : "FAILED";
  const updated = await db.donation.update({
    where: { id: donation.id },
    data: { status, completedAt: status === "COMPLETED" ? new Date() : null },
  });
  if (status === "COMPLETED") {
    await audit({ action: "donation.record", actorId: donation.userId, actorType: donation.userId ? "USER" : "SYSTEM", targetType: "donation", targetId: donation.id, metadata: { amountCents: donation.amountCents } });
    if (donation.userId) {
      await notifyUser(donation.userId, { type: "SUCCESS", title: "Merci pour votre don !", body: "Votre soutien aide à faire vivre l'écosystème Bupo." });
    }
  }
  return updated;
}

export async function listDonations(params: { page?: number } = {}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = 25;
  const [items, total, sums] = await Promise.all([
    db.donation.findMany({
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.donation.count(),
    db.donation.aggregate({ where: { status: "COMPLETED" }, _sum: { amountCents: true }, _count: true }),
  ]);
  return {
    items,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    totalCents: sums._sum.amountCents ?? 0,
    completedCount: sums._count,
  };
}
