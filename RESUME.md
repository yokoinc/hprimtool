# Reprise du chantier — état au 2026-05-17

> Document de passation. Branche `chore/repo-cleanup`. À lire en premier après
> réinstall + re-clone. Sera supprimé/squashé quand le chantier sera mergé.

## Où on en est

3 commits sur la branche `chore/repo-cleanup` (poussés sur GitHub), `main` intact :

| Commit | Contenu | Statut |
|--------|---------|--------|
| `9d2f2b1` | Nettoyage dépôt (19 scripts jetables, 5 .md de remplissage, test.pdf, refs cassées, fixtures déplacées dans `hprim-electron/test/fixtures/`) | ✅ fait, sans risque |
| `dad5fb2` | Association OS de `.hpm1/.hpm2/.hpm3` (3 blocs `fileAssociations`) + cohérence README | ✅ fait, sans risque |
| `dde4da2` | **WIP** étape #2 : `decodeFileBuffer()` dans `main.js` (détection encodage) | 🟡 **NON VALIDÉ** — code écrit, jamais exécuté (Node absent) |

## Bloquant qui a tout arrêté

Node.js n'était pas installé sur l'ancienne machine → impossible de lancer
`npm install` / tests / build, donc impossible de valider l'étape #2 ni de
faire les étapes #3 et #4.

## À faire à la reprise (ordre impératif)

1. Installer Node.js LTS (`winget install OpenJS.NodeJS.LTS`), relancer le shell.
2. `cd hprim-electron && npm install`
3. **Valider l'étape #2** (commit `dde4da2`) :
   - Tester `decodeFileBuffer()` sur les 3 fixtures `test/fixtures/`
     (2 en Latin-1, 1 en UTF-8) → la sortie accentuée doit être correcte.
   - Vérifier zéro régression du chemin legacy `ENCODING_MAP` du renderer.
   - Si OK → squasher/réécrire `dde4da2` en commit propre `feat:`.
   - Si KO → corriger avant d'aller plus loin.
4. **Construire un harnais de caractérisation** (snapshot de la sortie du
   parser actuel sur les fixtures) AVANT de refactorer.
5. Étape #3 : éclater `renderer.js` (2220 lignes) en modules, en vérifiant
   l'identité de sortie vs snapshot à chaque sous-étape.
6. Étape #4 : Electron `^27` → dernière LTS, `npm install`, smoke test.
7. **Ensuite seulement** : refonte de l'interface (`index.html`, 1053 lignes,
   CSS inline) — chantier distinct, demandé par l'utilisateur.

## Décisions / contraintes actées (ne pas les rejouer)

- **Mode conservateur sur l'encodage** : on NE supprime PAS les rustines
  legacy (`ENCODING_MAP`, regex avec `?`, `parseLabFecampLine`) tant qu'on
  n'a pas de vrais fichiers `.hpr` des labos au charset exotique pour
  valider une suppression. Windows-1252 ⊇ Latin-1 sur 0xA0–0xFF → la couche
  legacy continue de fonctionner à l'identique. Zéro régression visée.
- Pas d'échantillons réels des labos problématiques (Fécamp + charset
  `0xC8`=`é`) disponibles → analyse menée sans eux.
- Diagnostic d'audit : le périmètre fonctionnel est sain ; le problème est
  un `renderer.js` monolithique sur-rustiné autour d'un encodage jamais
  résolu à la source, + bazar dépôt (réglé en #1).

## Filet de sécurité

- Workflow GitHub Actions (`build.yml`) ne se déclenche QUE sur tag `v*`,
  PR vers `main`, ou lancement manuel. Un push de branche ne build/release
  rien. Ne PAS taguer une version tant que #2 n'est pas validé.
- Identité git locale configurée pour ce repo uniquement
  (Grégory Cuffel / cuffel.gregory@gmail.com).
