PRD – Application de Planification de Repas Collaborative

1. Contexte et Objectif

L’application vise à simplifier la planification hebdomadaire des repas, en permettant à un ou plusieurs utilisateurs de construire un planning collaboratif, de sélectionner ou créer des recettes, et de générer automatiquement une liste de courses consolidée.
Elle doit intégrer une interface moderne, fluide et personnalisable, tout en offrant un système de gestion de recettes éditables en Markdown.


2. Personas
-	Utilisateur individuel : planifie ses repas pour gagner du temps et organiser ses courses.
-	Couple / famille : co-construit un planning partagé.
-	Amateur de cuisine : enrichit son catalogue de recettes personnelles, avec un éditeur Markdown.



3. Cas d’usage principaux
   1.	Visualiser un planning hebdomadaire (matin/midi/soir).
   2.	Ajouter une recette à un créneau via une popup de recherche (API, favoris, recettes personnelles).
   3.	Éditer ou créer une recette en Markdown, avec images, description et ingrédients.
   4.	Générer une liste de courses consolidée.
   5.	Créer/rejoindre un projet collaboratif pour partager un planning.
   6.	Importer une recette depuis une URL (scraping ou API d’extraction).



4. Fonctionnalités principales

4.1. Planning hebdomadaire
-	Vue grille (jours x repas).
-	Créneaux cliquables → popup de recherche/ajout.
-	Navigation inter-semaines.
-	Duplication de repas ou de semaine.

4.2. Ajout de recette à un créneau
-	Popup avec :
-	Recherche API de recettes.
-	Onglet favoris.
-	Onglet recettes personnelles.
-	Sélection d’une recette = ajout direct dans le créneau.

4.3. Liste de courses
-	Génération automatique.
-	Agrégation des ingrédients similaires.
-	Checkbox pour marquer les articles achetés.
-	Export (PDF, lien partagé).

4.4. Projet collaboratif
-	Création d’un projet de planning.
-	Invitations via email/code.
-	Droits différenciés (propriétaire, contributeur).
-	Synchronisation en temps réel.

4.5. Recettes personnelles en Markdown
-	Éditeur Markdown intégré pour écrire/modifier une recette.
-	Support des images, titres, ingrédients listés, étapes numérotées.
-	Visualisation live preview en parallèle de l’édition.
-	Classement en favoris.
-	Import d’URL transformée automatiquement en recette Markdown.


5. Spécifications fonctionnelles secondaires
-    Responsive (mobile/tablette/desktop).
-    Authentification (email/password, Google OAuth).
-    Tags/catégories de recettes (optionnel).
-    Notifications pour rappel repas (V2).



6. Architecture technique

Frontend
-	Framework : Next.js + React.
-	UI : shadcn/ui pour des composants cohérents et modulaires.
-	Data fetching & RPC : tRPC avec TanStack Query (useQuery, useMutation).
-	Éditeur Markdown : composant dédié (ex : react-markdown + @uiw/react-md-editor).

Backend
-	API via tRPC (TypeScript end-to-end).
-	Hébergement flexible (Docker, Vercel ou VM).

Base de données
-	ORM : Prisma.
-	Base : NeonDB (PostgreSQL serverless).
-	Schéma principal :
-	User (id, email, auth, favoris).
-	Project (id, ownerId, membres).
-	MealPlan (id, projectId, semaine, repas).
-	Recipe (id, auteur, markdown, ingrédients, images, tags).
-	Ingredient (nom, unité, quantité, lien vers recettes).

Stockage
•	Fichiers/images : stockage cloud (S3, Supabase Storage ou équivalent).

Outils
- Biome



7. KPIs & critères de succès
-	Temps moyen pour créer un planning hebdo.
-	Nombre de recettes créées/importées en Markdown.
-	Nombre de projets collaboratifs actifs.
-	Taux d’utilisation de la liste de courses exportée.


8. Roadmap (MVP → évolutions)

MVP
-	Planning hebdomadaire (créneaux cliquables).
-	Ajout recette (recherche API, favoris, personnelles).
-	Liste de courses consolidée.
-	Recettes en Markdown (éditeur + preview).
-	Prisma + NeonDB pour persistance.
-	UI via shadcn + data via tRPC/TanStack Query.
-	Projet collaboratif basique (invitation, multi-utilisateurs).

V2
-	Import recette depuis URL.
-	Tags, catégories, filtres.
-	Export avancé (PDF, partage).
-	Notifications (rappels repas).

V3
-	Recommandations via IA (menus équilibrés).
-	Intégration services drive/livraison.
-	Mode offline-first (pwa).