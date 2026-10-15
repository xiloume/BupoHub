"use server";

import { db } from "@/server/db";
import { requireUser, AuthError } from "@/server/auth/guards";
import { userCanAccessService } from "@/server/services";
import { ensureJellyfinAccount, rotateJellyfinPassword } from "@/server/integrations/jellyfin";
import { audit } from "@/server/audit";
import { features } from "@/lib/env";
import type { ActionState } from "@/lib/utils";

export type ServiceCredential = { username: string; password: string };

function handle(e: unknown): ActionState<ServiceCredential> {
  if (e instanceof AuthError) return { error: e.message };
  return { error: "Impossible de contacter le service. Réessayez dans un instant." };
}

async function checkAccess(userId: string, serviceId: string) {
  const service = await db.service.findUnique({ where: { id: serviceId } });
  if (!service || service.integration === "NONE") return { error: "Service introuvable." as const, service };
  if (!features.jellyfin) return { error: "Intégration non configurée." as const, service };
  if (!(await userCanAccessService(userId, service.id))) return { error: "Vous n'avez pas accès à ce service." as const, service };
  return { service };
}

/** Crée (ou récupère) les identifiants externes de l'utilisateur sur ce service. */
export async function provisionServiceCredentialAction(serviceId: string): Promise<ActionState<ServiceCredential>> {
  try {
    const user = await requireUser();
    const { service, error } = await checkAccess(user.id, serviceId);
    if (error || !service) return { error };
    const account = await ensureJellyfinAccount(user, service.id);
    await audit({ action: "service.credential_create", actorId: user.id, actorLabel: user.username, targetType: "service", targetId: service.id, targetLabel: service.name });
    return { ok: true, data: { username: account.username, password: account.password } };
  } catch (e) {
    return handle(e);
  }
}

/** Régénère le mot de passe externe (invalide les sessions Jellyfin existantes côté mot de passe). */
export async function regenerateServiceCredentialAction(serviceId: string): Promise<ActionState<ServiceCredential>> {
  try {
    const user = await requireUser();
    const { service, error } = await checkAccess(user.id, serviceId);
    if (error || !service) return { error };
    const account = await rotateJellyfinPassword(user, service.id);
    await audit({ action: "service.credential_rotate", actorId: user.id, actorLabel: user.username, targetType: "service", targetId: service.id, targetLabel: service.name });
    return { ok: true, message: "Mot de passe régénéré.", data: { username: account.username, password: account.password } };
  } catch (e) {
    return handle(e);
  }
}
