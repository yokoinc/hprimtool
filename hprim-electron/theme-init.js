// Applique le thème (clair/sombre selon l'heure) AVANT le premier rendu, pour
// éviter un flash de thème au démarrage. Chargé en <head>, exécuté de façon
// synchrone avant le rendu du <body>. Le rafraîchissement horaire reste géré par
// autoDetectTheme() dans renderer.js. (Inline interdit par la CSP -> fichier dédié.)
(function () {
    // Couper les transitions/animations pendant le chargement pour éviter que les
    // changements de thème/i18n au démarrage ne s'animent (clignotement). La classe
    // est retirée par init.js une fois la fenêtre prête.
    document.documentElement.classList.add('no-anim');
    try {
        var h = new Date().getHours();
        // Règle alignée sur autoDetectTheme() : sombre de 19h à 7h.
        var theme = (h >= 19 || h < 7) ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {
        // En cas d'échec, le CSS retombe sur le thème clair par défaut.
    }
})();
