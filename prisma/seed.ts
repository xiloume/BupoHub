import "dotenv/config";
import argon2 from "argon2";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { PERMISSIONS, ROLE_PERMISSIONS, SYSTEM_ROLES } from "../src/lib/permissions";

const db = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL!) });

async function main() {
  console.log("→ Permissions");
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await db.permission.upsert({ where: { key }, create: { key, description }, update: { description } });
  }

  console.log("→ Rôles");
  for (const r of SYSTEM_ROLES) {
    const role = await db.role.upsert({
      where: { slug: r.slug },
      create: { slug: r.slug, name: r.name, description: r.description, priority: r.priority, isSystem: true },
      update: { name: r.name, description: r.description, priority: r.priority, isSystem: true },
    });
    const keys = ROLE_PERMISSIONS[r.slug] ?? [];
    const perms = await db.permission.findMany({ where: { key: { in: [...keys] } } });
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (perms.length) {
      await db.rolePermission.createMany({
        data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
        skipDuplicates: true,
      });
    }
  }

  console.log("→ Administrateur initial");
  const adminRole = await db.role.findUniqueOrThrow({ where: { slug: "admin" } });
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@bupo.local").toLowerCase();
  const adminUsername = process.env.ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const existingAdmin = await db.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await db.user.create({
      data: {
        email: adminEmail,
        username: adminUsername,
        displayName: "Admin",
        passwordHash: await argon2.hash(adminPassword, { type: argon2.argon2id }),
        roleId: adminRole.id,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`   Admin créé : ${adminEmail} (mot de passe : variable ADMIN_PASSWORD)`);
  } else {
    console.log("   Admin déjà présent, inchangé.");
  }

  console.log("→ Services");
  const services = [
    {
      slug: "bupoflix",
      name: "Bupoflix",
      description: "Plateforme multimédia personnelle basée sur Jellyfin. Films, séries et musique, où que vous soyez.",
      url: process.env.SERVICE_URL_BUPOFLIX ?? "https://bupoflix.example.com",
      icon: "Clapperboard",
      ctaLabel: "Ouvrir Bupoflix",
      sortOrder: 0,
    },
    {
      slug: "bupo-games",
      name: "Bupo Games",
      description: "Espace dédié aux jeux et fonctionnalités gaming : serveurs, événements et classements.",
      url: process.env.SERVICE_URL_BUPO_GAMES ?? "https://games.example.com",
      icon: "Gamepad2",
      ctaLabel: "Découvrir",
      sortOrder: 1,
    },
    {
      slug: "bupo-discord",
      name: "Bupo Discord",
      description: "Intégration avec le serveur Discord et le bot Bupo. Rejoignez la communauté.",
      url: process.env.SERVICE_URL_BUPO_DISCORD ?? "https://discord.gg/example",
      icon: "MessageCircle",
      ctaLabel: "Ouvrir Discord",
      sortOrder: 2,
    },
  ];
  for (const s of services) {
    await db.service.upsert({
      where: { slug: s.slug },
      create: { ...s, status: "ONLINE", visibility: "PUBLIC" },
      update: { name: s.name, description: s.description, icon: s.icon, ctaLabel: s.ctaLabel },
    });
  }

  console.log("→ Plan d'abonnement par défaut");
  await db.subscriptionPlan.upsert({
    where: { slug: "bupo-plus" },
    create: {
      slug: "bupo-plus",
      name: "Bupo+",
      description: "Soutenez l'écosystème Bupo et accédez à l'ensemble des services premium.",
      priceCents: 500,
      currency: "EUR",
      interval: "MONTH",
      features: ["Accès à tous les services", "Support prioritaire", "Badge Bupo+ sur Discord"],
      isActive: true,
    },
    update: {},
  });

  console.log("→ Réglages");
  const defaults: Record<string, unknown> = {
    "registration.mode": "INVITE_ONLY",
    "subscriptions.enabled": false,
    "donations.enabled": true,
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db.setting.upsert({ where: { key }, create: { key, value: value as never }, update: {} });
  }

  console.log("✓ Seed terminé");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
