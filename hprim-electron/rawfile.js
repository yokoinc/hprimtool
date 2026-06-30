// ============================================================================
// Visualiseur "fichier brut" : ouvre le contenu source dans une fenêtre
// dédiée, suit le thème jour/nuit, échappe le contenu (anti-XSS) et attache
// les listeners depuis la fenêtre parente (CSP : pas de script inline).
// Script classique : fonctions globales.
// ============================================================================

function showRawFile() {
    if (!currentFileContent) {
        const noFileMsg = window.i18n ? window.i18n.t('messages.no_file') : 'No file loaded';
        alert(noFileMsg);
        return;
    }

    // Revenir à l'ouverture dans une nouvelle fenêtre
    showRawFilePopup();
}

function showRawFilePopup() {
    if (!currentFileContent) {
        const noFileMsg = window.i18n ? window.i18n.t('messages.no_file') : 'No file loaded';
        alert(noFileMsg);
        return;
    }

    // Créer une nouvelle fenêtre ou un modal pour afficher le contenu brut
    const rawWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    if (rawWindow) {
        const title = window.i18n ? window.i18n.t('buttons.view_raw') : 'Fichier brut';
        const linesLabel = window.i18n ? window.i18n.t('file.lines') : 'Lignes';
        const charsLabel = window.i18n ? window.i18n.t('file.characters') : 'caractères';
        const printLabel = window.i18n ? window.i18n.t('buttons.print') : 'Imprimer';
        const closeLabel = window.i18n ? window.i18n.t('buttons.close') : 'Fermer';
        // Compte robuste des lignes (gère \r\n, \r seul et \n)
        const lineCount = currentFileContent.split(/\r\n|\r|\n/).length;
        const escaped = currentFileContent.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        // Le popup suit le thème jour/nuit de la fenêtre principale
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const themeVars = isDark
            ? '--bg:#0f172a;--surface:#1e293b;--border:#334155;--text:#e2e8f0;--text-2:#cbd5e1;--text-3:#94a3b8;'
            : '--bg:#f1f5f9;--surface:#ffffff;--border:#e2e8f0;--text:#0f172a;--text-2:#475569;--text-3:#64748b;';

        rawWindow.document.write(`
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <title>${title} - HPRIM Tool</title>
                <style>
                    :root { ${themeVars} }
                    * { box-sizing: border-box; }
                    body {
                        font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
                        background: var(--bg); color: var(--text);
                        margin: 0; padding: 18px;
                        -webkit-font-smoothing: antialiased;
                    }
                    .header {
                        display: flex; align-items: center; justify-content: space-between;
                        gap: 16px; flex-wrap: wrap;
                        background: var(--surface); border: 1px solid var(--border);
                        border-radius: 6px; padding: 13px 18px; margin-bottom: 14px;
                        -webkit-app-region: drag; /* zone de déplacement (fenêtre sans cadre) */
                    }
                    .header h2 { margin: 0; font-size: 16px; font-weight: 500; letter-spacing: -0.2px; }
                    .stats { font-size: 12px; color: var(--text-3); margin-top: 2px; }
                    .actions { display: flex; gap: 8px; }
                    .btn {
                        background: var(--surface); color: var(--text-2);
                        border: 1px solid var(--border); padding: 7px 14px;
                        border-radius: 4px; cursor: pointer; font-size: 13px;
                        font-weight: 500; font-family: inherit;
                        -webkit-app-region: no-drag; /* cliquable malgré l'en-tête draggable */
                    }
                    .btn:hover { background: var(--bg); border-color: var(--text-3); }
                    .content {
                        background: var(--surface); border: 1px solid var(--border);
                        border-radius: 6px; padding: 16px 18px;
                        white-space: pre-wrap; overflow-wrap: break-word;
                        font-family: 'Consolas', 'SFMono-Regular', 'Courier New', monospace;
                        font-size: 12px; line-height: 1.5; color: var(--text);
                    }
                    @media print {
                        body { background: #fff; margin: 0; padding: 0; }
                        .header { display: none !important; }
                        .content { border: none; border-radius: 0; padding: 0; font-size: 8pt; line-height: 1.2; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h2>${title}</h2>
                        <div class="stats">${lineCount} ${linesLabel} · ${currentFileContent.length} ${charsLabel}</div>
                    </div>
                    <div class="actions">
                        <button class="btn print-btn">${printLabel}</button>
                        <button class="btn close-btn">${closeLabel}</button>
                    </div>
                </div>
                <div class="content" id="rawContent">${escaped}</div>
            </body>
            </html>
        `);
        rawWindow.document.close();
        // Listeners attachés depuis la fenêtre parente (CSP : pas de onclick/script inline dans le popup)
        const printBtn = rawWindow.document.querySelector('.print-btn');
        const closeBtn = rawWindow.document.querySelector('.close-btn');
        if (printBtn) printBtn.addEventListener('click', () => rawWindow.print());
        if (closeBtn) closeBtn.addEventListener('click', () => rawWindow.close());
    } else {
        // Fallback si popup bloquée : afficher dans un alert (pas idéal mais fonctionnel)
        alert('Impossible d\'ouvrir une nouvelle fenêtre. Contenu du fichier :\n\n' +
              currentFileContent.substring(0, 1000) + (currentFileContent.length > 1000 ? '...' : ''));
    }
}
