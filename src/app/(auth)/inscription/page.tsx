import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getSettings } from "@/server/settings";
import { validateInvitation } from "@/server/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function RegisterPage({ searchParams }: PageProps<"/inscription">) {
  const [t, settings, sp] = await Promise.all([getTranslations("auth"), getSettings(), searchParams]);
  const invite = typeof sp.invite === "string" ? sp.invite : undefined;
  const mode = settings["registration.mode"];

  const footer = (
    <>
      {t("hasAccount")}{" "}
      <Link href="/connexion" className="font-medium text-accent hover:underline">
        {t("loginTitle")}
      </Link>
    </>
  );

  if (mode === "CLOSED") {
    return (
      <AuthCard title={t("registerTitle")} footer={footer}>
        <Alert variant="warning">Les inscriptions sont actuellement fermées.</Alert>
      </AuthCard>
    );
  }

  const invitation = invite ? await validateInvitation(invite) : null;

  if (mode === "INVITE_ONLY" && !invitation) {
    return (
      <AuthCard title={t("registerTitle")} subtitle={t("inviteRequired")} footer={footer}>
        <Alert variant={invite ? "danger" : "info"}>
          {invite
            ? "Cette invitation est invalide, expirée ou déjà utilisée."
            : "Pour rejoindre BupoHub, demandez un lien d'invitation à un administrateur ou sur le Discord Bupo."}
        </Alert>
        <Button asChild variant="secondary" className="mt-5 w-full">
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("registerTitle")} subtitle={t("registerSubtitle")} footer={footer}>
      {invitation ? (
        <Alert variant="success" className="mb-5">
          Invitation de <strong>{invitation.createdBy.username}</strong> · rôle « {invitation.role.name} »
        </Alert>
      ) : null}
      <RegisterForm
        invite={invite}
        lockedEmail={invitation?.email ?? undefined}
        labels={{ email: t("email"), username: t("username"), password: t("password"), confirm: t("confirmPassword"), submit: t("submitRegister") }}
      />
    </AuthCard>
  );
}
