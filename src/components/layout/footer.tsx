import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export function Footer({ showSupport = true }: { showSupport?: boolean }) {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="text-sm text-fg-subtle">Le portail central de l&apos;écosystème Bupo.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted">
          <Link href="/#services" className="hover:text-fg">Services</Link>
          {showSupport ? <Link href="/soutenir" className="hover:text-fg">Soutenir Bupo</Link> : null}
          <Link href="/connexion" className="hover:text-fg">Connexion</Link>
          <Link href="/legal" className="hover:text-fg">Mentions légales</Link>
        </nav>
        <p className="text-xs text-fg-subtle">© {new Date().getFullYear()} Bupo. Tous droits réservés.</p>
      </div>
    </footer>
  );
}
