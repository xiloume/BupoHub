import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSettings } from "@/server/settings";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { Alert } from "@/components/ui/misc";
import Link from "next/link";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: PageProps<"/connexion">) {
  const [t, settings, sp] = await Promise.all([getTranslations("auth"), getSettings(), searchParams]);
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const canRegister = settings["registration.mode"] !== "CLOSED";

  return (
    <AuthCard
      title={t("loginTitle")}
      subtitle={t("loginSubtitle")}
      footer={
        canRegister ? (
          <>
            {t("noAccount")}{" "}
            <Link href="/inscription" className="font-medium text-accent hover:underline">
              {t("registerTitle")}
            </Link>
          </>
        ) : null
      }
    >
      {sp.reset === "1" ? <Alert variant="success" className="mb-5">Mot de passe modifié. Vous pouvez vous connecter.</Alert> : null}
      {sp.expired === "1" ? <Alert variant="warning" className="mb-5">Votre session a expiré. Veuillez vous reconnecter.</Alert> : null}
      <LoginForm
        next={next}
        labels={{ identifier: t("identifier"), password: t("password"), forgot: t("forgot"), submit: t("submitLogin") }}
      />
    </AuthCard>
  );
}
