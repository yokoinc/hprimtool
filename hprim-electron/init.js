// Initialisation de l'UI au chargement (externalisé pour compatibilité CSP script-src 'self').
document.addEventListener('DOMContentLoaded', async function () {
    try {
        if (window.i18n) {
            await window.i18n.autoDetectLanguage();
            window.i18n.updateUI();
        } else {
            console.error('window.i18n non disponible!');
        }
    } catch (e) {
        console.error('Initialisation i18n échouée:', e);
    } finally {
        // Thème (theme-init.js) + i18n appliqués : signaler au processus principal
        // que la fenêtre peut être affichée, après 2 frames pour garantir un premier
        // rendu peint -> pas de clignotement. Puis réactiver les transitions.
        requestAnimationFrame(() => requestAnimationFrame(() => {
            if (window.electronAPI && window.electronAPI.notifyReady) {
                window.electronAPI.notifyReady();
            }
            requestAnimationFrame(() => document.documentElement.classList.remove('no-anim'));
        }));
    }
});
