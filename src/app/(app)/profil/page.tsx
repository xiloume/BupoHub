import type { Metadata } from "next";
import { requireUserPage } from "@/server/auth/guards";
import { getCurrentSessionId } from "@/server/auth/session";
import { db } from "@/server/db";
import { features } from "@/lib/env";
import { PageHeader } from "@/components/ui/misc";
import { ProfileTabs } from "@/components/profile/profile-tabs";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage({ searchParams }: PageProps<"/profil">) {
  const user = await requireUserPage();
  const [sessions, currentSessionId, history, discord, sp] = await Promise.all([
    db.session.findMany({
      where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastActiveAt: "desc" },
      select: { id: true, ip: true, userAgent: true, createdAt: true, lastActiveAt: true },
    }),
    getCurrentSessionId(),
    db.loginHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, ip: true, userAgent: true, success: true, reason: true, createdAt: true },
    }),
    db.discordAccount.findUnique({ where: { userId: user.id } }),
    searchParams,
  ]);
  const prefs = (user.preferences ?? {}) as { accent?: string; emailNotifications?: boolean };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Mon espace" title="Profil" description="Gérez vos informations, votre sécurité et vos préférences." />
      <ProfileTabs
        defaultTab={typeof sp.tab === "string" ? sp.tab : "infos"}
        user={{
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          locale: user.locale,
          accent: prefs.accent ?? "amber",
          emailNotifications: prefs.emailNotifications ?? true,
        }}
        sessions={sessions}
        currentSessionId={currentSessionId}
        history={history}
        discord={discord ? { username: discord.username, globalName: discord.globalName, discordUserId: discord.discordUserId, avatar: discord.avatar, linkedAt: discord.linkedAt } : null}
        discordOAuthAvailable={features.discordOAuth}
        flash={typeof sp.discord === "string" ? sp.discord : undefined}
      />
    </div>
  );
}
