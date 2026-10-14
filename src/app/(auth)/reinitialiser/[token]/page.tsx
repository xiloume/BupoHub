import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { db } from "@/server/db";
import { hashToken } from "@/lib/tokens";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetForm } from "@/components/auth/forgot-form";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function ResetPage({ params }: PageProps<"/reinitialiser/[token]">) {
  const [{ token }, t] = await Promise.all([params, getTranslations("auth")]);
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) }, select: { usedAt: true, expiresAt: true } });
  const valid = record && !record.usedAt && record.expiresAt > new Date();

  return (
    <AuthCard
      title={t("resetTitle")}
      footer={
        <Link href="/connexion" className="font-medium text-accent hover:underline">
          Retour à la connexion
        </Link>
      }
    >
      {valid ? (
        <ResetForm token={token} labels={{ password: t("password"), confirm: t("confirmPassword"), submit: t("submitReset") }} />
      ) : (
        <>
          <Alert variant="danger">Ce lien de réinitialisation est invalide ou a expiré.</Alert>
          <Button asChild variant="secondary" className="mt-5 w-full">
            <Link href="/mot-de-passe-oublie">Demander un nouveau lien</Link>
          </Button>
        </>
      )}
    </AuthCard>
  );
}
