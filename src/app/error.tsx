"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-300"><AlertTriangle className="size-7" /></div>
      <h1 className="text-2xl font-semibold tracking-tight">Une erreur est survenue</h1>
      <p className="max-w-md text-sm text-fg-muted">
        Nous n&apos;avons pas pu afficher cette page. Réessayez ou revenez à l&apos;accueil.
        {error.digest ? <span className="mt-2 block font-mono text-xs text-fg-subtle">Référence : {error.digest}</span> : null}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Réessayer</Button>
        <Button asChild variant="secondary"><Link href="/">Accueil</Link></Button>
      </div>
    </div>
  );
}
