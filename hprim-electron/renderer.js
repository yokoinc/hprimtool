// Plus besoin d'importer ipcRenderer - on utilise electronAPI exposé par preload.js

// Variables globales
const dropZone = document.getElementById('dropZone');
const results = document.getElementById('results');
let currentFileContent = null; // Stockage du contenu brut du fichier

// ============================================================================
// OPTIMISATIONS DE PERFORMANCE
// ============================================================================

// Map d'encodage précompilée pour éviter les multiples replace()

// Écouter les événements d'ouverture de fichier via electronAPI
window.electronAPI.onFileToOpen((filePath) => {
    Logger.debug('Fichier reçu:', filePath);
    handleFile(filePath);
});

window.electronAPI.onFileSelected((filePath) => {
    Logger.debug('Fichier sélectionné:', filePath);
    handleFile(filePath);
});

// Fonction pour traiter un fichier
async function handleFile(filePath) {
    Logger.debug('handleFile appelé avec:', filePath);
    
    if (!filePath) {
        Logger.error('Aucun chemin de fichier fourni');
        results.innerHTML = '<p style="color: red;">Aucun fichier spécifié</p>';
        return;
    }
    
    try {
        Logger.debug('Tentative de lecture du fichier:', filePath);
        
        // Afficher le message de chargement et définir le curseur
        document.body.style.cursor = 'wait';
        const loadingMsg = window.i18n ? window.i18n.t('messages.loading') : 'Chargement du fichier';
        results.innerHTML = `<p style="color: blue;">${loadingMsg}: ${filePath}</p>`;
        
        // Lire le fichier avec Electron via electronAPI
        const content = await window.electronAPI.readFile(filePath);
        Logger.debug('Contenu lu, longueur:', content.length);
        
        Logger.debug('Début du parsing et affichage...');
        parseAndDisplay(content);
        Logger.debug('Fichier traité avec succès');
        
    } catch (error) {
        Logger.error('Erreur détaillée lors de la lecture du fichier:', error);
        
        // Réinitialiser l'état d'ouverture et le curseur même en cas d'erreur
        isOpeningFile = false;
        document.body.style.cursor = 'default';
        
        let errorMsg = 'Erreur lors de la lecture du fichier';
        if (error.message) {
            errorMsg += ': ' + error.message;
        }
        
        const fileErrorMsg = window.i18n ? window.i18n.t('messages.file_error') : 'Erreur lors de la lecture du fichier';
        results.innerHTML = `<p style="color: red;">${fileErrorMsg}: ${error.message}</p>
                            <p style="color: #666; font-size: 0.9em;">Fichier: ${filePath}</p>`;
    }
}

// Glisser-déposer : on lit le CONTENU du fichier (API web standard file.arrayBuffer(),
// disponible en sandbox et sur toute version d'Electron) et on le décode côté main.
// Indépendant de File.path (retiré en Electron 32+) et de webUtils (Electron 30+).
async function handleDroppedFile(file) {
    try {
        document.body.style.cursor = 'wait';
        const loadingMsg = window.i18n ? window.i18n.t('messages.loading') : 'Chargement du fichier';
        results.innerHTML = `<p style="color: blue;">${loadingMsg}: ${file.name}</p>`;

        const bytes = new Uint8Array(await file.arrayBuffer());
        const content = await window.electronAPI.decodeBuffer(bytes, file.name);
        parseAndDisplay(content);
    } catch (error) {
        isOpeningFile = false;
        document.body.style.cursor = 'default';
        const fileErrorMsg = window.i18n ? window.i18n.t('messages.file_error') : 'Erreur lors de la lecture du fichier';
        results.innerHTML = `<p style="color: red;">${fileErrorMsg}: ${error.message}</p>`;
        Logger.error('Erreur glisser-déposer:', error);
    }
}

// Initialiser l'application après le chargement
window.addEventListener('load', () => {
    // Afficher le message d'accueil
    // Message d'accueil simple - pas d'instructions évidentes
    results.innerHTML = '';
});

// Drag & Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        await handleDroppedFile(files[0]);
    }
});

// Variable pour éviter les doubles clics
let isOpeningFile = false;

// Clic sur la zone de drop pour ouvrir un fichier
dropZone.addEventListener('click', () => {
    if (isOpeningFile) return;
    
    isOpeningFile = true;
    // Envoyer un message au processus principal pour ouvrir la boîte de dialogue
    window.electronAPI.openFileDialog();
    
    // Réinitialiser après un court délai (sécurité)
    setTimeout(() => {
        isOpeningFile = false;
        document.body.style.cursor = 'default';
    }, 2000);
});

// ============================================================================
// FONCTIONS POUR LES BOUTONS DE L'INTERFACE
// ============================================================================

// Délégation des clics : les boutons portent un data-action (compatible CSP
// script-src 'self', et fonctionne pour le HTML généré dynamiquement).
const UI_ACTIONS = {
    'toggle-search': () => toggleSearch(),
    'print': () => window.print(),
    'export': () => exportToCSV(),
    'quit': () => quitApp(),
    'open': () => openFile(),
    'clear-search': () => clearSearch(),
    'view-raw': () => showRawFile()
};
document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const handler = UI_ACTIONS[target.dataset.action];
    if (handler) handler();
});

// Fonction pour ouvrir un fichier (bouton "Ouvrir")
function openFile() {
    if (isOpeningFile) return;
    
    isOpeningFile = true;
    window.electronAPI.openFileDialog();
    
    // Réinitialiser après un court délai (sécurité)
    setTimeout(() => {
        isOpeningFile = false;
        document.body.style.cursor = 'default';
    }, 2000);
}

// Fonction pour quitter l'application (bouton "Quitter")
function quitApp() {
    window.electronAPI.quitApp();
}

// ============================================================================
// FONCTION DE RECHERCHE LÉGÈRE
// ============================================================================

function toggleSearch() {
    const searchContainer = document.getElementById('searchContainer');
    if (searchContainer) {
        // Avant de fermer, réinitialiser l'affichage
        resetSearchDisplay();
        searchContainer.remove();
        return;
    }
    
    // Créer la barre de recherche
    const placeholder = window.i18n ? window.i18n.t('search.placeholder') : 'Rechercher dans les résultats...';
    const clearText = window.i18n ? window.i18n.t('search.clear') : 'Effacer';
    const closeText = window.i18n ? window.i18n.t('buttons.close') : 'Fermer';
    const searchHTML = `
        <div id="searchContainer" class="search-bar">
            <div class="search-row">
                <input type="text" id="searchInput" class="search-input" placeholder="${placeholder}">
                <button class="btn" data-action="clear-search">${clearText}</button>
                <button class="btn" data-action="toggle-search">${closeText}</button>
            </div>
            <div id="searchStats" class="search-stats" style="display: none;"></div>
        </div>
    `;

    // Insérer après l'en-tête
    const header = document.querySelector('header');
    header.insertAdjacentHTML('afterend', searchHTML);

    // Écouteurs de l'input (CSP : pas de oninput/onkeyup inline)
    const input = document.getElementById('searchInput');
    input.addEventListener('input', (e) => performSearch(e.target.value));
    input.addEventListener('keyup', handleSearchKeyup);
    input.focus();
}

function performSearch(query) {
    const results = document.querySelectorAll('.result-item');
    const searchStats = document.getElementById('searchStats');
    
    if (!query.trim()) {
        // Afficher tous les résultats
        results.forEach(result => {
            result.style.display = '';
            // Supprimer le highlighting
            removeHighlighting(result);
        });
        searchStats.style.display = 'none';
        return;
    }
    
    let visibleCount = 0;
    const queryLower = query.toLowerCase();
    
    results.forEach(result => {
        const text = result.textContent.toLowerCase();
        const isMatch = text.includes(queryLower);
        
        if (isMatch) {
            result.style.display = '';
            visibleCount++;
            
            // Highlighter les termes trouvés
            highlightText(result, query);
        } else {
            result.style.display = 'none';
            // Supprimer le highlighting des éléments cachés aussi
            removeHighlighting(result);
        }
    });
    
    // Afficher les statistiques
    const statsText = window.i18n ? 
        window.i18n.t('search.results', {count: visibleCount, total: results.length}) : 
        `${visibleCount} résultat(s) trouvé(s) sur ${results.length}`;
    searchStats.textContent = statsText;
    searchStats.style.display = 'block';
}

function highlightText(element, query) {
    // Supprimer ancien highlighting
    removeHighlighting(element);
    
    // Nouveau highlighting sécurisé qui préserve la structure HTML
    highlightTextNodes(element, query);
}

function removeHighlighting(element) {
    const marks = element.querySelectorAll('mark[data-search-highlight]');
    marks.forEach(mark => {
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize(); // Fusionner les nœuds texte adjacents
    });
}

function highlightTextNodes(element, query) {
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
        if (regex.test(node.textContent)) {
            textNodes.push(node);
        }
    }
    
    // Traiter les nœuds texte en sens inverse pour éviter les problèmes d'index
    textNodes.reverse().forEach(textNode => {
        const text = textNode.textContent;
        const parts = text.split(regex);
        
        if (parts.length > 1) {
            const fragment = document.createDocumentFragment();
            
            for (let i = 0; i < parts.length; i++) {
                if (i % 2 === 0) {
                    // Texte normal
                    if (parts[i]) {
                        fragment.appendChild(document.createTextNode(parts[i]));
                    }
                } else {
                    // Texte à surligner
                    const mark = document.createElement('mark');
                    mark.setAttribute('data-search-highlight', 'true');
                    mark.style.background = '#ffeb3b';
                    mark.style.padding = '1px 2px';
                    mark.style.borderRadius = '2px';
                    mark.textContent = parts[i];
                    fragment.appendChild(mark);
                }
            }
            
            textNode.parentNode.replaceChild(fragment, textNode);
        }
    });
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        performSearch('');
    }
}

function resetSearchDisplay() {
    const results = document.querySelectorAll('.result-item');
    
    // Afficher tous les résultats
    results.forEach(result => {
        result.style.display = '';
        // Supprimer tous les highlighting
        removeHighlighting(result);
    });
    
    Logger.debug('Affichage des résultats réinitialisé - tous les résultats visibles');
}

function handleSearchKeyup(event) {
    if (event.key === 'Escape') {
        toggleSearch();
    }
}

// ============================================================================
// COPIE EXACTE DU CODE DE PARSING DEPUIS LE FICHIER ORIGINAL
// ============================================================================

function parseAndDisplay(content) {
    Logger.debug('parseAndDisplay called with content length:', content.length);
    
    // Effacer immédiatement le message de chargement et réinitialiser le curseur
    results.innerHTML = '';
    document.body.style.cursor = 'default';
    
    // Réinitialiser l'état d'ouverture de fichier
    isOpeningFile = false;
    
    // Stocker le contenu brut pour l'affichage éventuel
    currentFileContent = content;
    
    // Passer la zone de drag & drop en mode compact une fois qu'un fichier est ouvert
    dropZone.classList.add('compact');
    
    // Utiliser les traductions pour le mode compact
    if (window.i18n) {
        window.i18n.updateDropZone();
    } else {
        // Fallback si i18n n'est pas encore chargé
        const compactContent = `
            <h3 data-i18n="dropzone.compact_title">Glisser un autre fichier</h3>
            <button class="btn" data-action="open" data-i18n="buttons.select_file">Sélectionner un fichier</button>
        `;
        dropZone.innerHTML = compactContent;
    }
    
    // Extraire les informations patient
    const patientInfo = extractPatientInfo(content);
    Logger.debug('Patient info:', patientInfo);
    
    const parsed = parseHPRIM(content);
    Logger.debug('Parsed results:', parsed);
    
    let html = '';

    // Ajouter l'en-tête patient si disponible
    if (patientInfo.patientName || patientInfo.samplingDate) {
        html += generatePatientHeader(patientInfo);
    }

    // Bandeau de synthèse (valeurs élevées / basses / normales)
    html += generateSummaryBar(parsed);

    let rowsHtml = '';
    for (const result of parsed) {
        
        // Détecter si c'est un commentaire/conclusion/résultats textuels (texte libre)
        const isTextResult = result.name.toLowerCase().includes('commentaire') || 
                            result.name.toLowerCase().includes('conclusion') ||
                            result.name.toLowerCase().includes('interprétation') ||
                            result.name.toLowerCase().includes('observation') ||
                            result.name.toLowerCase().includes('résultats') ||
                            result.name.toLowerCase().includes('technique') ||
                            result.name.toLowerCase().includes('mise en garde') ||
                            (result.unit1 && result.unit1.length > 50) || // Texte long dans l'unité = probablement du texte libre
                            (result.value1 && result.value1.length > 50 && !result.value1.match(/^\d/)); // Valeur1 est un long texte (pas numérique)
        
        if (isTextResult) {
            // Affichage spécial pour les commentaires/conclusions sur toute la largeur.
            // On échappe chaque fragment de données du fichier, puis on assemble avec
            // notre propre balisage <br> (anti-XSS sans casser la mise en forme).
            let textContent = escapeHtml(result.unit1 || result.value1 || '');

            // Pour "Mise en garde", le contenu est dans value1, pas unit1
            if (result.name.toLowerCase().includes('mise en garde')) {
                textContent = escapeHtml(result.value1 || '');
                // Forcer le titre en majuscules sans le contenu
                result.name = 'MISE EN GARDE :';
            }

            // Inclure aussi les commentaires associés s'il y en a
            if (result.comments && result.comments.length > 0) {
                const additionalComments = result.comments
                    .filter(comment => comment.trim())
                    .map(escapeHtml)
                    .join('<br>• ');
                if (additionalComments) {
                    textContent += '<br>• ' + additionalComments;
                }
            }
            
            rowsHtml += `
                <div class="result-item text-result">
                    <div class="text-result-title">${svgIcon('message')}<span>${escapeHtml(result.name)}</span></div>
                    <div class="text-result-body">${textContent}</div>
                </div>
            `;
        } else {
            // Affichage normal pour les résultats avec valeurs numériques

            // État (statut explicite H/L OU comparaison numérique aux normes).
            // L'anomalie reste signalée par la valeur colorée + la ligne teintée + la barre.
            const status = getResultState(result);
            const stateClass = (status === 'high' || status === 'low') ? ` is-${status}` : '';

            const formattedValue1 = formatValue(result.value1, result.operator1 || null, result.isHighlighted1 || false);
            const formattedNormes1 = formatNorms(result.min1, result.max1, result);

            let valuesColumn = `<div class="value-line">
                <span class="result-number">${formattedValue1}</span>
                <span class="result-unit">${escapeHtml(result.unit1)}</span>
            </div>`;

            if (result.hasMultipleUnits) {
                const formattedValue2 = formatValue(result.value2, result.operator2 || null, result.isHighlighted2 || false);
                valuesColumn += `<div class="value-line">
                    <span class="result-number">${formattedValue2}</span>
                    <span class="result-unit">${escapeHtml(result.unit2)}</span>
                </div>`;
            }

            // Colonne centrale : barre de position si intervalle numérique, sinon normes en texte
            const midColumn = buildRangeColumn(result.value1, result.min1, result.max1, result.unit1, status, formattedNormes1);

            // Commentaires associés
            let commentsHtml = '';
            if (result.comments && result.comments.length > 0) {
                const allComments = result.comments.filter(comment => comment.trim()).join(' ');
                if (allComments) {
                    commentsHtml += `<div class="result-comment">${escapeHtml(allComments)}</div>`;
                }
            }

            const loVal = parseFloat(result.min1);
            const hiVal = parseFloat(result.max1);
            const dataAttrs = `data-status="${escapeHtml(result.status || '')}"`
                + (isFinite(loVal) ? ` data-min="${loVal}"` : '')
                + (isFinite(hiVal) ? ` data-max="${hiVal}"` : '');

            rowsHtml += `
                <div class="result-item${stateClass}" ${dataAttrs}>
                    <div class="result-name">${escapeHtml(result.name)}</div>
                    <div class="result-mid">${midColumn}</div>
                    <div class="result-value-container">${valuesColumn}</div>
                    ${commentsHtml}
                </div>
            `;
        }
    }
    
    if (rowsHtml) {
        html += `<div class="results-card">${rowsHtml}</div>`;
    }

    const noResultsMsg = window.i18n ? window.i18n.t('messages.no_results') : 'Aucun résultat trouvé';
    results.innerHTML = html || `<p style="text-align:center;color:var(--text-3);padding:24px 0;">${noResultsMsg}</p>`;
    
    // Activer les boutons imprimer/export s'il y a des résultats
    const printBtn = document.getElementById('printBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    if (html && html.trim() !== '') {
        if (printBtn) {
            printBtn.disabled = false;
            printBtn.style.opacity = '1';
        }
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.style.opacity = '1';
        }
        Logger.debug('✅ Boutons export activés');
    } else {
        if (printBtn) {
            printBtn.disabled = true;
            printBtn.style.opacity = '0.5';
        }
        if (exportBtn) {
            exportBtn.disabled = true;
            exportBtn.style.opacity = '0.5';
        }
        Logger.debug('❌ Boutons export désactivés (aucun résultat)');
    }
    
    // Ajouter le bouton "Voir fichier brut" en bas de la page si un fichier est chargé
    if (currentFileContent) {
        const viewRawText = window.i18n ? window.i18n.t('buttons.view_raw') : 'Voir fichier brut';
        const rawButton = `
            <div class="raw-footer">
                <button class="btn" data-action="view-raw">
                    ${svgIcon('file')}<span>${viewRawText}</span>
                </button>
            </div>
        `;
        results.innerHTML += rawButton;
    }
}

// Fonction pour détecter le format HPRIM

// ============================================================================
// HELPERS UI — barre de position, bandeau de synthèse
// ============================================================================

// Icônes retirées : interface uniforme, texte uniquement. Conservé en no-op
// pour ne pas casser les points d'appel qui l'utilisaient.
function svgIcon() {
    return '';
}

// Construit la colonne centrale : barre de position si l'intervalle est numérique,
// sinon repli sur les normes affichées en texte.
function buildRangeColumn(value1, min1, max1, unit1, status, normsText) {
    const norms = `<div class="result-norms">${normsText || ''}</div>`;
    const v = parseFloat(String(value1).replace(',', '.'));
    const lo = parseFloat(min1);
    const hi = parseFloat(max1);

    // Barre uniquement si l'intervalle est numérique et borné des deux côtés.
    if (!(isFinite(v) && isFinite(lo) && isFinite(hi) && hi > lo)) return norms;

    // La bande verte (normes) occupe 18%..82% ; on place le marqueur en conséquence.
    const frac = (v - lo) / (hi - lo);
    let left = 18 + frac * 64;
    if (left < 3) left = 3;
    if (left > 97) left = 97;
    const markerClass = status === 'high' ? ' is-high' : (status === 'low' ? ' is-low' : '');
    const unitLabel = unit1 ? ` ${escapeHtml(unit1)}` : '';

    return `
        <div class="result-range">
            <div class="range-track">
                <div class="range-band"></div>
                <div class="range-marker${markerClass}" style="left: ${left}%"></div>
            </div>
            <div class="range-scale"><span>${lo}</span><span>${hi}${unitLabel}</span></div>
        </div>
        ${norms}
    `;
}


// Compte les valeurs élevées / basses / normales et construit le bandeau de synthèse.
function generateSummaryBar(parsed) {
    let high = 0, low = 0, normal = 0;
    for (const r of parsed) {
        const state = getResultState(r);
        if (state === 'high') high++;
        else if (state === 'low') low++;
        else if (state === 'normal') normal++;
    }
    if (high + low + normal === 0) return '';

    const lang = window.i18n ? window.i18n.getCurrentLanguage() : 'fr';
    const label = (n, kind, fallback) => {
        let base = window.i18n ? window.i18n.t('summary.' + kind, {}, fallback) : fallback;
        if (lang === 'fr' && n > 1) base += 's';
        return base;
    };

    const chip = (kind, n, text) =>
        `<div class="summary-chip ${kind}"><span class="summary-num">${n}</span><span class="summary-label">${text}</span></div>`;

    let chips = '';
    if (high) chips += chip('high', high, label(high, 'high', 'élevée'));
    if (low) chips += chip('low', low, label(low, 'low', 'basse'));
    if (normal) chips += chip('ok', normal, label(normal, 'normal', 'normale'));
    return `<div class="summary-bar">${chips}</div>`;
}

function getPatientInitials(name) {
    if (!name) return '?';
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
}

function generatePatientHeader(patientInfo) {
    const name = patientInfo.patientName || '';
    const initials = getPatientInitials(name);

    // Sous-titre : âge + date de naissance
    const subParts = [];
    if (patientInfo.age !== null && patientInfo.age !== undefined) {
        const ageText = window.i18n ? window.i18n.t('patient.years_old') : 'ans';
        subParts.push(`${patientInfo.age} ${ageText}`);
    }
    if (patientInfo.birthDate) {
        const bornText = window.i18n ? window.i18n.t('patient.born') : 'Né(e) le';
        subParts.push(`${bornText} ${formatDate(patientInfo.birthDate)}`);
    }
    const subLine = subParts.join(' · ');

    // Ligne de méta : prescripteur, laboratoire, prélèvement
    const metaItems = [];
    if (patientInfo.doctorName) {
        const prescripteurDisplay = patientInfo.doctorName.toLowerCase().startsWith('dr')
            ? patientInfo.doctorName
            : `Dr ${patientInfo.doctorName}`;
        metaItems.push(`<span>${svgIcon('stethoscope')}${escapeHtml(prescripteurDisplay)}</span>`);
    }
    if (patientInfo.laboratoryName) {
        const labDisplay = patientInfo.laboratoryName.toLowerCase().includes('laboratoire')
            ? patientInfo.laboratoryName
            : `${window.i18n ? window.i18n.t('patient.laboratory') : 'Laboratoire'} : ${patientInfo.laboratoryName}`;
        metaItems.push(`<span>${svgIcon('flask')}${escapeHtml(labDisplay)}</span>`);
    }
    if (patientInfo.samplingDate) {
        const samplingText = window.i18n ? window.i18n.t('patient.sampling') : 'Prélèvement';
        let samplingLine = `${samplingText} ${formatDate(patientInfo.samplingDate)}`;
        if (patientInfo.samplingTime) {
            const atText = window.i18n ? window.i18n.t('patient.sampling_at') : 'à';
            samplingLine += ` ${atText} ${escapeHtml(patientInfo.samplingTime)}`;
        }
        metaItems.push(`<span>${svgIcon('calendar')}${samplingLine}</span>`);
    }

    let warning = '';
    if (patientInfo.confidence < 0.8) {
        const warningText = window.i18n ? window.i18n.t('messages.low_confidence') : 'Informations extraites avec confiance réduite';
        warning = `<div class="patient-warning">${svgIcon('alert')}${warningText}</div>`;
    }

    return `
        <div class="patient-card">
            <div class="patient-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
            <div class="patient-info">
                <div class="patient-identity">
                    ${name ? `<span class="patient-name">${escapeHtml(name)}</span>` : ''}
                    ${subLine ? `<span class="patient-sub">${escapeHtml(subLine)}</span>` : ''}
                </div>
                ${metaItems.length ? `<div class="patient-meta">${metaItems.join('')}</div>` : ''}
                ${warning}
            </div>
        </div>
    `;
}

function formatDate(date) {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// ============================================================================
// FONCTIONS POUR LE MENU IMPRIMER/EXPORT
// ============================================================================

// ============================================================================
// DÉTECTION AUTOMATIQUE DU THÈME SELON L'HEURE
// ============================================================================

function autoDetectTheme() {
    const now = new Date();
    const hour = now.getHours();
    
    // Mode sombre de 19h à 7h, mode clair de 7h à 19h
    const isDarkTime = hour >= 19 || hour < 7;
    const theme = isDarkTime ? 'dark' : 'light';
    
    // Appliquer le thème
    document.documentElement.setAttribute('data-theme', theme);
    
    Logger.debug(`Thème automatique détecté: ${theme} (${hour}h)`);
    
    // Programmer la prochaine vérification à la prochaine heure pleine
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    const msUntilNextHour = nextHour.getTime() - now.getTime();
    
    setTimeout(() => {
        autoDetectTheme();
        // Puis vérifier toutes les heures
        setInterval(autoDetectTheme, 60 * 60 * 1000);
    }, msUntilNextHour);
}

// Initialiser la détection automatique au chargement de la page
window.addEventListener('load', () => {
    autoDetectTheme();
});

// ============================================================================
// DÉTECTION AUTOMATIQUE DE LA LANGUE
// ============================================================================

// La détection automatique de la langue est maintenant gérée dans i18n.js
// via la méthode autoDetectLanguage()

// ============================================================================
// FONCTIONS POUR LES MENUS D'EXPORT
// ============================================================================

// Fonctions menu export supprimées - export direct CSV

// Fonctions d'export
async function exportToCSV() {
    const resultsData = extractResultsData();
    if (!resultsData || resultsData.length === 0) {
        const noDataMsg = window.i18n ? window.i18n.t('messages.no_export_data') : 'Aucun résultat à exporter';
        alert(noDataMsg);
        return;
    }

    try {
        const patientNameElement = document.querySelector('.patient-name');
        const patientName = patientNameElement ? patientNameElement.textContent.trim() : 'Patient';
        
        const result = await window.electronAPI.exportToExcel(resultsData, patientName);
        
        if (result.success) {
            const successMsg = window.i18n ? window.i18n.t('messages.export_success') : 'Export réussi !';
            alert(`${successMsg}\nFichier: ${result.path}`);
        } else if (!result.cancelled) {
            const errorMsg = window.i18n ? window.i18n.t('messages.export_error') : 'Erreur lors de l\'export';
            alert(`${errorMsg}: ${result.error}`);
        }
    } catch (error) {
        const errorMsg = window.i18n ? window.i18n.t('messages.export_error') : 'Erreur lors de l\'export';
        alert(`${errorMsg}: ${error.message}`);
    }
}

// Fonction exportToExcel supprimée - seulement CSV maintenant

function extractResultsData() {
    const results = [];
    const resultItems = document.querySelectorAll('.result-item');
    
    resultItems.forEach(item => {
        // Ignorer les blocs de texte libre (interprétation, conclusion…)
        if (item.classList.contains('text-result')) return;

        const name = item.querySelector('.result-name')?.textContent?.trim() || '';
        const valueElement = item.querySelector('.result-number');
        const value1 = valueElement?.textContent?.trim() || '';
        const unit1 = item.querySelector('.result-unit')?.textContent?.trim() || '';

        // Normes lues depuis les data-* (fiable), repli sur le texte des normes
        let min1 = item.dataset.min !== undefined ? parseFloat(item.dataset.min) : null;
        let max1 = item.dataset.max !== undefined ? parseFloat(item.dataset.max) : null;
        if (min1 === null && max1 === null) {
            const normsElement = item.querySelector('.result-norms');
            if (normsElement) {
                const match = normsElement.textContent.trim().match(/\(([^)]+)\)/);
                if (match) {
                    const rangeMatch = match[1].match(/([\d.,]+)\s*-\s*([\d.,]+)/);
                    if (rangeMatch) {
                        min1 = parseFloat(rangeMatch[1].replace(',', '.'));
                        max1 = parseFloat(rangeMatch[2].replace(',', '.'));
                    }
                }
            }
        }

        // Anormal : statut explicite H/L (classes is-high / is-low)
        const isAbnormal = item.classList.contains('is-high') || item.classList.contains('is-low');

        if (name) {
            results.push({
                name,
                value1,
                unit1,
                min1,
                max1,
                isAbnormal
            });
        }
    });
    
    return results;
}

// Fonction pour afficher le fichier brut
function showRawFile() {
    if (!currentFileContent) {
        const noFileMsg = window.i18n ? window.i18n.t('messages.no_file') : 'No file loaded';
        alert(noFileMsg);
        return;
    }
    
    // Revenir à l'ouverture dans une nouvelle fenêtre
    showRawFilePopup();
}

// Fonction pour afficher le fichier brut (ancienne version popup en fallback)
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
                    }
                    .header h2 { margin: 0; font-size: 16px; font-weight: 500; letter-spacing: -0.2px; }
                    .stats { font-size: 12px; color: var(--text-3); margin-top: 2px; }
                    .actions { display: flex; gap: 8px; }
                    .btn {
                        background: var(--surface); color: var(--text-2);
                        border: 1px solid var(--border); padding: 7px 14px;
                        border-radius: 4px; cursor: pointer; font-size: 13px;
                        font-weight: 500; font-family: inherit;
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
        alert('Impossible d\'ouvrir une nouvelle fenêtre. Contenu du fichier :\\n\\n' + 
              currentFileContent.substring(0, 1000) + (currentFileContent.length > 1000 ? '...' : ''));
    }
}