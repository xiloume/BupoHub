import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermissionPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { PageHeader, Alert } from "@/components/ui/misc";
import { ServiceForm } from "@/components/admin/services/service-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { formatDate } from "@/lib/meta";

export const metadata: Metadata = { title: "Modifier le service" };

export default async function EditServicePage({ params, searchParams }: PageProps<"/admin/services/[id]">) {
  await requirePermissionPage("services.manage");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const service = await db.service.findUnique({
    where: { id },
    include: { userServices: { include: { user: { select: { id: true, username: true, avatarUrl: true } }, grantedBy: { select: { username: true } } }, orderBy: { grantedAt: "desc" } } },
  });
  if (!service) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/services" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> Services</Link>
      <PageHeader eyebrow="Administration" title={service.name} description={`Créé le ${formatDate(service.createdAt, { dateStyle: "long" })} · modifié ${formatDate(service.updatedAt)}`} />
      {sp.created === "1" ? <Alert variant="success">Service créé.</Alert> : null}
      <ServiceForm initial={{ ...service }} />
      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs autorisés ({service.userServices.length})</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {service.userServices.length === 0 ? (
            <p className="text-sm text-fg-subtle">Aucun accès explicite. {service.visibility === "PUBLIC" ? "Le service est public." : "Accordez des accès depuis la fiche d'un utilisateur."}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {service.userServices.map((us) => (
                <li key={us.userId} className="flex items-center gap-3 py-2.5">
                  <Avatar src={us.user.avatarUrl} name={us.user.username} size="sm" />
                  <Link href={`/admin/utilisateurs/${us.user.id}`} className="flex-1 text-sm font-medium hover:text-accent">{us.user.username}</Link>
                  <span className="text-xs text-fg-subtle">accordé par {us.grantedBy?.username ?? "—"} · {formatDate(us.grantedAt, { dateStyle: "medium" })}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
