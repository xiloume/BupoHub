import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermissionPage } from "@/server/auth/guards";
import { db } from "@/server/db";
import { PageHeader, Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ServicesList } from "@/components/admin/services/services-list";

export const metadata: Metadata = { title: "Services" };

export default async function AdminServicesPage({ searchParams }: PageProps<"/admin/services">) {
  await requirePermissionPage("services.manage");
  const [services, sp] = await Promise.all([
    db.service.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { userServices: true } } } }),
    searchParams,
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Administration"
        title="Services"
        description="Ajoutez, modifiez et ordonnez les services affichés sur BupoHub."
        actions={<Button asChild><Link href="/admin/services/nouveau"><Plus /> Nouveau service</Link></Button>}
      />
      {sp.deleted === "1" ? <Alert variant="success">Service supprimé.</Alert> : null}
      <ServicesList
        services={services.map((s) => ({
          id: s.id,
          slug: s.slug,
          name: s.name,
          description: s.description,
          url: s.url,
          icon: s.icon,
          status: s.status,
          visibility: s.visibility,
          requiresSubscription: s.requiresSubscription,
          grants: s._count.userServices,
        }))}
      />
    </div>
  );
}
