# HPRIM Tool

**Analyseur professionnel de fichiers de résultats biologiques au format HPRIM**

[![Version](https://img.shields.io/badge/version-1.2.2-blue.svg)](https://github.com/yokoinc/hprimtool/releases)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

## 📋 Description

HPRIM Tool est une application desktop (Electron) qui lit, analyse et affiche de manière claire et structurée les fichiers de résultats d'analyses biologiques au format HPRIM (`.hpr`, `.hpm`, `.hpm1`, `.hpm2`, `.hpm3`, `.hprim`).

L'application transforme les données brutes HPRIM en un rapport médical lisible : carte patient, **détection automatique des anomalies**, bandeau de synthèse, barre de position dans l'intervalle de référence, et impression optimisée.

## ✨ Fonctionnalités

### 📊 Analyse et affichage
- Lecture des fichiers HPRIM dans leurs trois formats (tags `RES|`, pipes, texte libre)
- Cœur de parsing isolé et **couvert par des tests automatisés**
- Carte patient : nom, âge, date de naissance, prélèvement, prescripteur, laboratoire, téléphone
- Score de confiance / identitovigilance lorsque l'identité est incomplète
- Gestion des commentaires, conclusions et interprétations du laboratoire

### 🎯 Détection des anomalies
- Détection **unifiée** : statut explicite H/L **et** comparaison numérique aux bornes de référence
- Opérateurs de comparaison `< > ≤ ≥ =` (valeurs censurées gérées sans faux positif/négatif)
- Bornes négatives préservées, virgule décimale française gérée
- Signalement visuel : valeur colorée, ligne teintée, **bandeau de synthèse** (élevées / basses / normales) et **barre de position** dans l'intervalle

### 🖥️ Interface
- Design « clinique épuré », **thème clair / sombre** (automatique selon l'heure)
- Fenêtre sans cadre avec barre de titre intégrée (réduire / agrandir / fermer)
- Glisser-déposer et associations de fichiers (double-clic, **instance unique**)
- Recherche en temps réel avec surlignage
- Bilingue français / anglais (détection automatique)
- **Mise à jour automatique** (Windows et Linux AppImage) : notification puis installation au redémarrage
- macOS, Windows et Linux (x64 et arm64)

### 🔒 Sécurité
- `contextIsolation` + `sandbox` activés, sans intégration Node dans le renderer
- **Content Security Policy** stricte (aucun script injecté depuis un fichier ne s'exécute)
- Échappement anti-XSS de tout contenu de fichier ; validation du chemin côté processus principal
- Décodage robuste de l'encodage (UTF-8 / windows-1252 / BOM) — fin du mojibake

### 🖨️ Impression & 📊 Export
- Impression optimisée, colonnes valeur/norme alignées (Ctrl/Cmd + P)
- Export CSV compatible Excel (UTF-8 + BOM, séparateurs français, nom de fichier daté)
- Visualiseur « fichier brut » (suit le thème, imprimable)

## 📦 Installation

### 🚀 Utilisateurs

Téléchargez la dernière version depuis la **[page des releases](https://github.com/yokoinc/hprimtool/releases/latest)** :

- **🪟 Windows** — installateur `HPRIM.Tool.Setup.X.Y.Z.exe` (NSIS, associe les fichiers HPRIM)
- **🍎 macOS** — `HPRIM.Tool-X.Y.Z-mac.zip` (Intel) ou `HPRIM.Tool-X.Y.Z-arm64-mac.zip` (Apple Silicon)
- **🐧 Linux** — `.AppImage`, `.deb` ou `.rpm` (x64 et arm64)
  ```bash
  chmod +x HPRIM.Tool-*.AppImage && ./HPRIM.Tool-*.AppImage
  ```

> Les binaires ne sont pas signés : Windows SmartScreen / macOS Gatekeeper peuvent afficher un avertissement au premier lancement.

### 🛠️ Développeurs

**Prérequis** : Node.js 18 ou supérieur.

```bash
git clone https://github.com/yokoinc/hprimtool.git
cd hprimtool/hprim-electron
npm install
npm start            # lancement en développement
npm test             # tests du cœur de parsing (node:test, sans dépendance)
```

**Construction** :

```bash
npm run build-win    # Windows
npm run build-mac    # macOS
npm run build-linux  # Linux
npm run build        # plateforme courante
```

Les releases publiques (les 3 OS, x64 + arm64) sont produites automatiquement par GitHub Actions au push d'un tag `vX.Y.Z`.

## 📱 Utilisation

1. **Glisser-déposer** un fichier HPRIM dans la fenêtre, **ou**
2. **Cliquer** sur la zone d'accueil / `Ctrl`+`O` (`Cmd`+`O` sur Mac), **ou**
3. **Double-cliquer** un fichier associé (s'ouvre dans la fenêtre courante si l'app tourne déjà).

Le rapport affiche la carte patient, le bandeau de synthèse, puis chaque résultat avec sa valeur, son unité, ses normes et sa position dans l'intervalle. Les valeurs hors normes sont mises en évidence ; les commentaires du laboratoire apparaissent sous les lignes concernées.

## 📁 Structure du projet

```
hprimtool/
├── hprim-electron/          # Application Electron
│   ├── main.js              # Processus principal (fenêtre, IPC, associations, instance unique)
│   ├── preload.js           # Pont sécurisé (contextBridge), compatible sandbox
│   ├── parser.js            # Cœur de parsing pur + détection d'anomalie (testable Node)
│   ├── render.js            # Rendu DOM (carte patient, synthèse, lignes, barre de position)
│   ├── search.js            # Recherche + surlignage
│   ├── export.js            # Export CSV
│   ├── rawfile.js           # Visualiseur « fichier brut »
│   ├── renderer.js          # Orchestrateur (état, glisser-déposer, délégation, thème)
│   ├── i18n.js / init.js    # Internationalisation (fr/en)
│   ├── index.html           # Interface + styles
│   ├── icons/               # Icônes multi-plateforme
│   └── test/                # Tests node:test + fixtures HPRIM
├── .github/workflows/       # CI : tests bloquants + build/release multi-OS
└── README.md
```

## 🧬 Format HPRIM

Le format **HPRIM** est un standard français d'échange de données médicales, notamment pour les résultats d'analyses biologiques.

- **Extensions** : `.hpr`, `.hpm` (`.hpm1/2/3`), `.hprim`
- **Formats reconnus** : structuré à tags (`****LAB****` + lignes `RES|`), structuré à pipes, texte libre — détectés automatiquement.

## 🤝 Contribution

Bugs, idées et pull requests bienvenus. Les tests (`npm test`) doivent passer ; ils s'exécutent aussi en CI avant chaque build.

## 📄 Licence

Projet sous licence **MIT**, pour usage personnel et professionnel dans le domaine médical.

---

**Développé par le Dr Grégory Cuffel avec ❤️ pour améliorer l'analyse des résultats biologiques**
