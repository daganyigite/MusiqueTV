# Musique TV

Application Google TV personnelle pour écouter ses playlists Apple Music avec une interface épurée, pilotable à la télécommande.

Elle ouvre music.apple.com en arrière-plan et affiche par-dessus sa propre interface. La musique est lue par le lecteur officiel d'Apple. Il faut un abonnement Apple Music actif.

## 1. Mettre le projet sur GitHub

1. Crée un compte gratuit sur https://github.com
2. En haut à droite, clique sur **+** puis **New repository**.
3. Nom : `MusiqueTV`. Choisis **Public** (plus simple pour télécharger l'apk sur la télé). Coche **Add a README file**. Clique **Create repository**.
4. Sur la page du dépôt, clique **Add file** puis **Upload files**.
5. Dézippe `MusiqueTV.zip` sur ton PC, ouvre le dossier `MusiqueTV`, sélectionne **tout son contenu** (y compris le dossier `.github`) et **glisse-le** dans la page GitHub.
   - Important : glisse les fichiers, n'utilise pas le bouton « choose your files », sinon les dossiers ne passent pas.
   - Si Windows cache le dossier `.github`, active « Affichage > Éléments masqués » dans l'Explorateur.
6. En bas, clique **Commit changes**.

## 2. Laisser GitHub compiler l'app

1. Clique sur l'onglet **Actions** du dépôt. Un build « Construire l'apk » démarre tout seul (rond jaune).
2. Attends 3 à 6 minutes que le rond devienne vert.
3. Va sur la page d'accueil du dépôt : à droite, dans **Releases**, tu vois la version avec le fichier `MusiqueTV.apk`.

Le lien de téléchargement direct sera toujours :

```
https://github.com/TON-PSEUDO/MusiqueTV/releases/latest/download/MusiqueTV.apk
```

Si le rond devient rouge, ouvre le build, copie le message d'erreur et envoie-le à Claude.

## 3. Installer sur la télé (Google TV)

1. Sur la télé, installe l'app **Downloader** (de AFTVnews) depuis le Play Store.
2. Active le mode développeur : **Paramètres > Système > À propos**, descends sur **Build du système d'exploitation Android TV** et appuie **7 fois** sur OK.
3. Autorise Downloader : **Paramètres > Applications > Sécurité et restrictions > Sources inconnues**, active **Downloader**.
4. Ouvre Downloader, tape le lien de l'étape 2, valide, puis choisis **Installer**.
5. L'app **Musique TV** apparaît dans tes applis.

## 4. Première utilisation

1. Ouvre Musique TV, choisis **Se connecter avec Apple**.
2. La page de connexion d'Apple s'ouvre : saisis ton identifiant Apple, ton mot de passe et le code reçu sur ton iPhone si on te le demande.
3. La fenêtre se ferme et tes playlists apparaissent.

Télécommande : flèches pour se déplacer, OK pour valider, Retour pour revenir. Les touches lecture/pause de la télécommande marchent aussi.

## Mettre à jour l'app

Remplace un fichier sur GitHub (Add file > Upload files), GitHub recompile tout seul. Sur la télé, relance le même lien dans Downloader : la nouvelle version s'installe par-dessus l'ancienne, sans perdre ta connexion.

## Limites connues

- Si Apple modifie son site, l'app peut cesser de fonctionner jusqu'à correction du fichier `app/src/main/assets/tv-ui.js`.
- Les vidéos s'affichent avec le lecteur du site Apple (touche Retour pour revenir).
- Usage strictement personnel.
