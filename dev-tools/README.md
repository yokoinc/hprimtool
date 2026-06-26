# dev-tools — scripts d'exploration historiques

Scripts ad hoc utilisés pendant le développement initial du parser HPRIM
(débogage de formats, analyses de corpus). **Ce ne sont pas des tests** et ils
ne sont pas maintenus :

- plusieurs réimplémentent une partie du parsing → ils peuvent diverger de la
  source de vérité, qui est désormais [`../hprim-electron/parser.js`](../hprim-electron/parser.js) ;
- certains contiennent des chemins absolus d'un ancien poste (macOS) et ne
  tournent pas tels quels.

➡️ La **suite de tests officielle** (reproductible, sans dépendance) est dans
[`../hprim-electron/test/`](../hprim-electron/test/) et se lance avec `npm test`
depuis `hprim-electron/`.

Ces fichiers sont conservés pour référence ; à supprimer si jamais inutiles.
Les échantillons `.hpr` / `.pdf` ici présents servaient à ces scripts.
