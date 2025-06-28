# Guide de Débogage - HPRIM Tool

## 🔧 Instructions pour tester les corrections

### 1. Démarrer l'application avec la console de développement

```bash
cd hprim-electron
npm start
```

Une fois l'application lancée :
1. Ouvrir les outils de développement : `Cmd+Option+I` (Mac) ou `Ctrl+Shift+I` (Windows/Linux)
2. Aller dans l'onglet "Console"

### 2. Messages de débogage à vérifier

Quand l'application démarre, vous devriez voir dans la console :

```
Preload script loaded
electronAPI exposed to main world
DOM chargé
window.electronAPI disponible immédiatement: true/false
Tentative 1: window.electronAPI disponible: true/false
API methods: ["readFile", "openFileDialog", "quitApp", "onFileToOpen", "onFileSelected", "removeAllListeners"]
Initialisation IPC...
```

### 3. Test des boutons

#### Bouton "Ouvrir" :
1. Cliquer sur le bouton "Ouvrir"
2. Vérifier dans la console : `openFile function called`
3. Une boîte de dialogue de sélection de fichier devrait s'ouvrir

#### Bouton "Quitter" :
1. Cliquer sur le bouton "Quitter"  
2. Vérifier dans la console : `quitApp function called`
3. L'application devrait se fermer

### 4. Test du Drag & Drop

1. Glisser le fichier `test-file.hpr` vers la zone de dépôt
2. Vérifier dans la console :
   ```
   Dragover event
   Drop event
   Files dropped: 1
   File path: /path/to/test-file.hpr
   ```
3. Le fichier devrait être analysé et les résultats affichés

### 5. Diagnostics d'erreurs courantes

#### Erreur : "ElectronAPI non disponible"
- **Cause :** Le preload script ne se charge pas
- **Solution :** Vérifier que `preload.js` est dans le bon répertoire

#### Erreur : "Impossible de charger electronAPI après X tentatives"
- **Cause :** Problème de configuration Electron
- **Solution :** Redémarrer l'application

#### Drag & Drop ne fonctionne pas
- **Vérification 1 :** Les événements drag sont-ils détectés dans la console ?
- **Vérification 2 :** Le fichier a-t-il une extension valide (.hpr, .hpm, .hprim, .txt) ?

### 6. Fichier de test inclus

Un fichier `test-file.hpr` est inclus avec des données de test :
```
RES|GLUCOSE|GLU|N|5.2|mmol/L|3.5|6.5|N|
RES|HEMOGLOBINE|HGB|N|14.5|g/dL|12.0|16.0|N|
RES|CREATININE|CREA|N|85*|µmol/L|60|120|H|
```

### 7. Tests automatisés

Exécuter les tests pour vérifier les fonctions utilitaires :
```bash
npm test
```

Tous les tests doivent passer (10/10).

### 8. Résolution des problèmes

Si les boutons ne fonctionnent toujours pas :

1. **Vérifier la console** pour les erreurs JavaScript
2. **Redémarrer l'application** complètement
3. **Vérifier les fichiers** : `main.js`, `preload.js`, `renderer.js` doivent tous être présents
4. **Tester avec un autre fichier** au format .hpr

### 9. Configuration vérifiée

L'application utilise maintenant :
- ✅ `contextIsolation: true`
- ✅ `nodeIntegration: false` 
- ✅ Script preload sécurisé
- ✅ Validation des entrées
- ✅ Gestion d'erreurs robuste

Si le problème persiste, partager les messages de la console pour un diagnostic plus approfondi.