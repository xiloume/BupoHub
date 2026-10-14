import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermissionPage } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { ServiceForm } from "@/components/admin/services/service-form";

export const metadata: Metadata = { title: "Nouveau service" };

export default async function NewServicePage() {
  await requirePermissionPage("services.manage");
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/services" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> Services</Link>
      <PageHeader eyebrow="Administration" title="Nouveau service" description="Le service apparaîtra sur l'accueil s'il est public et en ligne." />
      <ServiceForm />
    </div>
  );
}
