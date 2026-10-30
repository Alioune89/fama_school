# Fama School, de A à Z

> Document de référence : ce qu'est Fama School, comment l'application est construite, ce que chaque
> personne peut y faire, et ce qui reste à faire avant les écoles pilotes.
> État au 30 octobre 2026.

---

## 1. En bref

**Fama School** est une application de gestion scolaire pensée pour le Sénégal. Elle relie dans un
même outil :

- la **direction** de l'école (fondateur, directeur, censeur, surveillant, comptable, secrétaire) ;
- les **enseignants** ;
- les **parents d'élèves**.

Une seule installation sert **plusieurs écoles** : chacune ne voit que ses propres données.

| Choix | Décision |
| --- | --- |
| Nom de marque | Fama School (style pastel lavande, jaune, bleu ciel) |
| Type d'application | Application web installable sur le téléphone (pas d'application de magasin) |
| Connexion | Numéro de téléphone + code SMS ; e-mail + mot de passe pour le personnel |
| Langues | Français (par défaut) ; wolof sous `/wo`, à faire relire par un locuteur natif |
| Paiement en ligne | PayDunya (Wave, Orange Money, Free Money, carte) + espèces au guichet |
| Réseau | Fonctionne avec une connexion faible ; l'appel et les notes se saisissent hors ligne |
| Prix pour les parents | Gratuit |

**Calendrier prévu** : écoles pilotes d'avril à juin 2027 (Dakar, Pikine, Rufisque), lancement en
octobre 2027.

---

## 2. Comment c'est construit

| Brique | Rôle | Où |
| --- | --- | --- |
| **Next.js 16** | Les pages et la logique de l'application | Code sur GitHub : `Alioune89/fama_school` |
| **Supabase** | Base de données, connexions, fichiers (photos, justificatifs, rapports) | Docker sur ton Mac (développement) ; projet en ligne à Paris (staging) |
| **Vercel** | Héberge le site en ligne | https://fama-school.vercel.app |
| **GitHub Actions** | Vérifie automatiquement chaque envoi de code | « CI » et « Staging » |

### Les environnements

| Environnement | À quoi il sert | Données |
| --- | --- | --- |
| **Local** (ton Mac) | Développer et tester | Données de démonstration |
| **Staging** (fama-school.vercel.app) | Démonstrations aux écoles ; mis à jour à chaque envoi sur `main` | Données de démonstration |
| **Production** | Les vraies écoles | À créer (voir `docs/mise-en-production.md`) |

### Les vérifications automatiques

À chaque envoi de code, GitHub relance :

- environ **277 tests unitaires** (calculs de moyennes, frais, formules, menus…) ;
- **39 fichiers de tests de la base de données**, environ 460 vérifications (sécurité, droits par rôle, cloisonnement entre écoles) ;
- **36 parcours dans un vrai navigateur**, sur ordinateur et sur téléphone, soit environ 140 tests.

Chiffres au 30 octobre 2026 : 81 envois de code et 44 évolutions de la base depuis le 19 octobre 2026.

---

## 3. Les étapes du projet

| Étape | Contenu | Terminée le |
| --- | --- | --- |
| **Lot 0** | Socle : connexion, espaces, design, langues | 19 oct. |
| **Lot 1** | Paramétrage de l'école, élèves, classes, enseignants, tableau de bord, page d'accueil, mise en ligne du staging | 20 oct. |
| **Lot 2** | Appel hors ligne, présences, historique, signalements, justificatifs d'absence, pointage QR | 22 oct. |
| **Lot 3** | Évaluations, notes, moyennes, conseil de classe, bulletins PDF (classique et franco-arabe), vérification des bulletins | 26 oct. |
| **Lot 4** | Frais, factures, guichet, reçus, paiement en ligne, impayés et relances | 27 oct. |
| **Lot 5** | Espace parents complet, consentements | 28 oct. |
| **Lot 6** | Notifications, annonces, calendrier, messagerie, SMS et WhatsApp | 28 oct. |
| **Lot 7** | Espace enseignant complet (programme, cahier de textes, rapports) ; audit de sécurité | 29 oct. |
| **Lot 8** | Site public de chaque école, pré-inscription en ligne | 29 oct. |
| **Ensuite** | Séries du lycée et examens (CFEE, BFEM, BAC), notifications push, Sentry, guide de production, profils, formules, protection contre les doublons, menus et verrouillage par rôle, « À faire aujourd'hui », page d'accueil allégée, pages juridiques | 29–30 oct. |

---

## 4. Les rôles

### Vue d'ensemble

| Rôle | Espace | Se connecte avec | Métier |
| --- | --- | --- | --- |
| **Équipe Fama School** | Plateforme | E-mail | Crée les écoles, suit les demandes de démo et les formules |
| **Fondateur** | Direction | Téléphone ou e-mail | Tout, comme le directeur |
| **Directeur** | Direction | Téléphone ou e-mail | Tout : gestion de l'école et de l'équipe |
| **Censeur** | Direction | Téléphone | Pédagogie : notes, bulletins, programme, présences |
| **Surveillant général** | Direction | Téléphone | Vie scolaire : présences, retards, pointage, signalements |
| **Comptable** | Direction | Téléphone | Finances : frais, factures, encaissements, impayés |
| **Secrétaire** | Direction | Téléphone | Scolarité : inscriptions, parents, personnel, bulletins, examens |
| **Enseignant** | Enseignant | Téléphone | Ses classes : appel, notes, cahier de textes |
| **Parent ou tuteur** | Parent | Téléphone | Ses enfants : suivi, paiements, messages |

Une personne peut avoir plusieurs rôles (par exemple, une professeure vacataire dans deux écoles) :
elle choisit son espace après la connexion.

### Ce que chaque rôle de la direction voit

Chacun ne voit dans son menu que les rubriques de son métier. Les pages des autres rubriques sont
fermées (« Rubrique réservée »), même en tapant leur adresse, et la base de données refuse de lui
donner ces informations.

| Rubrique | Fondateur, directeur | Censeur | Surveillant | Comptable | Secrétaire |
| --- | :---: | :---: | :---: | :---: | :---: |
| Tableau de bord, « À faire aujourd'hui » | ✅ | ✅ | ✅ | ✅ | ✅ |
| Élèves | ✅ | ✅ | ✅ | ✅ | ✅ |
| Parents | ✅ | — | ✅ | ✅ | ✅ |
| Enseignants | ✅ | ✅ | — | — | ✅ |
| Personnel | ✅ | — | — | — | ✅ |
| Classes | ✅ | ✅ | ✅ | — | ✅ |
| Présences | ✅ | ✅ | ✅ | — | — |
| Notes et bulletins | ✅ | ✅ | — | — | ✅ |
| Finances | ✅ | — | — | ✅ | — |
| Programme, cahier de textes, rapports journaliers | ✅ | ✅ | — | — | — |
| Annonces, calendrier | ✅ | ✅ | ✅ | ✅ | ✅ |
| Messages | ✅ | ✅ | ✅ | — | ✅ |
| Site de l'école | ✅ | ✅ | — | — | ✅ |
| Paramètres | ✅ | ✅ | — | — | — |
| Profil | ✅ | ✅ | ✅ | ✅ | ✅ |

Les enseignants ne voient que leurs classes ; les parents que leurs enfants ; une école ne voit jamais
une autre école.

---

## 5. Les fonctionnalités, espace par espace

### 5.1 Espace Direction

**Tableau de bord**

- **« À faire aujourd'hui »** : les tâches en attente du rôle connecté, chacune avec son bouton :
  classes sans appel ce matin, justificatifs à valider, pré-inscriptions à traiter, annulations
  d'encaissement à décider, familles en retard de paiement, conversations non lues.
- Indicateurs cliquables : élèves inscrits, enseignants, classes, parents connectés.
- Effectifs par classe, répartition filles/garçons, calendrier de l'année.
- Pendant la mise en route : un bandeau qui guide le directeur ; à la fin, **« Votre école est
  prête »** avec les boutons pour importer les élèves et ajouter l'équipe.

**Paramètres (mise en route en 6 étapes, environ 30 minutes)**

1. Identité de l'école (nom, coordonnées, logo repris sur les bulletins et reçus).
2. Année scolaire (semestres ou trimestres).
3. Cycles et niveaux : du préscolaire à la Terminale, toutes les séries du lycée (2nde L/S ; L1, L2,
   L'1, LA, S1 à S5, T1, T2, G), filière franco-arabe.
4. Matières et coefficients par série (proposés, à ajuster avec chaque école).
5. Classes.
6. Mentions et poids des évaluations (devoir, interrogation, composition).

**Élèves**

- Fiche complète : photo, dossier (extrait de naissance…), parents, classe, frais, factures,
  signalements, carte QR. Chaque bloc n'apparaît qu'aux rôles concernés.
- **Import depuis Excel ou CSV**, avec aperçu, lignes à corriger, et **protection contre les
  doublons** (même nom et même date de naissance, ou même classe ; « Importer quand même » pour un
  homonyme).
- Inscription un par un, changement de classe, départ ou transfert.
- **Pré-inscriptions** reçues par le site de l'école : retenir, refuser, inscrire en un clic.

**Parents** : qui s'est connecté, leurs enfants, appel direct, invitation par WhatsApp.

**Enseignants et personnel** : ajout avec le rôle, titulaires au primaire, matières confiées.
L'ajout invite automatiquement la personne : elle se connecte avec son numéro.

**Présences**

- Grille des appels, historique des modifications, absences répétées.
- Justificatifs envoyés par les parents (photo du certificat), à valider ou refuser.
- **Pointage QR** : la caméra du téléphone scanne la carte de l'élève à l'arrivée et à la sortie ;
  cartes à imprimer en A4.

**Notes et bulletins**

- Évaluations, saisie des notes, moyennes et rangs, appréciations.
- Conseil de classe, verrouillage de la période (le censeur verrouille, le directeur peut rouvrir).
- **Bulletins PDF** (classique ou franco-arabe) avec un code de vérification et un QR code.
- **Examens** : liste des candidats au CFEE, BFEM et BAC, saisie des résultats, avis aux parents.

**Finances**

- Grille des frais, réductions, options (cantine, transport…).
- Factures mensuelles numérotées (F2026-00001…).
- Encaissements au guichet avec reçu PDF (R2026-00001…) ; annulation validée par le directeur.
- Dépenses.
- **Impayés** : relance par WhatsApp, SMS ou appel ; option pour bloquer le téléchargement du
  bulletin par les parents en retard.

**Communication** : annonces ciblées (tous les parents, une classe, les familles en retard, le
personnel, des parents choisis), calendrier, messagerie avec les parents.

**Pédagogie** : progression du programme par chapitre (en retard, à jour, en avance), cahier de
textes, devoirs, rapports journaliers des enseignants (texte ou message vocal) et compilation PDF
chaque semaine.

**Site de l'école** : page publique `/ecoles/<nom>` rédigée par l'école, avec formulaire de
pré-inscription.

**Profil** : identité, écoles et rôles, changement du mot de passe (avec l'œil pour voir ce qu'on
tape), notifications.

### 5.2 Espace Enseignant

- **Tableau de bord** cliquable : mes classes, mes élèves, appels du jour, messages non lus.
- **Mes classes** : matières, appel du matin, accès rapides, liste des élèves.
- **Appel** du matin et de l'après-midi, en quelques touchers, **même sans réseau** (envoyé au retour
  de la connexion).
- **Signalements** sur un élève (comportement, santé…).
- **Notes** : saisie rapide au clavier (« a » absent, « e » excusé), moyennes, appréciations,
  publication aux parents.
- **Programme**, **cahier de textes** et devoirs, **rapport journalier**.
- **Messages** avec les parents et la direction.
- **Profil** : écoles et rôles, notifications, horaires de réponse aux parents.

### 5.3 Espace Parent

- Connexion par numéro et code SMS ; à la première visite, choix de la langue et accord pour le suivi
  scolaire (photos et géolocalisation au choix).
- **Accueil** : dernière note, prochaine composition, reste à payer.
- **Fiche de chaque enfant** : absences, retards, heure d'arrivée, signalements, notes, bulletins,
  progression du programme, résultats d'examen.
- **Justifier une absence** avec la photo du certificat.
- **Payer en ligne** (Wave, Orange Money, carte) et recevoir le reçu.
- Devoirs, annonces, calendrier, messages avec l'école.
- **Notifications** : dans l'application en temps réel ; par SMS, WhatsApp et sur le téléphone une
  fois les clés activées.

### 5.4 Espace Plateforme (équipe Fama School)

- **Écoles** : création d'une école et de son directeur ; bandeau « nouvelles demandes de démo à
  rappeler ».
- **Demandes de démo** : suivi (nouvelle, rappelée, démo prévue, close).
- **Formules** : grille tarifaire, revenu mensuel attendu, formule conseillée selon le nombre
  d'élèves, changement de formule et de statut.

### 5.5 Pages publiques

- **Page d'accueil** : promesse, argument « Moins d'impayés », un espace pour chacun, formules et
  options, demande de démo (3 champs + bouton WhatsApp), questions fréquentes.
- **Site de chaque école** et **pré-inscription en ligne**.
- **Vérifier un bulletin ou un reçu** : `/verifier`, avec le code imprimé.
- **Conditions d'utilisation** et **Politique de confidentialité** (loi sénégalaise n° 2008-12).

---

## 6. Les formules

| Formule | Élèves | Prix par mois | Par an, payé d'avance |
| --- | --- | --- | --- |
| Démarrage | jusqu'à 200 | 60 000 FCFA | 480 000 FCFA |
| École | 201 à 500 | 120 000 FCFA | 960 000 FCFA |
| Établissement | 501 à 1 000 | 220 000 FCFA | 1 760 000 FCFA |
| Groupe scolaire | plus de 1 000 ou plusieurs sites | sur devis | sur devis |

Facturées sur 10 mois (octobre à juillet), 2 mois offerts pour un paiement annuel d'avance.
Gratuit pour les parents.

| Option | Prix |
| --- | --- |
| Mise en place (import, paramétrage, formation) | 150 000 à 500 000 FCFA, une fois — offerte aux écoles pilotes |
| Transport GPS | 15 000 à 25 000 FCFA par bus et par mois — **bientôt** |
| Cartes élèves QR | prix d'impression |
| Packs SMS et WhatsApp | au volume |

Écoles pilotes : mise en place offerte et un trimestre gratuit.

---

## 7. Sécurité et confidentialité

- **Cloisonnement par école** : chaque information porte le nom de son école ; une école ne voit
  jamais une autre école.
- **Cloisonnement par rôle** : dans les menus, dans les pages et dans la base de données elle-même
  (voir le tableau de la section 4).
- **Connexion sans mot de passe** pour les parents et les enseignants (code SMS).
- **Échanges chiffrés** (HTTPS), sauvegardes de la base.
- **Suivi des erreurs** (Sentry) sans aucune donnée personnelle.
- **Consentements des parents** enregistrés et modifiables dans leur profil.

---

## 8. Ce qui est actif et ce qui attend des clés

Tout est construit. Certains services restent **fermés tant que leurs clés ne sont pas saisies dans
Vercel** (par toi, jamais dans le code) :

| Service | Aujourd'hui | Pour l'activer |
| --- | --- | --- |
| Paiement en ligne | Simulé, ou fermé | Compte marchand PayDunya + clés |
| SMS et WhatsApp aux parents | Simulés (rien ne part) | Compte Twilio + expéditeurs validés |
| Alerte SMS de l'équipe à chaque demande de démo | Simulée | Twilio (numéro : +221 77 765 09 80, ou `TEAM_ALERT_PHONE`) |
| Codes de connexion SMS | Numéros de test, code 123456 | Vrai compte Twilio dans Supabase |
| Notifications sur le téléphone | « Bientôt disponible » | Clés VAPID |
| Suivi des erreurs | Inactif | Clé Sentry |

Le détail pas à pas est dans `docs/mise-en-production.md`.

---

## 9. Comptes de démonstration

Valables en local et sur le staging. Code SMS : **123456**.

| Connexion | Personne | Espace |
| --- | --- | --- |
| 77 000 00 01 | Fatou Sow | Parent (2 enfants) — Les Baobabs |
| 77 000 00 02 | Awa Diop | Professeure — Les Baobabs (permanente) et Al Amine (vacataire) |
| 77 000 00 03 | Cheikh Ba | Censeur — Les Baobabs |
| 77 000 00 04 | Ibrahima Fall | Directeur — Institut Franco-Arabe Al Amine (école vide, pour montrer la mise en route) |
| 77 099 00 07 | Bineta Gueye | Comptable — Les Baobabs |
| 77 099 00 08 | Rokhaya Mbaye | Secrétaire — Les Baobabs |
| 77 099 00 09 | Pape Diouf | Surveillant général — Les Baobabs |
| `directeur@famaschool.test` | Moussa Ndiaye | Directeur — Les Baobabs |
| `admin@famaschool.test` | Équipe Fama School | Plateforme |

Mots de passe des deux comptes e-mail : `FamaSchool2026` en local ; sur le staging, ceux que tu as
choisis (à garder dans un gestionnaire de mots de passe).

---

## 10. Ce qui reste à faire

1. **Les écoles pilotes** : listes d'élèves, tarifs, coefficients réels, un modèle de bulletin.
2. **La production** : Supabase Pro, Vercel Pro, nom de domaine (guide : `docs/mise-en-production.md`).
3. **Les vraies clés** : PayDunya, Twilio, notifications push, Sentry.
4. **Les formalités** : déclaration à la CDP (données d'enfants), contrat avec les écoles,
   **relecture des pages juridiques par un juriste**.
5. **La relecture des textes wolof** par un locuteur natif.
6. **Plus tard** : le transport GPS (option « bientôt »), les témoignages des écoles pilotes sur la
   page d'accueil.

---

## 11. Documents utiles dans le dépôt

| Document | Contenu |
| --- | --- |
| `README.md` | Démarrer en local, comptes de démo, architecture |
| `docs/deploiement-staging.md` | Mise en ligne et entretien du staging |
| `docs/mise-en-production.md` | Comptes, variables, mise en ligne d'une version, activation des services |
| `docs/fama-school-de-a-a-z.md` | Ce document |
