# Déploiement du staging

Le staging sert aux démonstrations auprès des directeurs d'école, sur téléphone. Il tourne sur un
projet Supabase cloud (région Paris) et un projet Vercel (région Paris, `cdg1`, fixée par `vercel.json`).
Il contient les données de démonstration de `supabase/seed.sql`.

Compter environ 45 minutes la première fois. Ensuite, chaque push sur `main` met le staging à jour seul.

## 1. Comptes nécessaires

| Service | Ce qu'il faut | Coût |
| --- | --- | --- |
| [Supabase](https://supabase.com) | une organisation, puis un projet `fama-school-staging` (référence `bxxizeumyzotmurbzfye`) | gratuit (offre Free) pour le staging ; l'offre Free est limitée à 2 projets actifs par personne |
| [Vercel](https://vercel.com) | un compte relié à GitHub, accès au dépôt `Alioune89/fama_school` | gratuit (offre Hobby) pour le staging |
| GitHub | droits d'administration du dépôt (variables et secrets) | — |

## 2. Projet Supabase

1. Créer le projet : nom `fama-school-staging`, région **West EU (Paris) — eu-west-3**.
   Noter le mot de passe de la base dans un gestionnaire de mots de passe.
2. Relier le dépôt au projet et appliquer les migrations avec les données de démonstration
   (la référence du projet est dans l'URL du tableau de bord : `supabase.com/dashboard/project/<ref>`) :

   ```sh
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push --include-seed
   ```

   Le CLI passe par un rôle temporaire : le mot de passe de la base n'est pas demandé.

3. Sécuriser les comptes de démonstration. Le seed leur donne un mot de passe public :
   le compte « équipe Fama School » reçoit un mot de passe fort, et le directeur de démonstration
   celui que l'on communique aux prospects. Chaîne de connexion : *Project Settings > Database >
   Connection string* (mode « Session »). Sans `psql`, coller les deux `update` du script dans
   *SQL Editor*, en remplaçant `:'admin_password'` et `:'demo_password'` par les mots de passe entre apostrophes.

   ```sh
   psql "<chaîne de connexion>" \
     -v admin_password='<mot de passe fort>' \
     -v demo_password='<mot de passe de démo>' \
     -f supabase/staging/secure-demo-accounts.sql
   ```

4. Authentification (*Authentication > Sign In / Providers* et *URL Configuration*) :
   - **Site URL** : l'adresse du staging (étape 3), par exemple `https://fama-school.vercel.app`.
   - **Redirect URLs** : `https://fama-school.vercel.app/**`.
   - **Email** : activé, sans confirmation obligatoire.
   - **Phone** : activé avec Twilio. Pour les démos, des identifiants Twilio fictifs suffisent
     si l'on déclare les **numéros de test** ci-dessous : aucun SMS n'est envoyé, le code est fixe.

     | Numéro | Code | Compte |
     | --- | --- | --- |
     | 221770000001 | 123456 | parent (Fatou Sow, 2 enfants) |
     | 221770000002 | 123456 | professeure vacataire (2 écoles) |
     | 221770000003 | 123456 | censeur |
     | 221770000004 | 123456 | directeur d'Al Amine (école à configurer) |

     Supabase demande une date de fin de validité des numéros de test (*Test OTPs Valid Until*) :
     31 juillet 2027 pour le staging. Passé cette date, la repousser au même endroit.

     Pour de vrais parents, il faudra un vrai compte Twilio (ou un fournisseur sénégalais) :
     à décider avant le pilote.
5. Noter, dans *Project Settings > API Keys* : l'URL du projet, la clé **publishable** et la clé **secret**.

## 3. Projet Vercel

1. *Add New > Project*, importer le dépôt GitHub `fama_school`. Framework détecté : Next.js.
2. Nom du projet : `fama-school` (adresse : `https://fama-school.vercel.app`).
3. Variables d'environnement (*Production* et *Preview*) :

   | Variable | Valeur |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | clé publishable |
   | `SUPABASE_SECRET_KEY` | clé secret (jamais côté navigateur) |

   Astuce : coller un bloc `NOM=valeur` (une ligne par variable) dans le champ *Key* crée toutes les
   variables d'un coup. Sans ces variables, le site s'affiche mais toute connexion échoue
   (journal Vercel : « Variables Supabase manquantes »). Après un ajout, il faut **redéployer**.
4. Déployer. La branche de production est `main` : chaque push redéploie le staging.

## 4. GitHub : mise à jour automatique et vérification

Le workflow `.github/workflows/staging.yml` reste inactif tant que ces réglages manquent
(*Settings > Secrets and variables > Actions*).

| Type | Nom | Valeur |
| --- | --- | --- |
| Variable | `STAGING_PROJECT_REF` | référence du projet Supabase |
| Variable | `STAGING_URL` | `https://fama-school.vercel.app` |
| Secret | `SUPABASE_ACCESS_TOKEN` | jeton personnel Supabase (*Account > Access Tokens*) |
| Secret | `STAGING_DEMO_PASSWORD` | mot de passe de démo du directeur |

Une fois réglé :

- chaque push sur `main` applique les nouvelles migrations au staging (`supabase db push`, sans le seed),
  par le rôle temporaire du CLI : le mot de passe de la base n'est pas nécessaire ;
- le workflow attend ensuite que le staging serve ce commit (`/api/health` renvoie `commit`),
  puis lance les parcours essentiels (`@smoke`). Ils ne font que lire : ils ne créent pas de données.
  Le jeton Supabase a une date d'expiration : le recréer avant (*Account > Access Tokens*).

Vérification à la main, depuis sa machine :

```sh
E2E_BASE_URL=https://fama-school.vercel.app E2E_DEMO_PASSWORD='<mot de passe de démo>' npm run test:smoke
```

## 5. Faire une démo

- **Direction** : `directeur@famaschool.test` avec le mot de passe de démo (Groupe Scolaire Les Baobabs, 10 classes).
- **Parent** : `77 000 00 01`, code `123456`.
- **Mise en route d'une école vide** : `77 000 00 04`, code `123456` (Institut Al Amine).
- Les demandes de démo reçues sur la page d'accueil s'affichent dans l'espace plateforme
  (*Demandes de démo*), avec le compte `admin@famaschool.test`.

À savoir : une migration arrive au staging en même temps que le nouveau code. Pendant une ou deux
minutes après un push, le site peut donc tourner avec l'ancienne base. Ce n'est pas un problème
pour le staging. La production aura une étape de migration avant la mise en ligne.
