# HPRIM Tool

**Analyseur professionnel de fichiers de résultats biologiques au format HPRIM**

## 📋 Description

HPRIM Tool est une application desktop moderne qui permet de lire, analyser et afficher de manière claire et structurée les fichiers de résultats d'analyses biologiques au format HPRIM (.hpr, .hpm, .hprim).

L'application transforme les données brutes HPRIM en rapports médicaux facilement lisibles avec une mise en forme professionnelle et une détection automatique des anomalies.

## ✨ Fonctionnalités

### 📊 **Analyse et Affichage**
- ✅ Lecture complète des fichiers HPRIM (.hpr, .hpm, .hprim)
- ✅ Parsing intelligent des formats structurés et texte libre
- ✅ Affichage professionnel avec colonnes alignées (Paramètre : Valeur Unité Normes)
- ✅ Extraction automatique des informations patient (nom, âge, dates)
- ✅ Gestion des commentaires et interprétations médicales

### 🎯 **Détection des Anomalies**
- ✅ Détection automatique des valeurs hors normes
- ✅ Badges colorés : rouge pour les valeurs anormales, vert pour les valeurs normales
- ✅ Parsing avancé des normes (format "min-max" ou valeurs séparées)
- ✅ Support des opérateurs de comparaison (<, >, ≤, ≥)

### 🖥️ **Interface Utilisateur**
- ✅ Interface moderne et intuitive
- ✅ Support du glisser-déposer
- ✅ Associations de fichiers (double-clic pour ouvrir)
- ✅ Impression des résultats
- ✅ Compatible macOS, Windows et Linux (ARM64 et x64)

### 🔧 **Fonctionnalités Avancées**
- ✅ Formatage automatique des noms de paramètres (ajout de " :")
- ✅ Gestion des unités multiples (ex: % et g/L)
- ✅ Support des valeurs avec astérisques et symboles spéciaux
- ✅ Validation croisée des données patient

## 📦 Installation

### 🚀 **Installation Rapide (Utilisateurs)**

Téléchargez directement la version correspondant à votre système :

#### 🍎 **macOS**
- Télécharger : `HPRIM Tool-1.0.0-arm64.dmg`
- Double-cliquez sur le fichier DMG et glissez l'application dans Applications

#### 🪟 **Windows**
- **Installateur** : `HPRIM Tool Setup 1.0.0.exe` (recommandé)
- **Portable** : `HPRIM Tool 1.0.0.exe` (sans installation)

#### 🐧 **Linux/Ubuntu**
- Télécharger : `HPRIM Tool-1.0.0-arm64.AppImage`
- Rendre exécutable : `chmod +x "HPRIM Tool-1.0.0-arm64.AppImage"`
- Lancer : `./HPRIM Tool-1.0.0-arm64.AppImage`

---

### 🛠️ **Installation pour Développeurs**

#### Prérequis
- Node.js (version 16 ou supérieure)
- npm ou yarn

#### Installation des dépendances
```bash
git clone https://github.com/votre-username/hprimtool.git
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
│   ├── index.html              # 🎨 Interface utilisateur
│   ├── styles.css              # 💄 Styles de l'application
│   ├── package.json            # 📦 Configuration et dépendances
│   ├── icons/                  # 🎯 Icônes multi-plateforme
│   ├── dist/                   # 📱 Applications compilées
│   └── samples/                # 📄 Fichiers d'exemple HPRIM
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
