import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Heart, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import { getSettings } from "@/server/settings";
import { listPublicServices } from "@/server/services";
import { Button } from "@/components/ui/button";
import { ServiceCard } from "@/components/services/service-card";
import { EcosystemIllustration } from "@/components/marketing/ecosystem-illustration";

export default async function HomePage() {
  const [t, user, settings, services] = await Promise.all([
    getTranslations("home"),
    getCurrentUser(),
    getSettings(),
    listPublicServices(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grid-bg absolute inset-0 -z-10" />
        <div className="absolute left-1/2 top-0 -z-10 h-[520px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(closest-side,var(--accent-soft),transparent)] blur-2xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="flex flex-col gap-7 animate-fade-up">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
              <Sparkles className="size-3.5" /> Portail central de l&apos;écosystème Bupo
            </span>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {t("heroTitle").replace("BupoHub", "")}
              <span className="text-gradient">BupoHub</span>
            </h1>
            <p className="max-w-xl text-lg text-fg-muted sm:text-xl">{settings["site.tagline"] || t("heroSubtitle")}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={user ? "/dashboard" : "/connexion"}>
                  {t("ctaPrimary")} <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="#services">{t("ctaSecondary")}</Link>
              </Button>
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-subtle">
              <li className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-accent" /> Compte unique sécurisé</li>
              <li className="inline-flex items-center gap-2"><Zap className="size-4 text-accent" /> Accès instantané</li>
              <li className="inline-flex items-center gap-2"><Heart className="size-4 text-accent" /> Projet indépendant</li>
            </ul>
          </div>
          <div className="animate-fade-in [animation-delay:150ms]">
            <EcosystemIllustration services={services.map((s) => ({ icon: s.icon, name: s.name }))} />
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="scroll-mt-24 border-t border-border bg-bg-elevated/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-accent">Services</span>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("servicesTitle")}</h2>
            <p className="max-w-2xl text-fg-muted">{t("servicesSubtitle")}</p>
          </div>
          {services.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s, i) => (
                <div key={s.id} className="animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <ServiceCard service={s} className="h-full" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-fg-muted">Les services seront bientôt disponibles.</p>
          )}
        </div>
      </section>

      {/* Soutenir */}
      {settings["donations.enabled"] ? (
        <section className="border-t border-border">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="card-surface relative overflow-hidden rounded-3xl p-8 sm:p-12">
              <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-accent-soft blur-3xl" />
              <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex max-w-2xl flex-col gap-3">
                  <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent">
                    <Heart className="size-3.5" /> {t("supportTitle")}
                  </span>
                  <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Un coup de pouce pour faire tourner les serveurs</h2>
                  <p className="text-fg-muted">{t("supportText")}</p>
                </div>
                <Button asChild size="lg">
                  <Link href="/soutenir">
                    <Heart /> {t("donate")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
