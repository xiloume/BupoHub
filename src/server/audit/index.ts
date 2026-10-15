import "server-only";
import { db, type Prisma } from "@/server/db";
import type { ActorType } from "@/server/db";
import { getRequestMeta } from "@/server/auth/session";

export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.password_reset"
  | "auth.register"
  | "user.create"
  | "user.update"
  | "user.role_change"
  | "user.suspend"
  | "user.reactivate"
  | "user.delete"
  | "user.password_reset_link"
  | "user.sessions_revoked"
  | "user.service_grant"
  | "user.service_revoke"
  | "invitation.create"
  | "invitation.revoke"
  | "service.create"
  | "service.update"
  | "service.delete"
  | "service.reorder"
  | "service.connect"
  | "subscription.plan_create"
  | "subscription.plan_update"
  | "subscription.plan_delete"
  | "subscription.create"
  | "subscription.update"
  | "subscription.cancel"
  | "donation.record"
  | "discord.link"
  | "discord.unlink"
  | "apikey.create"
  | "apikey.revoke"
  | "notification.send"
  | "settings.update"
  | (string & {});

export type AuditInput = {
  action: AuditAction;
  actorId?: string | null;
  actorType?: ActorType;
  actorLabel?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  targetLabel?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function audit(input: AuditInput) {
  let ip: string | null = null;
  try {
    ip = (await getRequestMeta()).ip;
  } catch {
    // hors contexte de requête (seed, cron)
  }
  return db.auditLog.create({
    data: {
      action: input.action,
      actorId: input.actorId ?? null,
      actorType: input.actorType ?? (input.actorId ? "USER" : "SYSTEM"),
      actorLabel: input.actorLabel ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      targetLabel: input.targetLabel ?? null,
      metadata: input.metadata,
      ip,
    },
  });
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "auth.login": "Connexion",
  "auth.logout": "Déconnexion",
  "auth.password_reset": "Mot de passe réinitialisé",
  "auth.register": "Inscription",
  "user.create": "Utilisateur créé",
  "user.update": "Utilisateur modifié",
  "user.role_change": "Rôle modifié",
  "user.suspend": "Compte désactivé",
  "user.reactivate": "Compte réactivé",
  "user.delete": "Compte supprimé",
  "user.password_reset_link": "Lien de réinitialisation généré",
  "user.sessions_revoked": "Sessions révoquées",
  "user.service_grant": "Accès service accordé",
  "user.service_revoke": "Accès service retiré",
  "invitation.create": "Invitation créée",
  "invitation.revoke": "Invitation révoquée",
  "service.create": "Service ajouté",
  "service.update": "Service modifié",
  "service.delete": "Service supprimé",
  "service.reorder": "Services réordonnés",
  "service.connect": "Connexion au service",
  "service.credential_create": "Identifiants de service créés",
  "service.credential_rotate": "Mot de passe de service régénéré",
  "service.credential_set": "Mot de passe de service défini",
  "subscription.plan_create": "Plan créé",
  "subscription.plan_update": "Plan modifié",
  "subscription.plan_delete": "Plan supprimé",
  "subscription.create": "Abonnement créé",
  "subscription.update": "Abonnement modifié",
  "subscription.cancel": "Abonnement annulé",
  "plan.access_grant": "Accès à une offre accordé",
  "plan.access_revoke": "Accès à une offre retiré",
  "donation.record": "Donation enregistrée",
  "discord.link": "Compte Discord lié",
  "discord.unlink": "Compte Discord délié",
  "apikey.create": "Clé API créée",
  "apikey.revoke": "Clé API révoquée",
  "notification.send": "Notification envoyée",
  "settings.update": "Réglages modifiés",
};
