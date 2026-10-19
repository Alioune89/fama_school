# Fama School

Plateforme SaaS de gestion scolaire pour les écoles privées du Sénégal. Elle relie la direction, les professeurs et les parents : notes et bulletins, présences, paiements avec reçus, communication.

- Cahier des charges : [document de référence](https://claude.ai/artifact/MAVXErj5vTFuZfRRnU33D6)
- Stack : Next.js 16 (App Router, Cache Components, Turbopack), Supabase (Postgres + RLS, Auth, Storage), Tailwind CSS v4, shadcn/ui (Base UI), next-intl, Serwist (PWA). Déploiement Vercel.

## Démarrer en local

Prérequis : Node.js 22 ou plus, et Docker Desktop lancé.

```bash
npm install
npm run db:start      # Supabase local (Postgres, Auth, Studio…) — le premier lancement télécharge les images
npm run db:env        # écrit .env.local avec les clés du Supabase local
npm run dev           # http://localhost:3000
```

Supabase Studio : http://127.0.0.1:54323 · Base : `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

### Comptes de démonstration (`supabase/seed.sql`)

| Compte | Connexion | Espace |
| --- | --- | --- |
| admin@famaschool.test | e-mail, mot de passe `FamaSchool2026` | Plateforme (équipe Fama School) |
| directeur@famaschool.test | e-mail, mot de passe `FamaSchool2026` | Direction — Groupe Scolaire Les Baobabs |
| 77 000 00 01 | téléphone, code `123456` | Parent — Les Baobabs |
| 77 000 00 02 | téléphone, code `123456` | Professeur — Les Baobabs et Al Amine (vacataire) |
| 77 000 00 03 | téléphone, code `123456` | Censeur — Les Baobabs |
| 77 000 00 04 | téléphone, code `123456` | Directeur — Institut Franco-Arabe Al Amine |

Les comptes téléphone n'existent qu'après la première connexion : l'invitation correspondante est alors rattachée automatiquement.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build de production (génère aussi `public/sw.js`) |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript strict |
| `npm test` | Tests unitaires (Vitest) |
| `npm run test:e2e` | Parcours Playwright (desktop 1440 px + Pixel 7) sur un build de production |
| `npm run db:reset` | Réapplique migrations et seed |
| `npm run db:test` | Tests de sécurité de la base (pgTAP : RLS, rôles, invitations) |
| `npm run db:types` | Régénère `src/lib/supabase/database.types.ts` |

## Architecture

```
src/
  app/[locale]/(public)    accueil, page hors ligne
  app/[locale]/(auth)      connexion (téléphone + OTP, e-mail personnel), choix de l'espace
  app/[locale]/(app)/…     espaces direction, professeur, parent, plateforme
  components/              ui (shadcn restylé), layout (coquille des maquettes), dashboard
  features/<module>/       actions serveur, requêtes, schémas
  lib/                     supabase, auth (session, espaces), format (FCFA, dates), phone (E.164)
  messages/fr.json, wo.json
  proxy.ts                 session Supabase + garde optimiste + langue
supabase/                  config, migrations, seed, tests pgTAP
```

### Principes

- **Multi-écoles par la RLS** : chaque table métier porte un `school_id`, et chaque table publique a la RLS activée (un test pgTAP échoue sinon). Les règles d'accès passent par les fonctions du schéma `private` (`has_role`, `is_staff`, `can_invite`…).
- **Rendu** : avec Cache Components, l'enveloppe (menu, titres) est prérendue et la session n'est lue que sous `<Suspense>`. L'affichage reste instantané même en 3G.
- **Hors ligne** : `experimental.useOffline` remet en attente les navigations et Server Actions sans réseau. Le service worker (`src/service-worker/sw.ts`) ne précharge que la page hors ligne, pour ménager la data des parents.
- **Langues** : français sans préfixe, wolof sous `/wo`. Une traduction wolof absente retombe sur le français. Les textes wolof doivent être relus par un locuteur natif.
- **Argent** : montants en FCFA entiers (`bigint`), jamais de nombres à virgule.
- **Téléphones** : format E.164 (`+221…`), normalisés avec libphonenumber-js.

## Feuille de route

Le développement suit des lots : 0 socle, 1 paramétrage et annuaire, 2 présence, 3 notes et bulletins, 4 paiements (PayDunya), 5 espace parents, 6 notifications, 7 espace professeur complet et préparation du pilote, 8 site vitrine et préinscription.
