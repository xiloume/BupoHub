import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import { Logo } from "@/components/layout/logo";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="grid-bg absolute inset-0 -z-10" />
      <div className="absolute left-1/2 top-0 -z-10 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,var(--accent-soft),transparent)] blur-2xl" />
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Logo />
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
          <ArrowLeft className="size-4" /> Retour à l&apos;accueil
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md animate-fade-up">{children}</div>
      </main>
    </div>
  );
}
