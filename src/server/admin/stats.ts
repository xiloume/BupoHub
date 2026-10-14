import "server-only";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";

export async function getAdminStats() {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400_000);
  const d30 = new Date(now.getTime() - 30 * 86400_000);
  const settings = await getSettings();

  const [
    totalUsers,
    activeUsers,
    newUsers7,
    newUsers30,
    suspended,
    servicesActive,
    servicesTotal,
    activeSubs,
    revenue,
    donations,
    recentAudit,
    recentUsers,
    pendingInvites,
    discordLinked,
    signupsByDay,
  ] = await Promise.all([
    db.user.count({ where: { status: { not: "DELETED" } } }),
    db.user.count({ where: { status: "ACTIVE", lastLoginAt: { gte: d30 } } }),
    db.user.count({ where: { createdAt: { gte: d7 }, status: { not: "DELETED" } } }),
    db.user.count({ where: { createdAt: { gte: d30 }, status: { not: "DELETED" } } }),
    db.user.count({ where: { status: "SUSPENDED" } }),
    db.service.count({ where: { status: "ONLINE" } }),
    db.service.count(),
    db.subscription.count({ where: { status: "ACTIVE" } }),
    db.subscription.findMany({ where: { status: "ACTIVE" }, select: { plan: { select: { priceCents: true, interval: true } } } }),
    db.donation.aggregate({ where: { status: "COMPLETED", completedAt: { gte: d30 } }, _sum: { amountCents: true }, _count: true }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: { select: { username: true } } } }),
    db.user.findMany({ where: { status: { not: "DELETED" } }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, username: true, email: true, avatarUrl: true, createdAt: true, role: { select: { name: true } } } }),
    db.invitation.count({ where: { usedAt: null, revokedAt: null, expiresAt: { gt: now } } }),
    db.discordAccount.count(),
    db.user.findMany({ where: { createdAt: { gte: d30 }, status: { not: "DELETED" } }, select: { createdAt: true } }),
  ]);

  const mrrCents = revenue.reduce((sum, s) => sum + (s.plan.interval === "YEAR" ? Math.round(s.plan.priceCents / 12) : s.plan.priceCents), 0);

  const days: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400_000);
    days.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  for (const u of signupsByDay) {
    const key = u.createdAt.toISOString().slice(0, 10);
    const row = days.find((x) => x.date === key);
    if (row) row.count++;
  }

  return {
    totalUsers,
    activeUsers,
    newUsers7,
    newUsers30,
    suspended,
    servicesActive,
    servicesTotal,
    activeSubs,
    mrrCents,
    donationsCents30: donations._sum.amountCents ?? 0,
    donationsCount30: donations._count,
    subscriptionsEnabled: settings["subscriptions.enabled"],
    donationsEnabled: settings["donations.enabled"],
    recentAudit,
    recentUsers,
    pendingInvites,
    discordLinked,
    signups: days,
  };
}
