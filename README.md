# BupoHub

Portail central de l'écosystème Bupo : un compte unique pour accéder à Bupoflix, Bupo Games, Bupo Discord et tous les services à venir.

- **Frontend + API** : Next.js 16 (App Router, Server Actions, Route Handlers), React 19, TypeScript, Tailwind CSS 4
- **Base de données** : MySQL / MariaDB via Prisma 7 (driver adapter `@prisma/adapter-mariadb`)
- **Auth** : sessions en base (cookie httpOnly), mots de passe argon2id, rôles & permissions vérifiés côté serveur
- **Intégrations optionnelles** : SMTP (emails), PayPal (abonnements & dons), Discord (OAuth2 + API bot)

## Démarrage rapide

```bash
# 1. Dépendances
npm install

# 2. Configuration
copy .env.example .env      # puis renseigner DATABASE_URL, SESSION_SECRET, ADMIN_*

# 3. Base de données (crée les tables puis les données initiales)
npm run db:migrate          # ou `npm run db:deploy` en production
npm run db:seed

# 4. Lancer
npm run dev                 # http://localhost:3000
```

Le seed crée les rôles (`user`, `moderator`, `admin`) et leurs permissions, un compte administrateur (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), les trois services d'exemple, un plan d'abonnement « Bupo+ » et les réglages par défaut (inscriptions **sur invitation uniquement**, abonnements **désactivés**, donations activées).

> Sous Windows PowerShell, si l'exécution de scripts est bloquée, utilisez `npm.cmd` / `npx.cmd`.

## Variables d'environnement

Voir [`.env.example`](.env.example). Les intégrations se dégradent proprement si leurs variables sont absentes :

| Variables | Effet si absentes |
|---|---|
| `SMTP_*` | Les emails (reset, invitation, bienvenue) sont affichés dans la console du serveur |
| `PAYPAL_CLIENT_ID/SECRET` | Offres et dons affichés mais boutons de paiement inactifs ; attribution manuelle d'abonnements possible |
| `DISCORD_CLIENT_ID/SECRET` | Pas de liaison Discord en libre-service (liaison manuelle par un admin ou via l'API bot) |
| `DISCORD_BOT_TOKEN` | Pas d'enrichissement automatique des profils Discord |

Ne jamais committer `.env`. Générer `SESSION_SECRET` : `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | Tests unitaires (Vitest) |
| `npm run db:migrate` | Applique les migrations en développement (`prisma migrate dev`) |
| `npm run db:deploy` | Applique les migrations en production |
| `npm run db:seed` | Données initiales (idempotent) |
| `npm run db:studio` | Prisma Studio |

## Architecture

```
src/
├─ app/
│  ├─ (public)/        Accueil, Soutenir Bupo, mentions légales
│  ├─ (auth)/          Connexion, inscription (invitation), mot de passe oublié / réinitialisation
│  ├─ (app)/           Espace connecté : dashboard, services, notifications, profil, abonnement
│  ├─ (admin)/admin/   Administration (permission admin.access + permissions fines)
│  └─ api/             Route Handlers : /api/v1/*, /api/v1/bot/*, /api/webhooks/paypal, /api/health
├─ actions/            Server Actions (fines, délèguent à src/server)
├─ server/             Logique métier — jamais importée côté client (`server-only`)
│  ├─ auth/            sessions, mots de passe, guards (requireUser / requirePermission)
│  ├─ users, services, invitations, notifications, audit, settings, subscriptions, donations, discord, api-keys, bot
│  ├─ payments/        interface PaymentProvider + implémentation PayPal (REST) + fournisseur désactivé
│  └─ api/             helpers Route Handlers (réponses, CORS, auth session / clé API, rate limit)
├─ components/         UI (primitives), layout, marketing, auth, profile, admin, billing
├─ lib/                env (zod), permissions, validation (zod), tokens, utils, métadonnées d'affichage
├─ i18n/               next-intl (fr par défaut, en préparé) — messages dans /messages
└─ proxy.ts            Redirection rapide vers /connexion sans cookie (la vraie vérification est serveur)
prisma/                schema.prisma, migrations, seed.ts
```

### Sécurité

- Toute permission est vérifiée côté serveur (`src/server/auth/guards.ts`) dans les layouts, Server Actions et Route Handlers ; le frontend ne fait que masquer.
- Sessions : token aléatoire 32 octets, stocké hashé (HMAC + `SESSION_SECRET`), révocable, expiration glissante. Tokens de reset / invitation / clés API stockés hashés.
- Rate limiting en mémoire (login, inscription, reset, API, bot) — interface `RateLimitStore` prête pour Redis.
- CORS configurable (`CORS_ORIGINS`), en-têtes de sécurité et CSP dans `next.config.ts`.
- Journal d'audit pour toutes les actions d'administration et du bot (`/admin/audit`).
- Aucune donnée bancaire : PayPal gère le paiement, BupoHub ne conserve que des identifiants opaques.

### Rôles & permissions

Catalogue dans `src/lib/permissions.ts`. Les rôles système sont `user` (aucune permission), `moderator` (accès admin limité) et `admin` (tout). Ajouter une permission = l'ajouter au catalogue puis relancer `npm run db:seed`. De nouveaux rôles peuvent être créés en base sans modifier le code.

### Ajouter un service

Depuis **Administration → Services → Nouveau service** : nom, description, URL, icône, image, statut, visibilité (public/privé), accès réservé aux abonnés, ordre. Les accès privés s'accordent par utilisateur depuis sa fiche.

### Abonnements & donations

- Toggle global dans **Administration → Paramètres**. Désactivé = aucune offre, aucun paiement, tout fonctionne normalement.
- Plans gérés dans **Administration → Abonnements** (prix affiché + ID du plan PayPal). Attribution manuelle possible par utilisateur.
- Webhook PayPal : `POST /api/webhooks/paypal` (déclarer l'URL et renseigner `PAYPAL_WEBHOOK_ID`).
- Donations : page `/soutenir`, indépendantes des abonnements.

## API

Toutes les réponses sont de la forme `{ data }` ou `{ error: { code, message, details? } }`.

### Session (cookie)

| Méthode | Route | Permission |
|---|---|---|
| `POST` | `/api/v1/auth/login` · `/api/v1/auth/logout` | — |
| `GET` | `/api/v1/auth/me` | connecté |
| `GET` | `/api/v1/services` | public (accès résolu si connecté) |
| `GET` | `/api/v1/subscriptions` | connecté |
| `POST` | `/api/v1/donations` | public |
| `GET` `POST` | `/api/v1/notifications` · `POST /api/v1/notifications/:id/read` | connecté |
| `GET` `POST` | `/api/v1/users` · `GET PATCH DELETE /api/v1/users/:id` | `users.*` |
| `GET` | `/api/v1/permissions` | `admin.access` |
| `GET` | `/api/v1/admin/stats` · `/api/v1/admin/audit` | `admin.stats` / `audit.read` |

### Bot Discord (clé API)

Créer une clé dans **Administration → Discord & API**, puis envoyer `Authorization: Bearer bh_xxx.yyy`.

| Méthode | Route | Scope |
|---|---|---|
| `GET` | `/api/v1/bot/users/by-discord/:discordId` | `users:read` |
| `GET` | `/api/v1/bot/users/:id/subscription` | `subscriptions:read` |
| `POST` | `/api/v1/bot/users` — création de compte (renvoie un lien de définition de mot de passe) | `users:write` |
| `POST` `DELETE` | `/api/v1/bot/users/:id/link` — lier / délier un compte Discord | `users:write` |
| `GET` | `/api/v1/bot/services` | `services:read` |
| `POST` | `/api/v1/bot/notifications` (`userId` \| `discordUserId` \| `broadcast`) | `notifications:write` |

## Déploiement

1. `npm ci && npm run build`
2. `npm run db:deploy && npm run db:seed`
3. `npm start` derrière un reverse proxy HTTPS (les cookies sont `secure` en production). Transmettre `X-Forwarded-For` pour l'historique des IP.
4. Déclarer `APP_URL` (public), l'URL de callback Discord `APP_URL/api/v1/discord/callback` et le webhook PayPal `APP_URL/api/webhooks/paypal`.

Les avatars sont stockés dans `public/uploads/avatars` (à monter en volume persistant).
