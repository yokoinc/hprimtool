# Changelog - HPRIM Tool

## Version 1.2.1 (Dernière version)

### 🐛 Correction
- **Association de fichiers (Windows)** : double-cliquer un fichier dont l'extension est en **majuscules** (ex. `.HPM`) alors que l'app était fermée l'ouvrait à vide (il fallait re-cliquer). Le test d'extension au lancement est désormais **insensible à la casse**, comme le reste de l'application.

## Version 1.2.0

### 🔄 Mise à jour automatique
- L'application vérifie les nouvelles versions au lancement (flux des releases GitHub via `electron-updater`).
- **Comportement « notifier puis installer »** : la mise à jour se télécharge en tâche de fond, puis l'app propose de **redémarrer maintenant** ou d'installer à la prochaine fermeture.
- Pris en charge sur **Windows** (.exe) et **Linux AppImage**. Les paquets `.deb`/`.rpm` restent gérés par le système ; **macOS** reste en mise à jour manuelle (nécessite une signature Apple).
- _Note_ : l'auto-update s'applique à partir de cette version (1.2.0 → versions suivantes).

## Version 1.1.2

### 🎨 Interface
- **Visualiseur « fichier brut » sans cadre natif** : la fenêtre suit le même style épuré que la fenêtre principale (plus de barre de titre Windows). Déplacement par l'en-tête, fermeture par le bouton « Fermer ».

## Version 1.1.1

### 🐛 Correction
- **Association de fichiers** : verrou d'instance unique. Double-cliquer un `.hpr`/`.hpm`/`.hprim` alors que l'app tourne déjà ouvre désormais le fichier dans la **fenêtre existante** (et la ramène au premier plan) au lieu de lancer une 2ᵉ instance/fenêtre (Windows/Linux).

## Version 1.1.0

### 🎨 Refonte de l'interface (« clinique épuré »)
- Nouvelle palette neutre et plate, accent médical unique, thème **clair/sombre** cohérent
- Carte patient (identité, âge, prescripteur, laboratoire, téléphone, prélèvement)
- **Bandeau de synthèse** (valeurs élevées / basses / normales) et **barre de position** dans l'intervalle de référence
- Fenêtre sans cadre + barre de titre personnalisée (réduire / agrandir / fermer), sans barre de menu
- Impression repensée : colonnes valeur/norme alignées, commentaires lisibles

### 🩺 Fiabilité du parsing (cœur clinique)
- Cœur de parsing extrait dans `parser.js` (pur, testable) + suite de tests `node:test` (24 cas)
- **Détection d'anomalie unifiée** : statut H/L **et** comparaison numérique aux bornes, sur les 3 formats (corrige des faux négatifs)
- Opérateurs `< > ≤ ≥ =` reconnus ; bornes négatives préservées ; virgule décimale française gérée
- DFG : la borne du fichier prime (plus de seuil « > 60 » codé en dur)
- Date de naissance : plafond d'année dynamique + rejet des dates impossibles (identitovigilance)
- Décodage d'encodage robuste (UTF-8 / windows-1252 / BOM) — fin du mojibake

### 🔒 Sécurité
- **CSP stricte** + `sandbox: true` ; échappement anti-XSS de tout contenu de fichier
- Glisser-déposer fiabilisé (lecture du contenu, indépendant de la version d'Electron)

### 🧱 Qualité / maintenance
- `renderer.js` découpé en modules (rendu, recherche, export, fichier brut, orchestrateur)
- Tests bloquants en CI avant chaque build/release ; nettoyage de la racine du dépôt

## Version 1.0.7

### 🔧 Améliorations techniques
- **Builds automatisés GitHub Actions** : Pipeline complet de build pour Linux (x64/arm64), Windows et macOS
- **Releases automatiques** : Création automatique des releases GitHub avec tous les binaires
- **Support multi-architecture** : Binaires disponibles pour x64 et ARM64 sur Linux et macOS
- **Formats de distribution optimisés** :
  - Linux : .deb, .rpm, .AppImage
  - Windows : Installateur NSIS (.exe)
  - macOS : Archive ZIP universelle

### 🎨 Améliorations interface (v1.0.1)
- Interface utilisateur améliorée
- Optimisation de l'impression
- Ergonomie générale renforcée

### 🐛 Corrections importantes
- **v1.0.2** : Corrections majeures et améliorations
- **v1.0.3** : Correction du packaging Linux
- Associations de fichiers corrigées pour tous les OS
- Stabilité générale améliorée

### 📦 Formats de fichiers supportés
- `.hpr` - Fichiers HPRIM standard
- `.hpm` - Fichiers HPRIM médicaux
- `.hprim` - Fichiers HPRIM génériques

### 🔒 Sécurité et compatibilité
- Binaires non signés (distribution libre)
- Compatible macOS 10.12+ (APFS)
- Support ARM64 natif pour les nouveaux Mac
- Compatibilité étendue Linux (Ubuntu, Debian, CentOS, etc.)

---

## Depuis la version 1.0.0

Cette version apporte une **infrastructure de distribution moderne** avec des builds automatisés, un support multi-plateforme étendu, et une meilleure expérience utilisateur globale.

**Installation** : Téléchargez le binaire correspondant à votre système depuis les [Releases GitHub](https://github.com/yokoinc/hprimtool/releases).