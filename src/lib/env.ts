import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const bool = z.preprocess(
  (v) => (typeof v === "string" ? v === "true" || v === "1" : v),
  z.boolean(),
);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().default("BupoHub"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),

  SESSION_SECRET: z.string().min(32, "SESSION_SECRET doit faire au moins 32 caractères"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),

  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: bool.default(false),
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  MAIL_FROM: z.string().default("BupoHub <no-reply@bupo.local>"),

  PAYPAL_CLIENT_ID: optionalString,
  PAYPAL_CLIENT_SECRET: optionalString,
  PAYPAL_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
  PAYPAL_WEBHOOK_ID: optionalString,

  DISCORD_CLIENT_ID: optionalString,
  DISCORD_CLIENT_SECRET: optionalString,
  DISCORD_BOT_TOKEN: optionalString,
  DISCORD_GUILD_ID: optionalString,

  CORS_ORIGINS: z.preprocess(
    (v) =>
      typeof v === "string" && v.trim()
        ? v.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    z.array(z.string()),
  ),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Configuration d'environnement invalide :\n${issues}`);
  }
  return parsed.data;
}

export const env = load();

export const features = {
  get mail() {
    return Boolean(env.SMTP_HOST);
  },
  get paypal() {
    return Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
  },
  get discordOAuth() {
    return Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET);
  },
  get discordBot() {
    return Boolean(env.DISCORD_BOT_TOKEN);
  },
};
