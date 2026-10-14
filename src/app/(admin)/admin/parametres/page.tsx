import type { Metadata } from "next";
import { requirePermissionPage } from "@/server/auth/guards";
import { getSettings } from "@/server/settings";
import { features } from "@/lib/env";
import { PageHeader } from "@/components/ui/misc";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata: Metadata = { title: "Paramètres" };

export default async function AdminSettingsPage() {
  await requirePermissionPage("settings.manage");
  const settings = await getSettings();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Administration" title="Paramètres" description="Réglages globaux de la plateforme. Les secrets (PayPal, Discord, SMTP) se configurent via les variables d'environnement." />
      <SettingsForm settings={settings} integrations={{ mail: features.mail, paypal: features.paypal, discordOAuth: features.discordOAuth, discordBot: features.discordBot }} />
    </div>
  );
}
