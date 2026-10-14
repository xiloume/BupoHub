import "server-only";
import { db } from "@/server/db";
import { generateToken, hashToken } from "@/lib/tokens";
import { audit } from "@/server/audit";
import { mailTemplates } from "@/server/mail/mailer";
import { env } from "@/lib/env";
import type { SessionUser } from "@/server/auth/session";

export async function listInvitations() {
  return db.invitation.findMany({
    include: { role: true, createdBy: { select: { username: true } }, usedBy: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function createInvitation(
  actor: SessionUser,
  input: { email?: string; roleId: string; expiresInDays: number },
) {
  const token = generateToken();
  const inv = await db.invitation.create({
    data: {
      tokenHash: hashToken(token),
      email: input.email || null,
      roleId: input.roleId,
      createdById: actor.id,
      expiresAt: new Date(Date.now() + input.expiresInDays * 86400_000),
    },
  });
  const link = `${env.APP_URL}/inscription?invite=${token}`;
  if (inv.email) await mailTemplates.invitation(inv.email, link, actor.username).catch(() => {});
  await audit({
    action: "invitation.create",
    actorId: actor.id,
    actorLabel: actor.username,
    targetType: "invitation",
    targetId: inv.id,
    targetLabel: inv.email ?? "lien ouvert",
  });
  return { invitation: inv, link };
}

export async function revokeInvitation(actor: SessionUser, id: string) {
  const inv = await db.invitation.update({ where: { id }, data: { revokedAt: new Date() } });
  await audit({
    action: "invitation.revoke",
    actorId: actor.id,
    actorLabel: actor.username,
    targetType: "invitation",
    targetId: id,
    targetLabel: inv.email ?? "lien ouvert",
  });
}
