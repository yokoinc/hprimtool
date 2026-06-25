// Plus besoin d'importer ipcRenderer - on utilise electronAPI exposé par preload.js

// Variables globales
const dropZone = document.getElementById('dropZone');
const results = document.getElementById('results');
let currentFileContent = null; // Stockage du contenu brut du fichier

// ============================================================================
// OPTIMISATIONS DE PERFORMANCE
// ============================================================================

// Map d'encodage précompilée pour éviter les multiples replace()
const ENCODING_MAP = new Map([
    ['È', 'é'], ['Ë', 'è'], ['Ì', 'à'], ['Á', 'à'], ['Ç', 'ç'],
    ['É', 'e'], ['À', 'à'], ['Ù', 'u'], ['Ñ', 'n'], ['Â', 'â'],
    ['Ê', 'ê'], ['Î', 'î'], ['Ô', 'ô'], ['Û', 'û']
]);

// Regex précompilée pour performance
const ENCODING_REGEX = new RegExp(`[${Array.from(ENCODING_MAP.keys()).join('')}]`, 'g');

// Fonction optimisée de nettoyage d'encodage
function cleanEncoding(text) {
    if (!text) return text;
    return text.replace(ENCODING_REGEX, char => ENCODING_MAP.get(char) || char);
}

// Regex précompilées pour parsing
const VALUE_PATTERNS = {
    special: /^([<>≤≥=]+)\s*([\d.,\-+]+)/,
    numeric: /^([\d.,\-+]+)\s*([<>≤≥=]*)/,
    range: /([\d,\.]+)\s*[-–]\s*([\d,\.]+)/
};

// Système de logging conditionnel pour production
const Logger = {
    // En développement : process.env.NODE_ENV !== 'production'
    // En production : on ne garde que les erreurs critiques
    isDev: typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production',
    
    debug: function(msg, ...args) {
        if (this.isDev) console.log(msg, ...args);
    },
    
    info: function(msg, ...args) {
        if (this.isDev) console.log('ℹ️', msg, ...args);
    },
    
    warn: function(msg, ...args) {
        console.warn('⚠️', msg, ...args);
    },
    
    error: function(msg, ...args) {
        console.error('❌', msg, ...args);
    }
};

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
        await handleFile(files[0].path);
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
    const searchHTML = `
        <div id="searchContainer" class="search-bar">
            <div class="search-row">
                <input type="text" id="searchInput" class="search-input" placeholder="${placeholder}"
                       oninput="performSearch(this.value)" onkeyup="handleSearchKeyup(event)">
                <button class="btn" onclick="clearSearch()">${clearText}</button>
                <button class="btn btn-danger" onclick="toggleSearch()" aria-label="${clearText}">
                    ${svgIcon('close')}
                </button>
            </div>
            <div id="searchStats" class="search-stats" style="display: none;"></div>
        </div>
    `;
    
    // Insérer après l'en-tête
    const header = document.querySelector('header');
    header.insertAdjacentHTML('afterend', searchHTML);
    
    // Focus sur l'input
    document.getElementById('searchInput').focus();
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
            <button class="btn" onclick="openFile()" data-i18n="buttons.select_file">Sélectionner un fichier</button>
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
            // Affichage spécial pour les commentaires/conclusions sur toute la largeur
            let textContent = result.unit1 || result.value1 || '';
            
            // Pour "Mise en garde", le contenu est dans value1, pas unit1
            if (result.name.toLowerCase().includes('mise en garde')) {
                textContent = result.value1 || '';
                // Forcer le titre en majuscules sans le contenu
                result.name = 'MISE EN GARDE :';
            }
            
            // Ne pas transformer automatiquement les virgules en puces
            // Le texte sera affiché tel quel, sauf si le format source contient déjà des indicateurs de liste
            
            // Inclure aussi les commentaires associés s'il y en a
            if (result.comments && result.comments.length > 0) {
                const additionalComments = result.comments
                    .filter(comment => comment.trim())
                    .join('<br>• ');
                if (additionalComments) {
                    textContent += '<br>• ' + additionalComments;
                }
            }
            
            rowsHtml += `
                <div class="result-item text-result">
                    <div class="text-result-title">${svgIcon('message')}<span>${result.name}</span></div>
                    <div class="text-result-body">${textContent}</div>
                </div>
            `;
        } else {
            // Affichage normal pour les résultats avec valeurs numériques

            // État (statut explicite H/L OU comparaison numérique aux normes)
            const status = getResultState(result);
            const stateClass = (status === 'high' || status === 'low') ? ` is-${status}` : '';
            const badge = status === 'high'
                ? '<span class="value-badge badge-high">H</span>'
                : (status === 'low' ? '<span class="value-badge badge-low">L</span>' : '');

            const formattedValue1 = formatValue(result.value1, result.operator1 || null, result.isHighlighted1 || false);
            const formattedNormes1 = formatNorms(result.min1, result.max1, result);

            let valuesColumn = `<div class="value-line">
                <span class="result-number">${formattedValue1}</span>
                <span class="result-unit">${result.unit1}</span>${badge}
            </div>`;

            if (result.hasMultipleUnits) {
                const formattedValue2 = formatValue(result.value2, result.operator2 || null, result.isHighlighted2 || false);
                valuesColumn += `<div class="value-line">
                    <span class="result-number">${formattedValue2}</span>
                    <span class="result-unit">${result.unit2}</span>
                </div>`;
            }

            // Colonne centrale : barre de position si intervalle numérique, sinon normes en texte
            const midColumn = buildRangeColumn(result.value1, result.min1, result.max1, result.unit1, status, formattedNormes1);

            // Commentaires associés
            let commentsHtml = '';
            if (result.comments && result.comments.length > 0) {
                const allComments = result.comments.filter(comment => comment.trim()).join(' ');
                if (allComments) {
                    commentsHtml += `<div class="result-comment">${allComments}</div>`;
                }
            }

            const loVal = parseFloat(result.min1);
            const hiVal = parseFloat(result.max1);
            const dataAttrs = `data-status="${result.status || ''}"`
                + (isFinite(loVal) ? ` data-min="${loVal}"` : '')
                + (isFinite(hiVal) ? ` data-max="${hiVal}"` : '');

            rowsHtml += `
                <div class="result-item${stateClass}" ${dataAttrs}>
                    <div class="result-name">${result.name}</div>
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
                <button class="btn" onclick="showRawFile()">
                    ${svgIcon('file')}<span>${viewRawText}</span>
                </button>
            </div>
        `;
        results.innerHTML += rawButton;
    }
}

// Fonction pour détecter le format HPRIM
function detectHPRIMFormat(content) {
    if (content.includes('****LAB****') && content.includes('****FIN****')) {
        return 'structured_tags';
    } else if (content.includes('RES|') && content.split('RES|').length > 2) {
        return 'structured_pipes';
    } else if (content.includes('VR:') || content.includes('g/dL') || content.includes('/mm3')) {
        return 'text_readable';
    } else {
        return 'unknown';
    }
}

// Fonction pour décoder les entités HTML
function decodeHTMLEntities(text) {
    if (!text || typeof text !== 'string') return text;
    
    return text
        .replace(/&eacute;/g, 'é')
        .replace(/&egrave;/g, 'è')
        .replace(/&agrave;/g, 'à')
        .replace(/&acirc;/g, 'â')
        .replace(/&ocirc;/g, 'ô')
        .replace(/&ucirc;/g, 'û')
        .replace(/&icirc;/g, 'î')
        .replace(/&ccedil;/g, 'ç')
        .replace(/&deg;/g, '°')
        .replace(/&#039;/g, "'")
        .replace(/<br\s*\/?>/g, '\n')
        // Supprimer seulement les vraies balises HTML courantes
        .replace(/<\/?(?:p|div|span|b|i|strong|em|u|font|center|table|tr|td|th|tbody|thead|head|body|html)[^>]*>/gi, ''); // Balises HTML courantes seulement
}

// Fonction pour normaliser les valeurs numériques (virgule vers point)
function normalizeNumericValue(value) {
    if (!value || typeof value !== 'string') return value;
    
    // Remplacer virgule par point pour les décimales
    return value.replace(',', '.');
}

function parseHPRIM(content) {
    Logger.debug('Parsing HPRIM avec détection automatique de format...');
    
    // Décoder les entités HTML d'abord
    const decodedContent = decodeHTMLEntities(content);
    
    // Détecter le format sur le contenu décodé
    const format = detectHPRIMFormat(decodedContent);
    Logger.debug('Format détecté:', format);
    
    // Router vers le bon parser selon le format
    switch(format) {
        case 'structured_tags':
            return parseStructuredTagsHPRIM(decodedContent);
        case 'structured_pipes':
            return parseStructuredPipesHPRIM(decodedContent);
        case 'text_readable':
            return parseTextReadableHPRIM(decodedContent);
        default:
            Logger.warn('Format HPRIM non reconnu, tentative de parsing générique...');
            return parseStructuredPipesHPRIM(decodedContent); // Fallback vers l'ancien parser
    }
}

// Parser pour format avec tags ****LAB**** (nouveau)
function parseStructuredTagsHPRIM(content) {
    Logger.debug('Parsing format structuré avec tags...');
    const rawResults = [];
    const lines = content.split('\n');
    
    let inLabSection = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.includes('****LAB****')) {
            inLabSection = true;
            continue;
        }
        
        if (line.includes('****FIN****')) {
            inLabSection = false;
            continue;
        }
        
        if (inLabSection && line.startsWith('RES|')) {
            // Traiter comme le format pipes standard
            const result = parseRESLine(line);
            if (result) {
                // Collecter les TEX qui suivent
                const followingTexLines = collectFollowingTEX(lines, i);
                result.comments.push(...followingTexLines);
                rawResults.push(result);
            }
        }
    }
    
    return processRawResults(rawResults);
}

// Fonction helper pour collecter les TEX qui suivent une position donnée
function collectFollowingTEX(lines, startIndex, maxLines = 15) {
    const texLines = [];
    Logger.debug(`Collecte TEX pour ligne ${startIndex}:`, lines[startIndex]);
    
    for (let i = startIndex + 1; i < Math.min(startIndex + maxLines, lines.length); i++) {
        const line = lines[i];
        Logger.debug(`  Ligne ${i}: ${line}`);
        
        if (line.startsWith('TEX|')) {
            const texContent = line.substring(4).trim();
            Logger.debug(`    TEX trouvé: "${texContent}"`);
            if (texContent && texContent.length > 3 && !texContent.includes('---')) {
                // Corriger l'encodage
                const cleanText = cleanEncoding(texContent);
                texLines.push(cleanText);
                Logger.debug(`    TEX ajouté: "${cleanText}"`);
            } else {
                Logger.debug(`    TEX ignoré (trop court ou contient ---)`);
            }
        } else if (line.startsWith('RES|') || line.startsWith('LAB|')) {
            // Arrêter si on trouve un RES ou LAB
            Logger.debug(`    Arrêt: RES ou LAB trouvé`);
            break;
        } else if (line.trim() === '') {
            // Continuer même après une ligne vide, car des TEX importants peuvent suivre
            Logger.debug(`    Ligne vide, continuation`);
            continue;
        } else {
            Logger.debug(`    Autre ligne, continuation`);
        }
        // Sinon continuer (pour gérer les lignes entre TEX)
    }
    
    Logger.debug(`Résultat collecte: ${texLines.length} commentaires trouvés`);
    return texLines;
}

// Parser pour format structuré avec pipes RES| (amélioré) 
function parseStructuredPipesHPRIM(content) {
    Logger.debug('Parsing format structuré avec pipes...');
    const rawResults = [];
    const lines = content.split('\n');
    
    // Stratégie différente : d'abord identifier le DFG puis collecter tous ses commentaires
    let dfgIndex = -1;
    let dfgComments = [];
    
    // Trouver l'index du DFG
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('RES|') && (lines[i].toLowerCase().includes('dfg') || lines[i].toLowerCase().includes('ckd-epi'))) {
            dfgIndex = i;
            break;
        }
    }
    
    // Si on a trouvé le DFG, collecter tous les TEX| avant et après
    if (dfgIndex !== -1) {
        // Collecter les TEX| avant le DFG (en remontant)
        for (let i = dfgIndex - 1; i >= 0 && lines[i].startsWith('TEX|'); i--) {
            const textContent = lines[i].substring(4).trim();
            if (textContent && textContent.length > 3 && !textContent.includes('----')) {
                const cleanText = textContent
                    .replace(/&eacute;/g, 'é')
                    .replace(/&deg;/g, '°')
                    .replace(/&#039;/g, "'")
                    .replace(/<br \/>/g, ' ')
                    .replace(/\n/g, ' ')
                    .replace(/\r/g, ' ');
                dfgComments.unshift(cleanText); // unshift pour garder l'ordre
            }
        }
        
        // Collecter les TEX| après le DFG
        for (let i = dfgIndex + 1; i < lines.length && lines[i].startsWith('TEX|'); i++) {
            const textContent = lines[i].substring(4).trim();
            if (textContent && textContent.length > 3 && !textContent.includes('----')) {
                const cleanText = textContent
                    .replace(/&eacute;/g, 'é')
                    .replace(/&deg;/g, '°')
                    .replace(/&#039;/g, "'")
                    .replace(/<br \/>/g, ' ')
                    .replace(/\n/g, ' ')
                    .replace(/\r/g, ' ');
                dfgComments.push(cleanText);
            }
        }
    }
    
    // Debug: vérifier les premières lignes qui contiennent RES
    Logger.debug('Looking for RES lines...');
    const resLines = lines.filter(line => line.includes('RES|'));
    Logger.debug(`Found ${resLines.length} lines containing RES|`);
    if (resLines.length > 0) {
        Logger.debug('First RES line:', JSON.stringify(resLines[0]));
        Logger.debug('Starts with RES|?', resLines[0].startsWith('RES|'));
        
        // Debug: montrer les 5 premières lignes RES
        Logger.debug('Premières lignes RES trouvées:');
        resLines.slice(0, 5).forEach((line, index) => {
            Logger.debug(`RES ${index + 1}:`, line);
        });
    }
    
    // Vérifier s'il y a des lignes RES| dans le fichier
    const hasResLines = lines.some(line => line.startsWith('RES|'));
    
    if (!hasResLines) {
        // Format texte libre - parser différemment
        return parseTextFormatHPRIM(content);
    }
    
    // Maintenant parser normalement (format structuré)
    let currentSectionHeader = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Détecter les en-têtes de section TEX
        if (line.startsWith('TEX|')) {
            const texContent = line.substring(4).trim();
            // Si c'est un en-tête de section (contient des *, majuscules, etc.)
            if (texContent && (texContent.includes('*') || texContent.match(/^[A-Z\s]+$/) || texContent.includes('---'))) {
                currentSectionHeader = cleanEncoding(texContent);
            }
            continue;
        }
        
        if (line.startsWith('RES|')) {
            const parts = line.split('|');
            Logger.debug('Ligne RES trouvée, parts.length:', parts.length, 'Line:', line);
            if (parts.length >= 8) {
                const name = parts[1] ? parts[1].trim() : '';
                const code = parts[2] ? parts[2].trim() : '';
                const type = parts[3] ? parts[3].trim() : '';
                const valueStr = parts[4] ? parts[4].trim() : '';
                Logger.debug('RES ligne trouvée:', line);
                Logger.debug('Name:', name, 'ValueStr:', valueStr);
                const unit = parts[5] ? parts[5].trim() : '';
                const normStr = parts[6] ? parts[6].trim() : '';
                let maxStr = parts[7] ? parts[7].trim() : '';
                
                // Parser les normes au format "3,2-6,5" ou séparées
                let minStr = '';
                if (normStr && normStr.includes('-')) {
                    const normParts = normStr.split('-');
                    minStr = normParts[0].trim();
                    if (normParts.length > 1 && !maxStr) {
                        maxStr = normParts[1].trim();
                    }
                } else {
                    minStr = normStr;
                }
                const status = parts[8] ? parts[8].trim() : '';
                
                const value2Str = parts[10] ? parts[10].trim() : '';
                const unit2 = parts[11] ? parts[11].trim() : '';
                const norm2Str = parts[12] ? parts[12].trim() : '';
                let max2Str = parts[13] ? parts[13].trim() : '';
                
                // Parser les normes 2 au format "3,2-6,5" ou séparées
                let min2Str = '';
                if (norm2Str && norm2Str.includes('-')) {
                    const norm2Parts = norm2Str.split('-');
                    min2Str = norm2Parts[0].trim();
                    if (norm2Parts.length > 1 && !max2Str) {
                        max2Str = norm2Parts[1].trim();
                    }
                } else {
                    min2Str = norm2Str;
                }
                
                // Condition plus permissive pour capturer tous les résultats importants
                if (name && (valueStr || unit || type === 'T')) {
                    Logger.debug('Result added:', name, 'Type:', type, 'Value:', valueStr, 'Unit:', unit);
                    // Nettoyer le nom : supprimer "- " au début et normaliser les espaces
                    let cleanName = name.replace(/\s+/g, ' ').trim();
                    
                    // Supprimer les tirets et espaces en début de nom
                    cleanName = cleanName.replace(/^[-\s]+/, '').trim();
                    
                    Logger.debug('Nom nettoyé:', `"${name}" -> "${cleanName}"`);
                    
                    // Vérifier si c'est une ligne "soit" qui doit être fusionnée avec la précédente
                    if (cleanName.toLowerCase() === 'soit' && rawResults.length > 0) {
                        // Fusionner avec le dernier résultat
                        const lastResult = rawResults[rawResults.length - 1];
                        const parsedValue = parseSpecialValue(valueStr);
                        
                        // Ajouter comme deuxième valeur/unité
                        lastResult.value2 = parsedValue.value;
                        lastResult.unit2 = unit;
                        lastResult.min2 = parseNorm(minStr);
                        lastResult.max2 = parseNorm(maxStr);
                        lastResult.isHighlighted2 = parsedValue.highlighted;
                        lastResult.operator2 = parsedValue.operator;
                        lastResult.hasMultipleUnits = true;
                        
                        Logger.debug('Fusionné "soit" avec:', lastResult.name);
                        continue; // Passer au suivant sans créer un nouveau résultat
                    }
                    const cleanUnit = unit;
                    const cleanUnit2 = unit2 || '';
                    
                    // Détecter si valueStr est un commentaire long (pas une valeur numérique)
                    const isCommentInValue = valueStr && valueStr.length > 50 && !valueStr.match(/^[\d.,<>≤≥=\-\+\s]+/);
                    let actualValue = valueStr;
                    let actualUnit = unit;
                    let commentText = '';
                    
                    if (isCommentInValue && value2Str) {
                        // valueStr est un commentaire, value2Str est la vraie valeur
                        commentText = valueStr;
                        actualValue = value2Str;
                        actualUnit = unit2 || unit;
                        Logger.debug('Commentaire détecté dans valueStr pour:', name, 'Commentaire:', commentText.substring(0, 50) + '...');
                    }
                    
                    // Corriger l'encodage dans la valeur
                    const cleanValueStr = cleanEncoding(actualValue);
                    
                    // Parser les valeurs avec symboles spéciaux
                    const parsedValue1 = parseSpecialValue(cleanValueStr);
                    const parsedValue2 = value2Str ? parseSpecialValue(value2Str) : null;
                    
                    // Associer les commentaires DFG si c'est le DFG
                    let associatedComments = [];
                    if (cleanName.toLowerCase().includes('dfg') || cleanName.toLowerCase().includes('ckd-epi') || code.includes('1.6')) {
                        associatedComments = [...dfgComments];
                    }
                    
                    // Utiliser la fonction helper pour collecter les TEX qui suivent
                    const followingTexLines = collectFollowingTEX(lines, i);
                    associatedComments.push(...followingTexLines);
                    
                    // Ajouter le commentaire détecté dans valueStr s'il y en a un
                    if (commentText) {
                        const cleanCommentText = cleanEncoding(commentText);
                        associatedComments.push(cleanCommentText);
                    }
                    
                    // Gérer aussi les cas spéciaux où un RES contient du texte de conclusion
                    if (cleanName.toLowerCase().includes('commentaire') || 
                        cleanName.toLowerCase().includes('conclusion') ||
                        cleanName.toLowerCase().includes('résultats')) {
                        // Chercher aussi les RES textuels qui suivent
                        for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
                            const nextLine = lines[j];
                            if (nextLine.startsWith('RES|')) {
                                const nextResContent = nextLine.substring(4);
                                const nextResParts = nextResContent.split('|');
                                if (nextResParts.length >= 4) {
                                    const nextResName = nextResParts[2]?.trim();
                                    const nextResValue = nextResParts[3]?.trim();
                                    
                                    // Si le "résultat" suivant ressemble à du texte, l'inclure
                                    if (nextResValue && nextResValue.length > 5 && 
                                        (nextResValue.toLowerCase().includes('normale') || 
                                         nextResValue.toLowerCase().includes('flore') ||
                                         nextResValue.toLowerCase().includes('absence') ||
                                         nextResValue.toLowerCase().includes('présence') ||
                                         !nextResValue.match(/^\d/))) {
                                        associatedComments.push(`${nextResName}: ${nextResValue}`);
                                        continue;
                                    }
                                }
                                break; // Arrêter au prochain RES numérique
                            } else if (!nextLine.startsWith('TEX|')) {
                                break;
                            }
                        }
                    }
                    
                    // Ajouter " :" si pas déjà présent
                    const finalName = cleanName.endsWith(':') ? cleanName : cleanName + ' :';
                    Logger.debug('Nom final:', finalName);
                    
                    rawResults.push({
                        name: finalName,
                        code: code,
                        value1: parsedValue1.value,
                        unit1: cleanUnit,
                        min1: parseNorm(minStr),
                        max1: parseNorm(maxStr),
                        value2: parsedValue2 ? parsedValue2.value : null,
                        unit2: cleanUnit2,
                        min2: parseNorm(min2Str),
                        max2: parseNorm(max2Str),
                        status: status,
                        comments: associatedComments,
                        isHighlighted1: parsedValue1.highlighted,
                        isHighlighted2: parsedValue2 ? parsedValue2.highlighted : false,
                        operator1: parsedValue1.operator,
                        operator2: parsedValue2 ? parsedValue2.operator : null
                    });
                } else {
                    Logger.debug('Result IGNORED:', name, 'Type:', type, 'Value:', valueStr, 'Unit:', unit);
                }
            } else {
                Logger.debug('Line IGNORED (not enough parts):', line);
            }
        }
    }
    
    // Deuxième passe : créer les résultats groupés
    const groupedResults = [];
    
    for (const result of rawResults) {
        
        // Déterminer si anormal et s'il y a des normes
        let isAbnormal = false;
        let hasNorms = false;
        
        Logger.debug(`Analyse ${result.name}:`, {
            value1: result.value1,
            min1: result.min1,
            max1: result.max1,
            value2: result.value2,
            min2: result.min2,
            max2: result.max2,
            status: result.status
        });
        
        // Plus de détection automatique d'anomalies pour les couleurs
        // Seuls les indicateurs explicites (statut H/L) sont conservés pour le formatage en gras
        if (result.status === 'H' || result.status === 'L') {
            isAbnormal = true;
        }
        
        // hasNorms reste false par défaut - pas de couleurs automatiques
        
        groupedResults.push({
            name: result.name,
            isAbnormal: isAbnormal,
            hasNorms: hasNorms,
            hasMultipleUnits: result.value2 !== null && !isNaN(result.value2),
            value1: result.value1,
            unit1: result.unit1,
            min1: result.min1,
            max1: result.max1,
            value2: result.value2,
            unit2: result.unit2,
            min2: result.min2,
            max2: result.max2,
            comments: result.comments || [],
            isHighlighted1: result.isHighlighted1,
            isHighlighted2: result.isHighlighted2,
            operator1: result.operator1,
            operator2: result.operator2,
            status: result.status,
            code: result.code
        });
    }
    
    Logger.debug(`${rawResults.length} résultats bruts trouvés`);
    Logger.debug(`${groupedResults.length} résultats HPRIM groupés trouvés`);
    Logger.debug('Grouped results:', groupedResults);
    return groupedResults;
}

// Parser pour format texte lisible (amélioré)
function parseTextReadableHPRIM(content) {
    Logger.debug('Parsing format texte lisible...');
    const rawResults = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Pattern 1: Lignes avec VR: (ancien format)
        if (line.includes('VR:') || (line.includes('g/dL') && (line.includes(',') || line.includes('.')))) {
            const result = parseTextResultLine(line);
            if (result) rawResults.push(result);
        }
        
        // Pattern 2: Nouveau format détecté (LABORATOIRE DE FECAMP)
        // Format: NOM : VALEUR UNITE (MIN-MAX) ou VALEUR UNITE (CONDITIONS)
        else if (line.length > 10 && line.includes(':') && 
                 (line.includes('g/dL') || line.includes('G/L') || line.includes('/mm3') || 
                  line.includes('fL') || line.includes('pg') || line.includes('%') || line.includes('mmol/L'))) {
            
            const result = parseLabFecampLine(line);
            if (result) rawResults.push(result);
        }
    }
    
    return processRawResults(rawResults);
}

// Fonction pour parser une ligne de résultat en format texte
function parseTextResultLine(line) {
    // Pattern pour: NOM_TEST    VALEUR   UNITÉ   VR: MIN - MAX
    const patterns = [
        /^\s*([^\d]+?)\s+([*]?\d+[.,]?\d*[*]?)\s+([^\s]+)\s+VR:\s*([\d.,]+)\s*-\s*([\d.,]+)/,
        /^\s*([^\d]+?)\s+([*]?\d+[.,]?\d*[*]?)\s+([^\s]+)\s+VR:\s*<\s*([\d.,]+)/,
        /^\s*([^\d]+?)\s+([*]?\d+[.,]?\d*[*]?)\s+([^\s]+)\s+VR:\s*>\s*([\d.,]+)/
    ];
    
    for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
            const name = match[1].trim();
            const valueStr = match[2].trim();
            const unit = match[3].trim();
            
            const parsedValue = parseSpecialValue(valueStr);
            
            let min1 = null, max1 = null;
            if (match[4]) {
                if (pattern.source.includes('<')) {
                    max1 = parseNorm(match[4]);
                } else if (pattern.source.includes('>')) {
                    min1 = parseNorm(match[4]);
                } else {
                    min1 = parseNorm(match[4]);
                    max1 = match[5] ? parseNorm(match[5]) : null;
                }
            }
            
            return {
                name: name,
                value1: parsedValue.value,
                unit1: unit,
                min1: min1,
                max1: max1,
                isHighlighted1: parsedValue.highlighted,
                hasNorms: !!(min1 || max1),
                comments: []
            };
        }
    }
    
    return null;
}

// Fonction pour parser les lignes du format LABORATOIRE DE FECAMP
function parseLabFecampLine(line) {
    // Exemples de lignes à parser:
    // H�moglobine :                              14.6 g/dL    (12,1-15,0)
    // PLAQUETTES :                           *141000* /mm3    (150000-400000)
    // Neutrophiles % :                           42.6 %       -
    
    // Pattern principal: NOM : ESPACES VALEUR UNITE ESPACES (NORMES)
    const patterns = [
        // Pattern avec normes entre parenthèses: "NOM : VALEUR UNITE (MIN-MAX)" - format aligné avec beaucoup d'espaces
        /^([A-Za-zÀ-ÿ\s%°\-\/�]+?)\s*:\s+([*]?\d+[.,]?\d*[*]?)\s+([A-Za-z\/°%³µ²]+)\s+\(([^)]+)\)/,
        
        // Pattern avec valeur mise en évidence: "NOM : *VALEUR* UNITE (NORMES)"
        /^([A-Za-zÀ-ÿ\s%°\-\/�]+?)\s*:\s*\*([^*]+)\*\s*([A-Za-z\/°%³µ²]+)\s*\(([^)]*)\)/,
        
        // Pattern simple sans normes avec format aligné: "NOM : VALEUR UNITE -"
        /^([A-Za-zÀ-ÿ\s%°\-\/�]+?)\s*:\s+([*]?\d+[.,]?\d*[*]?)\s+([A-Za-z\/°%³µ²]+)\s+[-–]\s*$/,
        
        // Pattern basique: "NOM : VALEUR UNITE (NORMES)"
        /^([A-Za-zÀ-ÿ\s%°\-\/�]+?)\s*:\s*([*]?\d+[.,]?\d*[*]?)\s*([A-Za-z\/°%³µ²]+)\s*\(([^)]+)\)/
    ];
    
    for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
            const name = match[1].trim();
            const valueStr = match[2].trim();
            const unit = match[3].trim();
            const normStr = match[4] ? match[4].trim() : '';
            
            // Ne traiter que les lignes qui ressemblent vraiment à des résultats médicaux
            if (name.length < 3 || name.includes('Laboratoire') || name.includes('Date')) {
                continue;
            }
            
            const parsedValue = parseSpecialValue(valueStr);
            
            // Parser les normes si elles existent
            let min1 = null, max1 = null;
            if (normStr && normStr !== '-' && !normStr.includes('<') && !normStr.includes('>')) {
                // Formats possibles: "12,1-15,0", "150000-400000", "4,00-10,00"
                const normMatch = normStr.match(/([\d,\.]+)\s*[-–]\s*([\d,\.]+)/);
                if (normMatch) {
                    min1 = parseNorm(normMatch[1]);
                    max1 = parseNorm(normMatch[2]);
                } else if (normStr.includes(',')) {
                    // Format alternatif: "12,1,15,0" au lieu de "12,1-15,0"
                    const parts = normStr.split(',');
                    if (parts.length >= 2) {
                        const firstPart = parts[0] + ',' + parts[1];
                        const secondPart = parts.length > 3 ? parts[2] + ',' + parts[3] : parts[2];
                        min1 = parseNorm(firstPart);
                        max1 = parseNorm(secondPart);
                    }
                }
            }
            
            // Clean name: remove "- " at start and normalize spaces
            let cleanName = name.replace(/\s+/g, ' ').trim();
            cleanName = cleanName.replace(/^[-\s]+/, '').trim();
            
            return {
                name: cleanName,
                value1: parsedValue.value,
                unit1: unit,
                min1: min1,
                max1: max1,
                isHighlighted1: parsedValue.highlighted || valueStr.includes('*'),
                hasNorms: !!(min1 || max1),
                comments: []
            };
        }
    }
    
    return null;
}

// Fonction pour parser une ligne RES|
function parseRESLine(line) {
    const parts = line.split('|');
    if (parts.length < 8) return null;
    
    const name = parts[1] ? parts[1].trim() : '';
    const valueStr = parts[4] ? parts[4].trim() : '';
    const unit = parts[5] ? parts[5].trim() : '';
    const normStr = parts[6] ? parts[6].trim() : '';
    const maxStr = parts[7] ? parts[7].trim() : '';
    const status = parts[8] ? parts[8].trim() : '';
    const type = parts[3] ? parts[3].trim() : '';
    
    // Récupérer aussi les valeurs aux positions 10+ pour gérer les cas comme l'URÉE
    const value2Str = parts[10] ? parts[10].trim() : '';
    const unit2 = parts[11] ? parts[11].trim() : '';
    
    if ((type === 'N' || type === 'A') && valueStr && name) {
        // Détecter si valueStr est un commentaire long (pas une valeur numérique)
        const isCommentInValue = valueStr && valueStr.length > 50 && !valueStr.match(/^[\d.,<>≤≥=\-\+\s]+/);
        let actualValue = valueStr;
        let actualUnit = unit;
        let commentText = '';
        
        if (isCommentInValue && value2Str) {
            // valueStr est un commentaire, value2Str est la vraie valeur
            commentText = cleanEncoding(valueStr);
            actualValue = value2Str;
            actualUnit = unit2 || unit;
            Logger.debug('Commentaire détecté dans parseRESLine pour:', name, 'Commentaire:', commentText.substring(0, 50) + '...');
        }
        
        const parsedValue = parseSpecialValue(actualValue);
        const comments = commentText ? [commentText] : [];
        
        // Clean name: remove "- " at start and normalize spaces
        let cleanName = name.replace(/\s+/g, ' ').trim();
        cleanName = cleanName.replace(/^[-\s]+/, '').trim();
        
        return {
            name: cleanName,
            value1: parsedValue.value,
            unit1: actualUnit,
            min1: parseNorm(normStr),
            max1: parseNorm(maxStr),
            status: status,
            type: type,
            isHighlighted1: parsedValue.highlighted || status === 'H' || status === 'L',
            hasNorms: !!(normStr || maxStr),
            comments: comments
        };
    }
    
    return null;
}

// Fonction pour traiter les résultats bruts
function processRawResults(rawResults) {
    Logger.debug(`Processing ${rawResults.length} raw results...`);
    
    // Filtrer et nettoyer les résultats (accepter valeurs numériques ET textuelles)
    const processedResults = rawResults.filter(result => {
        return result && result.name && result.name.trim() !== '';
    }).map(result => {
        // Calculer si le résultat est anormal
        result.isAbnormal = false;
        if (result.hasNorms && result.value1 !== null) {
            const numValue = parseFloat(result.value1);
            if (!isNaN(numValue)) {
                if (result.min1 !== null && numValue < result.min1) {
                    result.isAbnormal = true;
                }
                if (result.max1 !== null && numValue > result.max1) {
                    result.isAbnormal = true;
                }
            }
        }
        
        return result;
    });
    
    Logger.debug(`Processed ${processedResults.length} valid results`);
    return processedResults;
}

// Parser pour format HPRIM en texte libre
function parseTextFormatHPRIM(content) {
    Logger.debug('Parsing format texte libre...');
    const lines = content.split('\n');
    const results = [];
    
    for (let i = 0; i < lines.length; i++) {
        const originalLine = lines[i];
        const line = originalLine.trim();
        
        // Chercher les lignes qui ressemblent à des résultats
        // Incluant celles qui commencent par des espaces (indentées)
        if ((originalLine.startsWith('          ') || originalLine.startsWith('        ')) && // Ligne indentée
            line.length > 10 && 
            !line.match(/^\d/) && // Ne commence pas par un chiffre
            !line.includes('Valeurs de référence') &&
            !line.includes('Technique') &&
            !line.includes('Les résultats') &&
            !line.includes('(ELISA') &&
            !line.includes('Selon les') &&
            line.includes('  ') && // Contient des espaces multiples (alignement)
            (line.includes('<') || line.includes('>') || line.match(/\d+[\.,]\d+/) || line.match(/\d+\s+\w+/))) {
            
            Logger.debug('Ligne candidate trouvée:', line);
            
            // Essayer d'extraire le nom et la valeur
            const parts = line.split(/\s{2,}/); // Split sur 2+ espaces
            Logger.debug('Parts:', parts);
            
            if (parts.length >= 2) {
                const name = parts[0].trim();
                let valueAndUnit = parts[1].trim();
                
                // Si il y a une 3ème partie, c'est probablement l'unité
                if (parts.length >= 3) {
                    const unit = parts[2].trim();
                    if (unit && unit.length < 10) { // Unité probable
                        valueAndUnit = valueAndUnit + ' ' + unit;
                    }
                }
                
                Logger.debug('Name:', name, 'ValueAndUnit:', valueAndUnit);
                
                // Extraire valeur et unité
                const valueMatch = valueAndUnit.match(/^([<>]?\s*[\d\.,]+|négatif|positif|absent)/i);
                const unitMatch = valueAndUnit.match(/([a-zA-Z\/°%µ]+[\w\/]*)\s*$/);
                
                if (name.length > 2) {
                    // Clean name: remove "- " at start and normalize spaces
                    let cleanName = name.replace(/\s+/g, ' ').trim();
                    cleanName = cleanName.replace(/^[-\s]+/, '').trim();
                    
                    // Ajouter " :" si pas déjà présent
                    const finalName = cleanName.endsWith(':') ? cleanName : cleanName + ' :';
                    
                    const result = {
                        name: finalName,
                        value1: valueMatch ? valueMatch[0].trim() : valueAndUnit.split(' ')[0],
                        unit1: unitMatch ? unitMatch[1] : (valueAndUnit.split(' ').length > 1 ? valueAndUnit.split(' ').slice(-1)[0] : ''),
                        operator1: '',
                        min1: '',
                        max1: '',
                        isAbnormal: false,
                        hasNorms: false,
                        hasMultipleUnits: false,
                        isHighlighted1: valueAndUnit.includes('<') || valueAndUnit.includes('>'),
                        comments: []
                    };
                    
                    Logger.debug('Résultat créé:', result);
                    results.push(result);
                }
            }
        }
    }
    
    Logger.debug('Résultats texte libre trouvés:', results.length);
    return results;
}

// Fonctions utilitaires pour parser les valeurs spéciales
function parseSpecialValue(valueStr) {
    if (!valueStr || valueStr === '') {
        return { value: null, highlighted: false, operator: null };
    }
    
    let cleanValue = valueStr.trim();
    let highlighted = false;
    let operator = null;
    
    // Gérer les astérisques (valeurs anormales mises en évidence)
    if (cleanValue.includes('*')) {
        highlighted = true;
        cleanValue = cleanValue.replace(/\*/g, '');
    }
    
    // Gérer les opérateurs de comparaison
    if (cleanValue.startsWith('<')) {
        operator = '<';
        cleanValue = cleanValue.substring(1);
    } else if (cleanValue.startsWith('>')) {
        operator = '>';
        cleanValue = cleanValue.substring(1);
    }
    
    // Essayer de convertir en nombre, sinon garder comme texte
    const numericValue = parseFloat(cleanValue.replace(',', '.'));
    
    return {
        value: isNaN(numericValue) ? cleanValue : numericValue,
        highlighted: highlighted,
        operator: operator
    };
}

function parseNorm(normStr) {
    if (!normStr || normStr === '') return null;
    const cleaned = normStr.replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
}

function formatValue(value, operator, highlighted) {
    if (value === null || value === undefined) return '';
    
    let formatted = (operator || '') + value;
    
    if (highlighted) {
        formatted = `<span style="font-weight: bold;">${formatted}</span>`;
    }
    
    return formatted;
}

function formatNorms(min, max, result) {
    // Normes spéciales pour le DFG
    if (result && result.name && result.name.toLowerCase().includes('dfg')) {
        return '(> 60)';
    }
    if (result && result.code && result.code.includes('1.6')) {
        return '(> 60)';
    }
    
    if (min !== null && max !== null) {
        return `(${min} - ${max})`;
    } else if (max !== null) {
        return `(< ${max})`;
    } else if (min !== null) {
        return `(> ${min})`;
    }
    return '';
}

// Fonctions d'extraction des informations patient
function extractPatientInfo(content) {
    const lines = content.split('\n');
    const info = {};
    
    // Extraction du nom patient (lignes 2-3)
    info.patientName = extractPatientName(lines);
    
    // Extraction des dates
    info.birthDate = extractBirthDate(lines);
    info.samplingDate = extractSamplingDate(lines);
    info.samplingTime = extractSamplingTime(lines);
    info.fileDate = extractFileDate(lines);
    
    // Extraction médecin et laboratoire
    info.doctorName = extractDoctorName(lines);
    info.laboratoryName = extractLaboratoryName(lines);
    
    // Calcul de l'âge
    if (info.birthDate && info.samplingDate) {
        info.age = calculateAge(info.birthDate, info.samplingDate);
    }
    
    // Validation croisée
    info.confidence = validateDates(info.birthDate, info.samplingDate, info.fileDate);
    
    return info;
}

function extractPatientName(lines) {
    // Format standard : lignes 2-3
    if (lines.length >= 3) {
        const nom = lines[1]?.trim();
        const prenom = lines[2]?.trim();
        
        // Validation : pas de code médecin/labo
        if (nom && prenom && 
            !nom.match(/^[A-Z]{5,6}\s+/) && 
            !nom.match(/^\d+\s+/) &&
            nom.match(/^[A-Z\s-]+$/)) {
            return `${nom} ${prenom}`;
        }
    }
    
    // Format alternatif : recherche par pattern
    for (let i = 0; i < Math.min(10, lines.length - 1); i++) {
        const line = lines[i]?.trim();
        const nextLine = lines[i + 1]?.trim();
        
        if (line && nextLine && 
            line.match(/^[A-Z]+$/) && 
            nextLine.match(/^[A-Z-]+$/)) {
            return `${line} ${nextLine}`;
        }
    }
    
    return null;
}

function extractBirthDate(lines) {
    // Priorité 1 : Ligne 7 (format standard)
    if (lines.length >= 7) {
        const dateCandidate = lines[6]?.trim();
        if (dateCandidate && dateCandidate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            const birthYear = parseInt(dateCandidate.split('/')[2]);
            // Validation : année de naissance réaliste (1920-2024)
            if (birthYear >= 1920 && birthYear <= 2024) {
                return parseDate(dateCandidate);
            }
        }
    }
    
    // Priorité 2 : Recherche "Date de Naissance" dans section HTML
    for (let i = 15; i < Math.min(25, lines.length); i++) {
        const line = lines[i] || '';
        if (line.includes('Date de Naissance')) {
            const match = line.match(/(\d{2}-\d{2}-\d{4})/);
            if (match) {
                return parseDate(match[1].replace(/-/g, '/'));
            }
        }
    }
    
    return null;
}

function extractSamplingDate(lines) {
    // Priorité 1 : Ligne 10 (format standard)
    if (lines.length >= 10) {
        const dateCandidate = lines[9]?.trim();
        if (dateCandidate && dateCandidate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            return parseDate(dateCandidate);
        }
    }
    
    // Priorité 2 : Recherche "Date demande" dans section HTML
    for (let i = 13; i < Math.min(25, lines.length); i++) {
        const line = lines[i] || '';
        if (line.includes('Date demande')) {
            const match = line.match(/(\d{2}-\d{2}-\d{4})/);
            if (match) {
                return parseDate(match[1].replace(/-/g, '/'));
            }
        }
    }
    
    // Priorité 3 : Date après numéro de dossier
    for (let i = 0; i < Math.min(15, lines.length - 1); i++) {
        const line = lines[i]?.trim();
        if (line && line.match(/^[AB]\d{9}/)) {
            const nextLine = lines[i + 1]?.trim();
            if (nextLine && nextLine.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                return parseDate(nextLine);
            }
        }
    }
    
    return null;
}

function extractSamplingTime(lines) {
    // Priorité 1 : Ligne 11 (format standard)
    if (lines.length >= 11) {
        const timeCandidate = lines[10]?.trim();
        if (timeCandidate && timeCandidate.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
            return timeCandidate;
        }
    }
    
    // Priorité 2 : Recherche dans les lignes suivant la date de prélèvement
    for (let i = 0; i < Math.min(20, lines.length); i++) {
        const line = lines[i]?.trim();
        if (line) {
            // Chercher format HH:MM ou HH:MM:SS
            const timeMatch = line.match(/\b(\d{2}:\d{2}(?::\d{2})?)\b/);
            if (timeMatch) {
                const time = timeMatch[1];
                const hours = parseInt(time.split(':')[0]);
                // Valider que c'est une heure réaliste (0-23h)
                if (hours >= 0 && hours <= 23) {
                    return time;
                }
            }
        }
    }
    
    // Priorité 3 : Recherche "Heure" dans section HTML
    for (let i = 13; i < Math.min(25, lines.length); i++) {
        const line = lines[i] || '';
        if (line.toLowerCase().includes('heure')) {
            const match = line.match(/(\d{2}:\d{2}(?::\d{2})?)/);
            if (match) {
                return match[1];
            }
        }
    }
    
    return null;
}

function extractFileDate(lines) {
    // Priorité 1 : "Validation le" (date de finalisation du dossier)
    for (let i = 20; i < Math.min(30, lines.length); i++) {
        const line = lines[i] || '';
        if (line.includes('Validation le')) {
            const match = line.match(/(\d{2}-\d{2}-\d{4})/);
            if (match) {
                return parseDate(match[1].replace(/-/g, '/'));
            }
        }
    }
    
    // Par défaut, utiliser la date de prélèvement
    return extractSamplingDate(lines);
}

function extractDoctorName(lines) {
    // Priorité 1 : Section HTML "Médecin :"
    for (let i = 13; i < Math.min(20, lines.length); i++) {
        const line = lines[i] || '';
        if (line.includes('M&eacute;decin :') || line.includes('Médecin :')) {
            // Nettoyer les balises HTML et entités
            const cleanLine = line.replace(/<[^>]+>/g, '').replace(/&eacute;/g, 'é').replace(/&nbsp;/g, ' ');
            Logger.debug('Ligne médecin trouvée:', cleanLine); // Debug
            
            // Pattern plus flexible pour capturer le nom complet
            const match = cleanLine.match(/M[éê]decin\s*:\s*(.+?)(?:\s*$|<)/);
            if (match) {
                const doctorName = match[1].trim();
                Logger.debug('Nom médecin extrait:', doctorName); // Debug
                return doctorName;
            }
        }
    }
    
    // Priorité 2 : Ligne 12 (code + nom)
    if (lines.length >= 12) {
        const line12 = lines[11]?.trim();
        if (line12) {
            // Pattern : CODE      nom.prenom
            const match = line12.match(/^[A-Z]{5,6}\s+([a-z\.-]+)/);
            if (match) {
                const nameParts = match[1].replace(/\./g, ' ').split(/\s+/);
                return nameParts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
            }
        }
    }
    
    // Priorité 3 : Recherche "Dr " ou "Docteur " dans les premières lignes
    for (let i = 0; i < Math.min(20, lines.length); i++) {
        const line = lines[i]?.trim();
        if (line) {
            // Patterns pour les médecins
            const doctorPatterns = [
                /Dr\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
                /Docteur\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
                /M[éê]decin\s*:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
            ];
            
            for (const pattern of doctorPatterns) {
                const match = line.match(pattern);
                if (match) {
                    return match[1].trim();
                }
            }
        }
    }
    
    // Priorité 4 : Recherche dans les lignes suivant les dates (souvent après prélèvement)
    for (let i = 8; i < Math.min(15, lines.length); i++) {
        const line = lines[i]?.trim();
        if (line && line.length > 3 && line.length < 50) {
            // Pattern pour nom de médecin seul (initiales ou nom complet)
            const nameMatch = line.match(/^([A-Z][a-z]*(?:\s+[A-Z][a-z]*)*|[A-Z](?:\s+[A-Z])*)$/);
            if (nameMatch && !line.match(/^\d/) && !line.includes(':')) {
                return nameMatch[1].trim();
            }
        }
    }
    
    return null;
}

function extractLaboratoryName(lines) {
    // Priorité 1 : Recherche dans les premières lignes (souvent ligne 1 ou dans l'en-tête)
    for (let i = 0; i < Math.min(15, lines.length); i++) {
        const line = lines[i]?.trim();
        if (line) {
            // Patterns communs pour les laboratoires
            const labPatterns = [
                /^(LABORATOIRE\s+DE\s+.+)$/i,
                /^(LABORATOIRE\s+.+)$/i,
                /^(LAB\s+.+)$/i,
                /^(CENTRE\s+DE\s+BIOLOGIE\s+.+)$/i,
                /^(BIOLAB\s+.+)$/i,
                /^(BIOLOGIE\s+MEDICALE\s+.+)$/i
            ];
            
            for (const pattern of labPatterns) {
                const match = line.match(pattern);
                if (match) {
                    return match[1].trim();
                }
            }
            
            // Détecter si une ligne contient "laboratoire" (case insensitive)
            if (line.toLowerCase().includes('laboratoire') && 
                line.length > 10 && line.length < 80 &&
                !line.includes('Date') && !line.includes('Résultat')) {
                return line.trim();
            }
        }
    }
    
    // Priorité 2 : Section HTML avec "Laboratoire"
    for (let i = 13; i < Math.min(25, lines.length); i++) {
        const line = lines[i] || '';
        if (line.toLowerCase().includes('laboratoire')) {
            // Nettoyer les balises HTML
            const cleanLine = line.replace(/<[^>]+>/g, '').replace(/&eacute;/g, 'é');
            const match = cleanLine.match(/Laboratoire\s*:?\s*([^<\n]+)/i);
            if (match) {
                return match[1].trim();
            }
        }
    }
    
    // Priorité 3 : Ligne qui contient des mots-clés de laboratoire
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i]?.trim();
        if (line && line.length > 5 && line.length < 100) {
            const keywords = ['BIOLOGIE', 'MEDICAL', 'ANALYSE', 'DIAGNOSTIC', 'CLINIQUE', 'SANTE'];
            const hasKeyword = keywords.some(keyword => line.toUpperCase().includes(keyword));
            
            if (hasKeyword && !line.includes('Date') && !line.includes('Patient')) {
                return line.trim();
            }
        }
    }
    
    return null;
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return null;
}

function calculateAge(birthDate, referenceDate) {
    if (!birthDate || !referenceDate) return null;
    const diffTime = referenceDate - birthDate;
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    return Math.floor(diffYears);
}

function validateDates(birthDate, samplingDate, fileDate) {
    let confidence = 1.0;
    
    if (birthDate && samplingDate) {
        const age = calculateAge(birthDate, samplingDate);
        if (age < 0 || age > 120) {
            confidence *= 0.3; // Très faible confiance si âge irréaliste
        }
    }
    
    if (samplingDate && fileDate) {
        if (fileDate < samplingDate) {
            confidence *= 0.5; // Confiance réduite si date de dossier antérieure
        }
    }
    
    return confidence;
}

// ============================================================================
// HELPERS UI — icônes, barre de position, bandeau de synthèse
// ============================================================================

const ICONS = {
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    stethoscope: '<path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>',
    flask: '<path d="M9 3h6"/><path d="M10 3v6.5L4.5 18A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3L14 9.5V3"/><path d="M7.5 14h9"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    alert: '<path d="m10.3 3.6-8 14A2 2 0 0 0 4 20.5h16a2 2 0 0 0 1.7-2.9l-8-14a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'
};

function svgIcon(name) {
    const path = ICONS[name];
    if (!path) return '';
    return `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
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
    const unitLabel = unit1 ? ` ${unit1}` : '';

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

// État d'un résultat : 'high' / 'low' (anormal, avec direction) / 'normal' / '' (non mesurable).
// Couvre le statut explicite H/L du fichier ET la comparaison numérique (format tags/texte).
function getResultState(result) {
    if (result.status === 'H') return 'high';
    if (result.status === 'L') return 'low';

    const v = parseFloat(String(result.value1).replace(',', '.'));
    const lo = parseFloat(result.min1);
    const hi = parseFloat(result.max1);

    if (result.isAbnormal) {
        if (isFinite(v) && isFinite(hi) && v > hi) return 'high';
        if (isFinite(v) && isFinite(lo) && v < lo) return 'low';
        return 'high';
    }

    if (isFinite(v) && (isFinite(lo) || isFinite(hi))) return 'normal';
    return '';
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
        metaItems.push(`<span>${svgIcon('stethoscope')}${prescripteurDisplay}</span>`);
    }
    if (patientInfo.laboratoryName) {
        const labDisplay = patientInfo.laboratoryName.toLowerCase().includes('laboratoire')
            ? patientInfo.laboratoryName
            : `${window.i18n ? window.i18n.t('patient.laboratory') : 'Laboratoire'} : ${patientInfo.laboratoryName}`;
        metaItems.push(`<span>${svgIcon('flask')}${labDisplay}</span>`);
    }
    if (patientInfo.samplingDate) {
        const samplingText = window.i18n ? window.i18n.t('patient.sampling') : 'Prélèvement';
        let samplingLine = `${samplingText} ${formatDate(patientInfo.samplingDate)}`;
        if (patientInfo.samplingTime) {
            const atText = window.i18n ? window.i18n.t('patient.sampling_at') : 'à';
            samplingLine += ` ${atText} ${patientInfo.samplingTime}`;
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
            <div class="patient-avatar" aria-hidden="true">${initials}</div>
            <div class="patient-info">
                <div class="patient-identity">
                    ${name ? `<span class="patient-name">${name}</span>` : ''}
                    ${subLine ? `<span class="patient-sub">${subLine}</span>` : ''}
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

function showPrintExportMenu() {
    const menu = document.getElementById('printExportMenu');
    const button = document.getElementById('printExportBtn');
    
    if (menu && button) {
        // Positionner le menu par rapport au bouton
        const buttonRect = button.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = (buttonRect.bottom + window.scrollY + 5) + 'px';
        menu.style.left = buttonRect.left + 'px';
        
        // Afficher le menu
        menu.classList.add('show');
        
        // Fermer le menu en cliquant ailleurs
        document.addEventListener('click', handleOutsideClick);
    }
}

function hidePrintExportMenu() {
    const menu = document.getElementById('printExportMenu');
    if (menu) {
        menu.classList.remove('show');
        document.removeEventListener('click', handleOutsideClick);
    }
}

function handleOutsideClick(event) {
    const menu = document.getElementById('printExportMenu');
    const button = document.getElementById('printExportBtn');
    
    if (menu && button && 
        !menu.contains(event.target) && 
        !button.contains(event.target)) {
        hidePrintExportMenu();
    }
}

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
        
        const result = await ipcRenderer.invoke('export-excel', resultsData, patientName);
        
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

function updateResultsMessages() {
    // Plus de messages d'instructions
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

function showRawInMainWindow() {
    const title = window.i18n ? window.i18n.t('buttons.view_raw') : 'Voir fichier brut';
    
    const rawContent = `
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #ddd;">
                <div>
                    <h3 style="margin: 0; color: #2c5aa0;">📄 ${title}</h3>
                    <div style="color: #666; font-size: 14px; margin-top: 5px;">
                        ${window.i18n ? window.i18n.t('file.size') : 'Taille'}: ${currentFileContent.length} ${window.i18n ? window.i18n.t('file.characters') : 'caractères'} | 
                        ${window.i18n ? window.i18n.t('file.lines') : 'Lignes'}: ${currentFileContent.split('\n').length}
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn" onclick="window.print()" style="background: #28a745;">
                        🖨️ ${window.i18n ? window.i18n.t('buttons.print') : 'Imprimer'}
                    </button>
                    <button class="btn" onclick="hideRawFile()" style="background: #dc3545;">
                        ✕ ${window.i18n ? window.i18n.t('buttons.close') : 'Fermer'}
                    </button>
                </div>
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap; overflow-wrap: break-word; font-family: 'Courier New', monospace; font-size: 12px; max-height: 60vh; overflow-y: auto; line-height: 1.4;">
${currentFileContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            </div>
        </div>
    `;
    
    // Ajouter à la page principale
    const results = document.getElementById('results');
    results.innerHTML += rawContent;
}

function hideRawFile() {
    // Supprimer le contenu brut
    const rawDiv = document.querySelector('div[style*="📄"]')?.parentElement;
    if (rawDiv) {
        rawDiv.remove();
    }
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
        
        rawWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title} - HPRIM Tool</title>
                <style>
                    body { 
                        font-family: 'Courier New', monospace; 
                        background: #f5f5f5; 
                        margin: 20px; 
                        line-height: 1.4;
                    }
                    .header {
                        background: white;
                        padding: 15px;
                        border-radius: 8px;
                        margin-bottom: 20px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .content {
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        white-space: pre-wrap;
                        overflow-wrap: break-word;
                        font-size: 12px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        max-height: 70vh;
                        overflow-y: auto;
                    }
                    .stats {
                        color: #666;
                        font-size: 14px;
                        margin-bottom: 10px;
                    }
                    .close-btn {
                        background: #dc3545;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 14px;
                    }
                    .close-btn:hover {
                        background: #c82333;
                    }
                    .print-btn {
                        background: #28a745;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 14px;
                        position: relative;
                    }
                    .print-btn:hover {
                        background: #218838;
                    }
                    .print-menu {
                        position: absolute;
                        top: 100%;
                        left: 0;
                        background: white;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        z-index: 1000;
                        min-width: 140px;
                        display: none;
                    }
                    .print-menu.show {
                        display: block;
                    }
                    .print-menu button {
                        display: block;
                        width: 100%;
                        padding: 12px 16px;
                        border: none;
                        background: white;
                        text-align: left;
                        cursor: pointer;
                        transition: background 0.2s;
                        border-radius: 0;
                        font-size: 14px;
                        color: #333;
                    }
                    .print-menu button:first-child {
                        border-radius: 6px 6px 0 0;
                    }
                    .print-menu button:last-child {
                        border-radius: 0 0 6px 6px;
                    }
                    .print-menu button:hover {
                        background: #f8f9fa;
                    }
                    kbd {
                        background: #f1f1f1;
                        border: 1px solid #ccc;
                        border-radius: 3px;
                        padding: 2px 6px;
                        font-family: monospace;
                        font-size: 11px;
                        box-shadow: 0 1px 0 rgba(0,0,0,0.2);
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>📄 ${title}</h2>
                    <div class="stats">
                        Taille: ${currentFileContent.length} caractères | 
                        Lignes: ${currentFileContent.split('\\n').length}
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="print-btn" onclick="printRawFile()">🖨️ Imprimer</button>
                        <button class="close-btn" onclick="window.close()">Fermer</button>
                    </div>
                </div>
                <div class="content" id="rawContent">${currentFileContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                
                <script>
                    function printRawFile() {
                        window.print();
                    }
                </script>
                
                <style>
                    @media print {
                        .header {
                            display: none !important;
                        }
                        
                        body {
                            margin: 0;
                            padding: 10px;
                            background: white;
                            font-family: 'Courier New', monospace;
                            font-size: 9pt;
                            line-height: 1.2;
                        }
                        
                        .content {
                            background: white;
                            padding: 0;
                            margin: 0;
                            box-shadow: none;
                            border-radius: 0;
                            font-size: 8pt;
                            max-height: none;
                            overflow: visible;
                            white-space: pre-wrap;
                            word-wrap: break-word;
                        }
                    }
                </style>
            </body>
            </html>
        `);
        rawWindow.document.close();
    } else {
        // Fallback si popup bloquée : afficher dans un alert (pas idéal mais fonctionnel)
        alert('Impossible d\'ouvrir une nouvelle fenêtre. Contenu du fichier :\\n\\n' + 
              currentFileContent.substring(0, 1000) + (currentFileContent.length > 1000 ? '...' : ''));
    }
}