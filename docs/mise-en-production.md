# Mise en production

La production accueille les vraies écoles : vrais élèves, vrais parents, vrais paiements. Elle est
**séparée du staging** : son propre projet Supabase, son propre projet Vercel, sans données de
démonstration. Le staging (`docs/deploiement-staging.md`) reste le lieu des démos et des essais.

Tous les services ci-dessous fonctionnent en mode fermé tant que leurs clés manquent : on peut donc
ouvrir la production avec Supabase et Vercel seulement, puis brancher le reste un par un.

Compter une demi-journée la première fois, hors délais d'attente (nom de domaine, validation Twilio
et WhatsApp, compte PayDunya en production).

## 1. Comptes et coûts

| Service | Offre | Pourquoi | Coût indicatif |
| --- | --- | --- | --- |
| [Supabase](https://supabase.com) | **Pro** | sauvegardes quotidiennes, pas de mise en veille, quotas suffisants | 25 $ / mois |
| [Vercel](https://vercel.com) | **Pro** | l'offre Hobby est réservée à l'usage non commercial | 20 $ / mois par membre |
| Nom de domaine | `.sn` (NIC Sénégal, via un registraire agréé) ou `.com` | adresse des écoles et des liens SMS | ~15 000 à 30 000 F CFA / an |
| [Twilio](https://www.twilio.com) | paiement à l'usage | codes de connexion SMS, SMS et WhatsApp aux parents | au message |
| [PayDunya](https://paydunya.com) | compte marchand | Wave, Orange Money, Free Money, cartes | commission par paiement |
| [Sentry](https://sentry.io) | Developer (gratuit) puis Team | signalement des erreurs | 0 $ au départ |

Les prix changent : les vérifier au moment de souscrire.

## 2. Projet Supabase de production

1. Dans l'organisation, passer à l'offre **Pro**, puis créer le projet `fama-school-production`,
   région **West EU (Paris) — eu-west-3**. Mot de passe de la base dans un gestionnaire de mots de passe.
2. Appliquer les migrations **sans le seed** (jamais `--include-seed` ici) :

   ```sh
   npx supabase link --project-ref <ref de production>
   npx supabase db push
   npx supabase link --project-ref bxxizeumyzotmurbzfye   # revenir au staging ensuite
   ```

3. Authentification :
   - **Site URL** : l'adresse de production, par exemple `https://app.famaschool.sn`.
   - **Redirect URLs** : `https://app.famaschool.sn/**`.
   - **Phone** : activé avec un **vrai** compte Twilio (section 5). Aucun numéro de test ici.
   - **Email** : activé (connexion de l'équipe Fama School et des directeurs par e-mail).
4. Créer le premier compte de l'équipe : *Authentication > Users > Add user* (e-mail et mot de
   passe fort), puis le déclarer administrateur de la plateforme dans *SQL Editor* :

   ```sql
   insert into public.platform_admins (user_id)
   select id from auth.users where email = '<e-mail de l'équipe>';
   ```

   Ce compte crée ensuite les écoles depuis l'espace plateforme (*Écoles > Nouvelle école*) ;
   le directeur se connecte avec le numéro de téléphone saisi à cette étape.
5. *Database > Backups* : vérifier que les sauvegardes quotidiennes sont actives. Envisager
   l'option *Point in Time Recovery* quand plusieurs écoles saisissent des notes et des paiements.
6. Noter l'URL du projet, la clé **publishable** et la clé **secret** (*Project Settings > API Keys*).

## 3. Projet Vercel de production

1. Créer une branche `production` dans le dépôt. Elle ne reçoit que des versions déjà vérifiées
   sur le staging.
2. *Add New > Project*, importer `fama_school` sous le nom `fama-school-production`.
   *Settings > Git > Production Branch* : `production`.
3. *Settings > Domains* : ajouter le domaine (par exemple `app.famaschool.sn`) et créer chez le
   registraire l'enregistrement DNS que Vercel indique. Le certificat HTTPS est automatique.
4. Variables d'environnement (*Production* seulement). C'est la personne qui détient les clés qui les
   saisit dans Vercel : elles ne passent ni par le dépôt, ni par une conversation.

   | Variable | Valeur | Obligatoire |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL du projet de production | oui |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | clé publishable | oui |
   | `SUPABASE_SECRET_KEY` | clé secret | oui |
   | `APP_URL` | `https://app.famaschool.sn` (liens des SMS et invitations) | oui |
   | `CRON_SECRET` | une longue valeur aléatoire : `openssl rand -hex 32` | oui |
   | `ONLINE_PAYMENT_PROVIDER` | `paydunya` (vide : paiement simulé) | section 6 |
   | `PAYDUNYA_MODE` | `live` | section 6 |
   | `PAYDUNYA_MASTER_KEY`, `PAYDUNYA_PRIVATE_KEY`, `PAYDUNYA_TOKEN` | clés PayDunya de production | section 6 |
   | `NOTIFICATION_CHANNELS` | `twilio` (vide : aucun SMS ni WhatsApp) | section 5 |
   | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | compte Twilio | section 5 |
   | `TWILIO_SMS_FROM`, `TWILIO_WHATSAPP_FROM` | expéditeurs validés | section 5 |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | notifications push (section 7) | non |
   | `NEXT_PUBLIC_SENTRY_DSN` | suivi des erreurs (section 8) | non |

   Les variables `NEXT_PUBLIC_…` sont intégrées au moment de la compilation : après un ajout ou un
   changement, **redéployer** (*Deployments > … > Redeploy*).
5. La tâche quotidienne (`vercel.json`, 7 h UTC soit 7 h à Dakar) envoie les notifications en
   attente. Vercel l'appelle avec `CRON_SECRET` ; sans cette variable, elle refuse de tourner.

## 4. Mettre une version en production

Contrairement au staging, la base doit être prête **avant** le nouveau code :

1. Vérifier que la version est verte sur `main` : CI et staging (parcours essentiels).
2. Appliquer les nouvelles migrations à la production :

   ```sh
   npx supabase link --project-ref <ref de production>
   npx supabase db push --dry-run   # relire la liste des migrations
   npx supabase db push
   npx supabase link --project-ref bxxizeumyzotmurbzfye
   ```

3. Publier le code : `git push origin main:production`. Vercel déploie la branche.
4. Contrôler `https://app.famaschool.sn/api/health` : `commit` doit être celui qui vient d'être poussé.
5. En cas de problème : *Deployments*, choisir la version précédente, *Promote to Production*.
   Les migrations n'étant pas annulées, elles doivent rester compatibles avec la version précédente
   du code (ajouter des colonnes et des tables, ne pas en supprimer dans la même version).

Ces étapes pourront ensuite être automatisées par un workflow GitHub sur la branche `production`.

## 5. SMS et WhatsApp (Twilio)

1. Créer un compte Twilio, le passer en compte payant, et activer le Sénégal dans
   *Messaging > Settings > Geo permissions*.
2. **Expéditeur SMS** : demander un *Alphanumeric Sender ID* (« FamaSchool ») si le Sénégal
   l'accepte pour ce compte, sinon acheter un numéro. Le délai de validation peut prendre plusieurs jours.
3. **Codes de connexion** : dans Supabase, *Authentication > Sign In / Providers > Phone*, choisir
   Twilio et saisir le SID, le jeton et le *Messaging Service SID*.
4. **WhatsApp** : enregistrer un *WhatsApp Sender* (compte Meta Business vérifié). Les messages
   envoyés en premier à un parent doivent utiliser des modèles approuvés par Meta.
5. Dans Vercel : `NOTIFICATION_CHANNELS=twilio` et les variables `TWILIO_…`, puis redéployer.
6. Essai : depuis un compte parent, activer SMS dans *Mon profil*, puis faire un appel du matin
   avec l'enfant absent.

## 6. Paiement en ligne (PayDunya)

1. Faire valider le compte marchand PayDunya en production (documents de l'entreprise).
2. *Intégrez notre API > Configurer* : récupérer les clés **de production**, et déclarer l'adresse
   de notification (IPN) : `https://app.famaschool.sn/api/paiements/paydunya`.
3. Dans Vercel : `ONLINE_PAYMENT_PROVIDER=paydunya`, `PAYDUNYA_MODE=live` et les trois clés.
4. Essai avec un petit montant réel : le reçu doit apparaître chez le parent et dans la caisse.

## 7. Notifications push

1. Générer une paire de clés **une seule fois** : `npx web-push generate-vapid-keys`.
   Changer de clés ensuite désabonne tous les téléphones.
2. Dans Vercel : `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (clé publique), `VAPID_PRIVATE_KEY` (clé privée),
   `VAPID_SUBJECT=mailto:contact@famaschool.sn`. Redéployer.
3. Essai sur un téléphone Android avec Chrome : *Mon profil > Notifications sur le téléphone*.
   Sur iPhone, il faut d'abord ajouter l'application à l'écran d'accueil (iOS 16.4 ou plus).

## 8. Suivi des erreurs (Sentry)

1. Créer une organisation Sentry en **région UE** (stockage en Europe), puis un projet *Next.js*.
2. *Project Settings > Client Keys (DSN)* : copier le DSN dans `NEXT_PUBLIC_SENTRY_DSN`, redéployer.
3. L'application n'envoie que l'erreur et sa pile : ni cookies, ni en-têtes, ni contenu des
   formulaires, ni paramètres d'adresse, ni variables (`src/lib/monitoring.ts`).
4. Sans DSN, Sentry n'est pas téléchargé par les téléphones.

## 9. Avant d'accueillir la première école

- [ ] Déclaration du traitement de données personnelles auprès de la **CDP** (Commission de
      Protection des Données Personnelles, loi n° 2008-12). Il s'agit de données d'enfants :
      se faire conseiller sur les formalités et les mentions à afficher.
- [ ] Contrat ou conditions d'utilisation signés avec l'école (qui est responsable des données).
- [ ] Premier compte de l'équipe créé (section 2.4), mot de passe dans le gestionnaire.
- [ ] École créée depuis l'espace plateforme, directeur connecté par téléphone.
- [ ] Import des élèves testé avec le fichier réel de l'école (copie d'abord sur le staging).
- [ ] Un SMS et un paiement réels réussis (sections 5 et 6).
- [ ] Une restauration de sauvegarde essayée une fois, sur un projet de test.
