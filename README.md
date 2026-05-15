# HPRIM Tool

**Analyseur professionnel de fichiers de résultats biologiques au format HPRIM**

[![Version](https://img.shields.io/badge/version-1.0.7-blue.svg)](https://github.com/yokoinc/hprimtool/releases)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)]()
[![License](https://img.shields.io/badge/license-Free-green.svg)]()

## 📋 Description

HPRIM Tool est une application desktop moderne qui permet de lire, analyser et afficher de manière claire et structurée les fichiers de résultats d'analyses biologiques au format HPRIM (.hpr, .hpm, .hpm1, .hpm2, .hpm3, .hprim).

L'application transforme les données brutes HPRIM en rapports médicaux facilement lisibles avec une mise en forme professionnelle, une détection automatique des anomalies et un système d'impression optimisé.

## ✨ Fonctionnalités

### 📊 **Analyse et Affichage**
- ✅ Lecture complète des fichiers HPRIM (.hpr, .hpm, .hpm1, .hpm2, .hpm3, .hprim)
- ✅ Parsing intelligent des formats structurés et texte libre
- ✅ Affichage professionnel avec colonnes parfaitement alignées
- ✅ Extraction automatique des informations patient (nom • âge • date de naissance)
- ✅ Gestion des commentaires et interprétations médicales
- ✅ Nettoyage automatique des noms de résultats (suppression des "- ")

### 🎯 **Détection des Anomalies**
- ✅ Détection automatique des valeurs hors normes
- ✅ Mise en évidence des valeurs anormales (gras, couleurs)
- ✅ Parsing avancé des normes (format "min-max" ou valeurs séparées)
- ✅ Support des opérateurs de comparaison (<, >, ≤, ≥)

### 🖥️ **Interface Utilisateur**
- ✅ Interface moderne et intuitive
- ✅ Support du glisser-déposer
- ✅ Associations de fichiers (double-clic pour ouvrir)
- ✅ Système de recherche en temps réel avec mise en surbrillance
- ✅ Support multilingue (français/anglais, détection automatique)
- ✅ Compatible macOS, Windows et Linux (ARM64 et x64)

### 🖨️ **Impression Optimisée** 
- ✅ Impression professionnelle avec colonnes parfaitement alignées
- ✅ Raccourcis clavier : CMD+P (Mac) / Ctrl+P (Windows/Linux)
- ✅ Layout optimisé : gauche-centre-droite
- ✅ Suppression automatique des éléments non-imprimables
- ✅ Police réduite et économie d'encre

### 📊 **Export de Données**
- ✅ Export CSV compatible Excel (UTF-8 + BOM)
- ✅ Formatage professionnel avec séparateurs français
- ✅ Gestion des valeurs multiples et commentaires
- ✅ Nom de fichier automatique avec date

### 🔧 **Fonctionnalités Avancées**
- ✅ Sécurité renforcée pour le traitement des fichiers
- ✅ Gestion des unités multiples (ex: % et g/L)
- ✅ Support des valeurs avec astérisques et symboles spéciaux
- ✅ Validation croisée des données patient
- ✅ Mode texte brut pour diagnostic

## 📦 Installation

### 🚀 **Installation Rapide (Utilisateurs)**

Téléchargez directement la version correspondant à votre système :

#### 🍎 **macOS**
- Télécharger : `HPRIM Tool-1.0.7-arm64.dmg`
- Double-cliquez sur le fichier DMG et glissez l'application dans Applications

#### 🪟 **Windows**
- **Installateur** : `HPRIM Tool Setup 1.0.7.exe` (recommandé)
- **Portable** : `HPRIM Tool 1.0.7.exe` (sans installation)

#### 🐧 **Linux/Ubuntu**
- Télécharger : `HPRIM Tool-1.0.7-arm64.AppImage`
- Rendre exécutable : `chmod +x "HPRIM Tool-1.0.7-arm64.AppImage"`
- Lancer : `./HPRIM Tool-1.0.7-arm64.AppImage`

---

### 🛠️ **Installation pour Développeurs**

#### Prérequis
- Node.js (version 16 ou supérieure)
- npm ou yarn

#### Installation des dépendances
```bash
git clone https://github.com/yokoinc/hprimtool.git
cd hprimtool/hprim-electron
npm install
```

#### Lancement en mode développement
```bash
npm start
```

#### Construction de l'application

**Pour macOS :**
```bash
npm run build-mac
```

**Pour Windows :**
```bash
npm run build-win
```

**Pour Linux :**
```bash
npm run build-linux
```

**Pour toutes les plateformes :**
```bash
npm run build
```

## 📱 Utilisation

### 🔄 **Méthodes d'ouverture**
1. **Glisser-déposer** : Glissez un fichier HPRIM (.hpr, .hpm, .hprim) directement dans la fenêtre
2. **Bouton Ouvrir** : Cliquez sur la zone ou utilisez Cmd+O (Mac) / Ctrl+O (Windows)
3. **Double-clic** : Associez les fichiers HPRIM à l'application pour les ouvrir directement

### 📊 **Lecture des résultats**
- **En-tête patient** : Nom, âge, date de naissance, date de prélèvement, médecin
- **Résultats structurés** : Paramètre, valeur, unité, normes de référence
- **Badges colorés** : 
  - 🔴 Rouge = Valeur anormale (hors normes)
  - 🟢 Vert = Valeur normale (dans les normes)
- **Commentaires** : Interprétations et notes du laboratoire

### 🖨️ **Fonctions avancées**
- **Impression** : Bouton d'impression intégré
- **Associations de fichiers** : Configuration automatique pour Windows
- **Interface responsive** : S'adapte à différentes tailles d'écran

## 📁 Structure du projet

```
hprimtool/
├── hprim-electron/              # 🚀 Application Electron principale
│   ├── main.js                 # ⚙️ Processus principal Electron
│   ├── renderer.js             # 🧠 Logique de parsing HPRIM et rendu
│   ├── preload.js              # 🔒 Pont sécurisé contextBridge
│   ├── i18n.js                 # 🌐 Traductions FR/EN
│   ├── index.html              # 🎨 Interface utilisateur (styles inline)
│   ├── package.json            # 📦 Configuration et dépendances
│   ├── icons/                  # 🎯 Icônes multi-plateforme
│   └── test/fixtures/          # 📄 Fichiers HPRIM d'exemple
├── CHANGELOG.md                # 📝 Journal des versions
└── README.md                   # 📖 Documentation
```

## 🧬 Format HPRIM

Le format **HPRIM** (Health Protocol for data Interchange) est un standard français pour l'échange de données médicales, notamment utilisé pour les résultats d'analyses biologiques.

### Formats supportés :
- **.hpr** : Format HPRIM standard
- **.hpm** : Variant HPRIM médical  
- **.hprim** : Extension générique

### Types de parsing :
- **Format structuré** : Lignes RES| avec données séparées
- **Format texte libre** : Parsing intelligent des résultats alignés
- **Format mixte** : Combinaison des deux approches

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- 🐛 Signaler des bugs
- 💡 Proposer des améliorations
- 🔧 Soumettre des pull requests
- 📝 Améliorer la documentation

## 📄 Licence

Ce projet est sous **licence libre** pour usage personnel et professionnel dans le domaine médical.

---

**Développé par le Dr Grégory Cuffel avec ❤️ pour améliorer l'analyse des résultats biologiques**
