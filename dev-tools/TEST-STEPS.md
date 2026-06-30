# 🧪 Guide de Test - HPRIM Tool

## Étapes pour tester l'application

### 1. Démarrer l'application
```bash
cd hprim-electron
npm start
```

### 2. Ouvrir la console de développement
- **Mac :** `Cmd + Option + I`
- **Windows/Linux :** `Ctrl + Shift + I`
- Aller dans l'onglet "Console"

### 3. Vérifier les messages de démarrage

Vous devriez voir dans la console :
```
DOM chargé
window.electronAPI disponible: false (ou true)
window.require disponible: true
Tentative 1: Initialisation de l'API...
Utilisation de l'ancien système avec ipcRenderer
API initialisée avec succès
API methods: ["readFile", "openFileDialog", "quitApp", "onFileToOpen", "onFileSelected"]
```

### 4. Tester le bouton "Ouvrir"

1. Cliquer sur le bouton "📂 Ouvrir"
2. Vérifier dans la console :
   ```
   openFile function called
   Sending open file dialog request from button
   ```
3. ✅ **Une boîte de dialogue devrait s'ouvrir**

### 5. Tester le drag & drop

1. Glisser le fichier `test-file.hpr` dans la zone de dépôt
2. Vérifier dans la console :
   ```
   Dragover event
   Drop event
   Files dropped: 1
   File path: /chemin/vers/test-file.hpr
   handleFile appelé avec: /chemin/vers/test-file.hpr
   ```
3. ✅ **Les résultats devraient s'afficher**

### 6. Tester le bouton "Quitter"

1. Cliquer sur le bouton "Quitter"
2. Vérifier dans la console :
   ```
   quitApp function called
   Sending quit app request
   ```
3. ✅ **L'application devrait se fermer**

## 🔧 Résolution des problèmes

### Si l'API n'est pas disponible :
- Vérifier que `window.require disponible: true`
- Redémarrer l'application

### Si les boutons ne fonctionnent pas :
- Vérifier qu'il n'y a pas d'erreurs JavaScript dans la console
- S'assurer que les messages de debug apparaissent

### Si le drag & drop ne fonctionne pas :
- Vérifier que le fichier a une extension valide (.hpr, .hpm, .hprim, .txt)
- Essayer avec le fichier de test fourni

## 📁 Fichier de test inclus

Le fichier `test-file.hpr` contient :
```
RES|GLUCOSE|GLU|N|5.2|mmol/L|3.5|6.5|N|
RES|HEMOGLOBINE|HGB|N|14.5|g/dL|12.0|16.0|N|
RES|CREATININE|CREA|N|85*|µmol/L|60|120|H|
TEX|Commentaire test pour le glucose
TEX|Valeurs normales détectées
```

Quand ce fichier est chargé, vous devriez voir 3 résultats médicaux s'afficher avec leurs valeurs et unités.

## ✅ Résultat attendu

L'application devrait maintenant :
- ✅ Démarrer sans erreur
- ✅ Afficher les boutons fonctionnels
- ✅ Permettre l'ouverture de fichiers via le bouton
- ✅ Supporter le drag & drop
- ✅ Analyser et afficher les fichiers HPRIM
- ✅ Se fermer proprement

Si tout fonctionne, l'application est prête à l'utilisation ! 🎉