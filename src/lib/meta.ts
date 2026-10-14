/** Métadonnées d'affichage partagées client/serveur (pas de dépendance DB). */

export const SERVICE_STATUS_META = {
  ONLINE: { label: "En ligne", color: "text-emerald-400", dot: "bg-emerald-400" },
  OFFLINE: { label: "Hors ligne", color: "text-red-400", dot: "bg-red-400" },
  MAINTENANCE: { label: "Maintenance", color: "text-amber-400", dot: "bg-amber-400" },
  HIDDEN: { label: "Masqué", color: "text-zinc-400", dot: "bg-zinc-500" },
} as const;

export const USER_STATUS_META = {
  ACTIVE: { label: "Actif", variant: "success" },
  SUSPENDED: { label: "Suspendu", variant: "warning" },
  DELETED: { label: "Supprimé", variant: "danger" },
} as const;

export const SUBSCRIPTION_STATUS_META = {
  ACTIVE: { label: "Actif", variant: "success" },
  PENDING: { label: "En attente", variant: "muted" },
  PAST_DUE: { label: "Impayé", variant: "warning" },
  CANCELED: { label: "Annulé", variant: "muted" },
  EXPIRED: { label: "Expiré", variant: "danger" },
} as const;

export const DONATION_STATUS_META = {
  PENDING: { label: "En attente", variant: "muted" },
  COMPLETED: { label: "Reçue", variant: "success" },
  FAILED: { label: "Échouée", variant: "danger" },
  REFUNDED: { label: "Remboursée", variant: "warning" },
} as const;

export const NOTIFICATION_TYPE_META = {
  INFO: { label: "Info", icon: "Info", color: "text-sky-400" },
  SUCCESS: { label: "Succès", icon: "CheckCircle2", color: "text-emerald-400" },
  WARNING: { label: "Attention", icon: "AlertTriangle", color: "text-amber-400" },
  SERVICE: { label: "Service", icon: "LayoutGrid", color: "text-violet-400" },
  SUBSCRIPTION: { label: "Abonnement", icon: "CreditCard", color: "text-amber-400" },
  ACCOUNT: { label: "Compte", icon: "UserRound", color: "text-sky-400" },
  MAINTENANCE: { label: "Maintenance", icon: "Wrench", color: "text-orange-400" },
  ADMIN: { label: "Administration", icon: "ShieldCheck", color: "text-rose-400" },
} as const;

export function formatMoney(cents: number, currency = "EUR", locale = "fr-FR") {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}

export function formatDate(d: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", opts ?? { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(d),
  );
}

export function formatRelative(d: Date | string) {
  const diff = (new Date(d).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return formatDate(d, { dateStyle: "medium" });
}

export function initials(name: string) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
