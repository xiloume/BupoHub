import "server-only";
import { cache } from "react";
import { z } from "zod";
import { db } from "@/server/db";

/**
 * Réglages de la plateforme, stockés en base (table `settings`).
 * Chaque clé a un schéma zod et une valeur par défaut.
 */
export const settingsSchema = z.object({
  "registration.mode": z.enum(["OPEN", "INVITE_ONLY", "CLOSED"]).default("INVITE_ONLY"),
  "subscriptions.enabled": z.boolean().default(false),
  "donations.enabled": z.boolean().default(true),
  "site.tagline": z.string().default("Tous les services Bupo réunis au même endroit."),
  "site.accent": z.enum(["amber", "orange", "violet"]).default("amber"),
  "maintenance.enabled": z.boolean().default(false),
  "maintenance.message": z.string().default(""),
  "discord.inviteUrl": z.string().default(""),
  "donations.suggestedAmounts": z.array(z.number().int().positive()).default([300, 500, 1000, 2000]),
});

export type Settings = z.infer<typeof settingsSchema>;
export type SettingKey = keyof Settings;

export const DEFAULT_SETTINGS = settingsSchema.parse({});

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db.setting.findMany();
  const raw: Record<string, unknown> = {};
  for (const row of rows) raw[row.key] = row.value;
  const parsed = settingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : { ...DEFAULT_SETTINGS, ...(raw as Partial<Settings>) };
});

export async function getSetting<K extends SettingKey>(key: K): Promise<Settings[K]> {
  return (await getSettings())[key];
}

export async function updateSettings(patch: Partial<Settings>) {
  const validated = settingsSchema.partial().parse(patch);
  await db.$transaction(
    Object.entries(validated).map(([key, value]) =>
      db.setting.upsert({
        where: { key },
        create: { key, value: value as never },
        update: { value: value as never },
      }),
    ),
  );
}
