import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotForm } from "@/components/auth/forgot-form";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default async function ForgotPage() {
  const t = await getTranslations("auth");
  return (
    <AuthCard
      title={t("forgotTitle")}
      subtitle={t("forgotSubtitle")}
      footer={
        <Link href="/connexion" className="font-medium text-accent hover:underline">
          Retour à la connexion
        </Link>
      }
    >
      <ForgotForm labels={{ email: t("email"), submit: t("submitForgot") }} />
    </AuthCard>
  );
}
