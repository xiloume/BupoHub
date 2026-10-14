/**
 * Catalogue des permissions BupoHub.
 * Les clés sont stockées en base (table `permissions`) et liées aux rôles.
 * Ajouter une permission ici puis relancer le seed pour la créer.
 */
export const PERMISSIONS = {
  "admin.access": "Accéder à l'interface d'administration",
  "admin.stats": "Voir les statistiques globales",
  "users.read": "Voir les utilisateurs",
  "users.write": "Créer et modifier des utilisateurs",
  "users.delete": "Supprimer des utilisateurs",
  "users.roles": "Modifier les rôles des utilisateurs",
  "users.suspend": "Suspendre / réactiver des comptes",
  "invitations.manage": "Gérer les invitations",
  "services.manage": "Gérer les services",
  "services.access": "Gérer les accès aux services",
  "subscriptions.manage": "Gérer les abonnements et les plans",
  "donations.read": "Voir les donations",
  "discord.manage": "Gérer les liaisons Discord et les clés API",
  "notifications.send": "Envoyer des notifications",
  "audit.read": "Consulter le journal d'audit",
  "settings.manage": "Modifier les réglages de la plateforme",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const ROLE_PERMISSIONS: Record<string, readonly PermissionKey[]> = {
  user: [],
  moderator: ["admin.access", "admin.stats", "users.read", "users.suspend", "audit.read", "notifications.send"],
  admin: Object.keys(PERMISSIONS) as PermissionKey[],
};

export const SYSTEM_ROLES = [
  { slug: "user", name: "Utilisateur", priority: 0, description: "Accès standard à BupoHub." },
  { slug: "moderator", name: "Modérateur", priority: 50, description: "Peut modérer les utilisateurs." },
  { slug: "admin", name: "Administrateur", priority: 100, description: "Accès complet à la plateforme." },
] as const;
