// Initialisation de l'UI au chargement (externalisé pour compatibilité CSP script-src 'self').
document.addEventListener('DOMContentLoaded', async function () {
    if (window.i18n) {
        await window.i18n.autoDetectLanguage();
        setTimeout(() => { window.i18n.updateUI(); }, 100);
    } else {
        console.error('window.i18n non disponible!');
    }
});
