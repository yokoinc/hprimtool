// Applique le thème (clair/sombre selon l'heure) AVANT le premier rendu, pour
// éviter un flash de thème au démarrage. Chargé en <head>, exécuté de façon
// synchrone avant le rendu du <body>. Le rafraîchissement horaire reste géré par
// autoDetectTheme() dans renderer.js. (Inline interdit par la CSP -> fichier dédié.)
(function () {
    try {
        var h = new Date().getHours();
        // Règle alignée sur autoDetectTheme() : sombre de 19h à 7h.
        var theme = (h >= 19 || h < 7) ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {
        // En cas d'échec, le CSS retombe sur le thème clair par défaut.
    }
})();
