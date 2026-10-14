import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="grid-bg absolute inset-0 -z-10" />
      <Logo />
      <div className="flex size-16 items-center justify-center rounded-2xl bg-accent-soft text-accent"><Compass className="size-8" /></div>
      <h1 className="text-4xl font-semibold tracking-tight">Page introuvable</h1>
      <p className="max-w-md text-fg-muted">Cette page n&apos;existe pas ou n&apos;est plus disponible.</p>
      <div className="flex gap-3">
        <Button asChild><Link href="/">Retour à l&apos;accueil</Link></Button>
        <Button asChild variant="secondary"><Link href="/dashboard">Mon espace</Link></Button>
      </div>
    </div>
  );
}
