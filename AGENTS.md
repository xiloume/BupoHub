<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# BupoHub — notes pour les agents

## Environnement (Windows)
- Les scripts PowerShell `.ps1` sont bloqués : utiliser `npm.cmd` / `npx.cmd`.
- Pas de MySQL local : `DATABASE_URL` doit pointer vers une base fournie par l'utilisateur. Le build ne touche pas la base (`dynamic = "force-dynamic"` sur le layout racine).
- `Set-Content -Encoding UTF8` ajoute un BOM : écrire les fichiers via `[IO.File]::WriteAllText(..., UTF8Encoding($false))` ou l'outil d'édition.

## Vérification
- `npx.cmd tsc --noEmit` — typage (lancer `npx.cmd next typegen` avant si de nouvelles routes ont été ajoutées : les types `PageProps<"/route">` / `LayoutProps` sont générés dans `.next/types`).
- `npx.cmd eslint .` — lint (0 erreur attendu).
- `npx.cmd vitest run` — tests dans `tests/` (`server-only` est stubbé via alias dans `vitest.config.mts`).
- `npx.cmd next build` — build de production.
- Avec une base : `npx.cmd prisma migrate dev` puis `npx.cmd prisma db seed`.

## Conventions
- Prisma 7 : pas d'`url` dans `schema.prisma` (config dans `prisma.config.ts`), client généré dans `src/generated/prisma` (ignoré par git, régénéré au `postinstall`). Importer `db` depuis `@/server/db`, les types depuis `@/generated/prisma/client`.
- Toute logique métier dans `src/server/**` (`import "server-only"`). Les Server Actions (`src/actions`) et Route Handlers (`src/app/api`) y délèguent et vérifient les permissions avec `requireUser` / `requirePermission`.
- Les actions importantes appellent `audit()` (`src/server/audit`) ; ajouter le libellé dans `AUDIT_ACTION_LABELS`.
- Nouvelle permission : l'ajouter dans `src/lib/permissions.ts` + relancer le seed.
- Réglages plateforme : `src/server/settings` (schéma zod, stockés en table `settings`).
- Formulaires : `useActionState` + `ActionState` (`src/lib/utils.ts`), `SubmitButton` / `FormError` / `useActionToast` / `reportAction` dans `src/components/ui/form.tsx`.
- Middleware Next 16 = `src/proxy.ts` (export `proxy`). Les APIs `cookies()`, `headers()`, `params`, `searchParams` sont asynchrones.
- UI : Tailwind 4 avec tokens CSS dans `globals.css` (`--accent` configurable via `data-accent`), primitives dans `src/components/ui`, icônes lucide, Radix via le package `radix-ui`.
