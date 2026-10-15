import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Adresse email invalide").max(254);

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "3 caractères minimum")
  .max(32, "32 caractères maximum")
  .regex(/^[a-zA-Z0-9_.-]+$/, "Lettres, chiffres, _ . - uniquement");

export const passwordSchema = z
  .string()
  .min(8, "8 caractères minimum")
  .max(128, "128 caractères maximum")
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), "Doit contenir au moins une lettre et un chiffre");

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email ou nom d'utilisateur requis"),
  password: z.string().min(1, "Mot de passe requis"),
  next: z.string().optional(),
});

export const registerSchema = z
  .object({
    invite: z.string().optional(),
    email: emailSchema,
    username: usernameSchema,
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Les mots de passe ne correspondent pas" });

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z
  .object({ token: z.string().min(10), password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Les mots de passe ne correspondent pas" });

export const profileSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  displayName: z.string().trim().max(64).optional().or(z.literal("")),
});

export const changePasswordSchema = z
  .object({ current: z.string().min(1, "Requis"), password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Les mots de passe ne correspondent pas" });

export const preferencesSchema = z.object({
  locale: z.enum(["fr", "en"]).default("fr"),
  accent: z.enum(["amber", "orange", "violet"]).default("amber"),
  emailNotifications: z.boolean().default(true),
});

export const serviceSchema = z.object({
  slug: z.string().trim().min(2).max(48).regex(/^[a-z0-9-]+$/, "Slug : minuscules, chiffres et tirets"),
  name: z.string().trim().min(2).max(64),
  description: z.string().trim().min(2).max(2000),
  url: z.string().trim().url("URL invalide"),
  icon: z.string().trim().max(64).optional().or(z.literal("")),
  imageUrl: z.string().trim().url().optional().or(z.literal("")),
  status: z.enum(["ONLINE", "OFFLINE", "MAINTENANCE", "HIDDEN"]),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
  requiresSubscription: z.boolean().default(false),
  integration: z.enum(["NONE", "JELLYFIN", "BUPO_SSO"]).default("NONE"),
  ctaLabel: z.string().trim().max(48).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).default(0),
  healthcheckUrl: z.string().trim().url().optional().or(z.literal("")),
  ssoClientId: z.string().trim().max(64).optional().or(z.literal("")),
  ssoSecret: z.string().trim().max(128).optional().or(z.literal("")),
  ssoRedirectUri: z.string().trim().url("URL invalide").optional().or(z.literal("")),
});

export const adminCreateUserSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  displayName: z.string().trim().max(64).optional().or(z.literal("")),
  password: passwordSchema,
  roleId: z.string().min(1),
});

export const adminUpdateUserSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  displayName: z.string().trim().max(64).optional().or(z.literal("")),
  roleId: z.string().min(1),
});

export const invitationSchema = z.object({
  email: emailSchema.optional().or(z.literal("")),
  roleId: z.string().min(1),
  expiresInDays: z.coerce.number().int().min(1).max(90).default(7),
});

export const planSchema = z.object({
  slug: z.string().trim().min(2).max(48).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2).max(64),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  priceCents: z.coerce.number().int().min(0),
  currency: z.string().trim().length(3).default("EUR"),
  interval: z.enum(["MONTH", "YEAR"]).default("MONTH"),
  paypalPlanId: z.string().trim().max(64).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  features: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  serviceIds: z.array(z.string().min(1)).max(50).default([]),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const notificationSendSchema = z.object({
  target: z.enum(["all", "user"]),
  userId: z.string().optional(),
  type: z.enum(["INFO", "SUCCESS", "WARNING", "SERVICE", "SUBSCRIPTION", "ACCOUNT", "MAINTENANCE", "ADMIN"]),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().max(2000).optional().or(z.literal("")),
  link: z.string().trim().max(500).optional().or(z.literal("")),
});

export const donationSchema = z.object({
  amountCents: z.coerce.number().int().min(100, "Minimum 1 €").max(100_000_00),
  message: z.string().trim().max(500).optional().or(z.literal("")),
  donorName: z.string().trim().max(64).optional().or(z.literal("")),
  isAnonymous: z.boolean().default(false),
});

export const apiKeySchema = z.object({
  name: z.string().trim().min(2).max(64),
  scopes: z.array(z.string()).min(1, "Choisissez au moins un scope"),
});

export const BOT_SCOPES = {
  "users:read": "Lire les utilisateurs (par ID Discord)",
  "users:write": "Créer des utilisateurs et lier des comptes Discord",
  "subscriptions:read": "Vérifier l'état d'abonnement",
  "services:read": "Lister les services",
  "notifications:write": "Envoyer des notifications",
  "admin:maintenance": "Déclencher les tâches de maintenance",
} as const;
export type BotScope = keyof typeof BOT_SCOPES;

export function flattenErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
