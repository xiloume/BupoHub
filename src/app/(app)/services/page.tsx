import type { Metadata } from "next";
import { LayoutGrid } from "lucide-react";
import { requireUserPage } from "@/server/auth/guards";
import { listServicesForUser } from "@/server/services";
import { ServiceCard } from "@/components/services/service-card";
import { EmptyState, PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  const user = await requireUserPage();
  const services = await listServicesForUser(user.id);
  const accessible = services.filter((s) => s.hasAccess);
  const locked = services.filter((s) => !s.hasAccess);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Mon espace" title="Services" description="Tous les services Bupo auxquels vous avez accès, au même endroit." />
      {services.length === 0 ? (
        <EmptyState icon={<LayoutGrid />} title="Aucun service disponible" description="Les services apparaîtront ici dès qu'ils seront ajoutés." />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {accessible.map((s) => (
              <ServiceCard key={s.id} service={s} variant="dashboard" />
            ))}
          </section>
          {locked.length ? (
            <section className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Autres services</h2>
                <p className="text-sm text-fg-muted">Accès réservé ou sur demande.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {locked.map((s) => (
                  <ServiceCard key={s.id} service={s} variant="dashboard" className="opacity-80" />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
