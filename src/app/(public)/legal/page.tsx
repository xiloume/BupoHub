import type { Metadata } from "next";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Mentions légales" };

export default function LegalPage() {
  return (
    <article className="prose-invert mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Mentions légales & confidentialité</h1>
      <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-fg-muted">
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-fg">Éditeur</h2>
          <p>{env.APP_NAME} est un portail privé et indépendant regroupant les services de l&apos;écosystème Bupo. Il est édité et hébergé par son administrateur. Pour toute question, contactez un administrateur via le Discord Bupo.</p>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-fg">Données collectées</h2>
          <p>Pour fonctionner, {env.APP_NAME} enregistre : votre adresse email, votre nom d&apos;utilisateur, un hachage de votre mot de passe (jamais le mot de passe lui-même), votre avatar éventuel, vos préférences, l&apos;historique de vos connexions (date, adresse IP, navigateur) et, si vous le liez, l&apos;identifiant public de votre compte Discord.</p>
          <p>Ces données servent uniquement à vous authentifier, sécuriser votre compte et vous donner accès aux services. Elles ne sont ni vendues ni transmises à des tiers.</p>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-fg">Paiements</h2>
          <p>Les abonnements et dons éventuels sont traités par PayPal. {env.APP_NAME} ne collecte ni ne stocke aucune donnée bancaire : seuls des identifiants de transaction opaques sont conservés pour le suivi.</p>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-fg">Cookies</h2>
          <p>Un cookie strictement nécessaire maintient votre session connectée ; un second mémorise votre langue. Aucun cookie publicitaire ou de suivi tiers n&apos;est utilisé.</p>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-fg">Vos droits</h2>
          <p>Vous pouvez modifier vos informations et supprimer votre avatar depuis votre profil, et demander la suppression de votre compte à un administrateur. Les journaux d&apos;administration peuvent conserver des traces anonymisées des actions effectuées.</p>
        </section>
      </div>
    </article>
  );
}
