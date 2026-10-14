import type { Metadata } from "next";
import { requirePermissionPage } from "@/server/auth/guards";
import { listInvitations } from "@/server/invitations";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";
import { PageHeader, Alert } from "@/components/ui/misc";
import { InvitationsManager } from "@/components/admin/invitations-manager";

export const metadata: Metadata = { title: "Invitations" };

export default async function AdminInvitationsPage() {
  await requirePermissionPage("invitations.manage");
  const [invitations, roles, settings] = await Promise.all([
    listInvitations(),
    db.role.findMany({ orderBy: { priority: "asc" } }),
    getSettings(),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Administration" title="Invitations" description="Générez des liens d'invitation pour permettre la création de comptes." />
      {settings["registration.mode"] === "OPEN" ? (
        <Alert variant="info">Les inscriptions sont actuellement ouvertes à tous : les invitations restent utilisables pour attribuer un rôle précis.</Alert>
      ) : settings["registration.mode"] === "CLOSED" ? (
        <Alert variant="warning">Les inscriptions sont fermées : les liens d&apos;invitation ne fonctionneront pas tant que le mode n&apos;est pas « sur invitation » ou « ouvert ».</Alert>
      ) : null}
      <InvitationsManager
        roles={roles}
        invitations={invitations.map((i) => ({
          id: i.id,
          email: i.email,
          roleName: i.role.name,
          createdBy: i.createdBy.username,
          usedBy: i.usedBy?.username ?? null,
          createdAt: i.createdAt,
          expiresAt: i.expiresAt,
          usedAt: i.usedAt,
          revokedAt: i.revokedAt,
        }))}
      />
    </div>
  );
}
