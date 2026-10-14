import { z } from "zod";
import { ok, options, parseBody, withBotKey, ApiError } from "@/server/api";
import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { generateToken } from "@/lib/tokens";
import { createPasswordResetLink } from "@/server/auth";
import { linkDiscord } from "@/server/discord";
import { audit } from "@/server/audit";
import { notifyUser } from "@/server/notifications";
import { botUserPayload } from "@/server/bot";
import { emailSchema, usernameSchema } from "@/lib/validation";

export const OPTIONS = options;

const createSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  discord: z
    .object({
      discordUserId: z.string().regex(/^\d{15,22}$/),
      username: z.string().min(1).max(64),
      globalName: z.string().max(64).nullable().optional(),
      avatar: z.string().max(128).nullable().optional(),
    })
    .optional(),
});

/**
 * POST /api/v1/bot/users — création automatique de compte depuis Discord.
 * Un mot de passe aléatoire est généré ; un lien de définition de mot de passe (24 h) est renvoyé
 * pour que le bot le transmette à l'utilisateur en message privé.
 */
export const POST = withBotKey(async (req, key) => {
  const body = await parseBody(req, createSchema);
  const conflict = await db.user.findFirst({ where: { OR: [{ email: body.email }, { username: body.username }] }, select: { id: true } });
  if (conflict) throw new ApiError(409, "CONFLICT", "Email ou nom d'utilisateur déjà utilisé.");
  if (body.discord) {
    const linked = await db.discordAccount.findUnique({ where: { discordUserId: body.discord.discordUserId } });
    if (linked) throw new ApiError(409, "DISCORD_ALREADY_LINKED", "Ce compte Discord est déjà lié.");
  }

  const role = await db.role.findUniqueOrThrow({ where: { slug: "user" } });
  const user = await db.user.create({
    data: { email: body.email, username: body.username, passwordHash: await hashPassword(generateToken(32)), roleId: role.id },
  });
  if (body.discord) {
    await linkDiscord(user.id, { id: body.discord.discordUserId, username: body.discord.username, global_name: body.discord.globalName ?? null, avatar: body.discord.avatar ?? null }, "BOT", { id: null, label: `bot:${key.name}`, type: "BOT" });
  }
  const setPasswordLink = await createPasswordResetLink(user.id, 24 * 60 * 60 * 1000);
  await audit({ action: "user.create", actorType: "BOT", actorLabel: `bot:${key.name}`, targetType: "user", targetId: user.id, targetLabel: user.username, metadata: { via: "discord" } });
  await notifyUser(user.id, { type: "ACCOUNT", title: "Bienvenue sur BupoHub !", body: "Votre compte a été créé depuis Discord. Définissez votre mot de passe pour vous connecter.", link: "/profil" });

  return ok(req, { user: await botUserPayload(user.id), setPasswordLink }, { status: 201 });
}, "users:write");
