# Configuration de l'authentification Google pour My Little Cook

## Instructions de configuration

### 1. Créer un projet Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez l'API "Google+ API" et "Google Sign-In API"

### 2. Configurer OAuth 2.0

1. Allez dans **APIs & Services** > **Credentials**
2. Cliquez sur **Create Credentials** > **OAuth 2.0 Client IDs**
3. Choisissez **Web application**
4. Configurez les URLs autorisées :
   - **Authorized JavaScript origins**: `http://localhost:3001`
   - **Authorized redirect URIs**: `http://localhost:3001/api/auth/callback/google`

### 3. Obtenir les clés

1. Copiez le **Client ID** et le **Client Secret**
2. Remplacez les valeurs dans votre fichier `.env` :

```env
GOOGLE_CLIENT_ID="votre-client-id-ici"
GOOGLE_CLIENT_SECRET="votre-client-secret-ici"
```

### 4. Redémarrer l'application

```bash
# Arrêtez le serveur de développement (Ctrl+C)
# Puis relancez :
npm run dev
```

### 5. Test de l'authentification

1. Allez sur http://localhost:3001
2. Cliquez sur "Se connecter" dans le header
3. Sélectionnez "Se connecter avec Google"
4. Autorisez l'application
5. Vous devriez être redirigé vers la page d'accueil, connecté

## Fonctionnalités d'authentification disponibles

### Interface utilisateur
- ✅ Bouton "Se connecter" dans le header
- ✅ Page de connexion personnalisée (`/auth/signin`)
- ✅ Affichage du profil utilisateur (nom + photo)
- ✅ Bouton de déconnexion
- ✅ États de chargement

### Backend
- ✅ Base de données mise à jour avec les tables NextAuth.js
- ✅ Session persistante en base de données
- ✅ Adapter Prisma configuré
- ✅ Middleware pour les routes protégées (optionnel)

### Mode démo
L'application fonctionne également sans authentification grâce au projet temporaire créé automatiquement.

## Notes de sécurité

⚠️ **Important** : Pour la production, assurez-vous de :
1. Utiliser HTTPS
2. Configurer les bonnes URLs de redirection
3. Générer une nouvelle `NEXTAUTH_SECRET`
4. Restreindre les domaines autorisés dans Google Cloud Console