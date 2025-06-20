const { ipcRenderer } = require('electron');

// Variables globales
const dropZone = document.getElementById('dropZone');
const results = document.getElementById('results');

// Écouter les événements d'ouverture de fichier
ipcRenderer.on('file-to-open', (event, filePath) => {
    console.log('Fichier reçu:', filePath);
    handleFile(filePath);
});

ipcRenderer.on('file-selected', (event, filePath) => {
    console.log('Fichier sélectionné:', filePath);
    handleFile(filePath);
});

// Fonction pour traiter un fichier
async function handleFile(filePath) {
    console.log('handleFile appelé avec:', filePath);
    
    if (!filePath) {
        console.error('Aucun chemin de fichier fourni');
        results.innerHTML = '<p style="color: red;">Aucun fichier spécifié</p>';
        return;
    }
    
    try {
        console.log('Tentative de lecture du fichier:', filePath);
        
        // Afficher le message de chargement
        results.innerHTML = `<p style="color: blue;">Chargement du fichier: ${filePath}</p>`;
        
        // Lire le fichier avec Electron
        const content = await ipcRenderer.invoke('read-file', filePath);
        console.log('Contenu lu, longueur:', content.length);
        
        console.log('Début du parsing et affichage...');
        parseAndDisplay(content);
        console.log('Fichier traité avec succès');
        
    } catch (error) {
        console.error('Erreur détaillée lors de la lecture du fichier:', error);
        
        let errorMsg = 'Erreur lors de la lecture du fichier';
        if (error.message) {
            errorMsg += ': ' + error.message;
        }
        
        results.innerHTML = `<p style="color: red;">${errorMsg}</p>
                            <p style="color: #666; font-size: 0.9em;">Fichier: ${filePath}</p>`;
    }
}

// Initialiser l'application après le chargement
window.addEventListener('load', () => {
    // Afficher le message d'accueil
    results.innerHTML = '<p style="color: #666;">Utilisez Cmd+O pour ouvrir un fichier ou glissez-déposez un fichier .hpr dans cette fenêtre.</p>';
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

// Clic sur la zone de drop pour ouvrir un fichier
dropZone.addEventListener('click', () => {
    // Envoyer un message au processus principal pour ouvrir la boîte de dialogue
    ipcRenderer.send('open-file-dialog');
});

// ============================================================================
// FONCTIONS POUR LES BOUTONS DE L'INTERFACE
// ============================================================================

// Fonction pour ouvrir un fichier (bouton "Ouvrir")
function openFile() {
    ipcRenderer.send('open-file-dialog');
}

// Fonction pour quitter l'application (bouton "Quitter")
function quitApp() {
    ipcRenderer.send('quit-app');
}

// ============================================================================
// COPIE EXACTE DU CODE DE PARSING DEPUIS LE FICHIER ORIGINAL
// ============================================================================

function parseAndDisplay(content) {
    console.log('parseAndDisplay called with content length:', content.length);
    
    // Cacher la zone de drag & drop une fois qu'un fichier est ouvert
    dropZone.style.display = 'none';
    
    // Extraire les informations patient
    const patientInfo = extractPatientInfo(content);
    console.log('Patient info:', patientInfo);
    
    const parsed = parseHPRIM(content);
    console.log('Parsed results:', parsed);
    
    let html = '';
    
    // Ajouter l'en-tête patient si disponible
    if (patientInfo.patientName || patientInfo.samplingDate) {
        html += generatePatientHeader(patientInfo);
    }
    
    for (const result of parsed) {
        
        // Couleur de bordure seulement si il y a des normes
        let abnormalClass = '';
        if (result.hasNorms) {
            abnormalClass = result.isAbnormal ? 'style="border-left-color: #ff5722;"' : 'style="border-left-color: #4caf50;"';
        }
        
        // Construire l'affichage avec colonnes alignées
        const formattedValue1 = formatValue(result.value1, result.operator1 || null, result.isHighlighted1 || false);
        const formattedNormes1 = formatNorms(result.min1, result.max1, result);
        
        let valuesColumn = `<div class="value-line">
            <span class="result-number">${formattedValue1}</span>
            <span class="result-unit">${result.unit1}</span>
        </div>`;
        
        let normsColumn = `<div class="result-norms">${formattedNormes1}</div>`;
        
        if (result.hasMultipleUnits) {
            const formattedValue2 = formatValue(result.value2, result.operator2 || null, result.isHighlighted2 || false);
            const formattedNormes2 = formatNorms(result.min2, result.max2, result);
            
            valuesColumn += `<div class="value-line">
                <span class="result-number">${formattedValue2}</span>
                <span class="result-unit">${result.unit2}</span>
            </div>`;
            
            normsColumn += `<div class="result-norms">${formattedNormes2}</div>`;
        }
        
        // Commentaires associés
        let commentsHtml = '';
        if (result.comments && result.comments.length > 0) {
            // Regrouper tous les commentaires en un seul bloc pour éviter les interlignes
            const allComments = result.comments
                .filter(comment => comment.trim())
                .join(' ');
            
            if (allComments) {
                commentsHtml += `<div style="grid-column: 1 / -1; margin-top: 8px; padding: 4px 8px; background: #f8f9fa; border-radius: 3px; font-size: 0.7em; color: #666; line-height: 1.1; font-family: Arial, Helvetica, sans-serif; font-style: italic; font-weight: 300;">
                    ${allComments}
                </div>`;
            }
        }
        
        html += `
            <div class="result-item" ${abnormalClass}>
                <div class="result-name">${result.name}</div>
                <div class="result-value-container">${valuesColumn}</div>
                <div>${normsColumn}</div>
                ${commentsHtml}
            </div>
        `;
    }
    
    results.innerHTML = html || '<p>Aucun résultat trouvé</p>';
}

function parseHPRIM(content) {
    const rawResults = [];
    const lines = content.split('\n');
    
    console.log('Parsing HPRIM avec regroupement multi-unités...');
    
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
    console.log('Looking for RES lines...');
    const resLines = lines.filter(line => line.includes('RES|'));
    console.log(`Found ${resLines.length} lines containing RES|`);
    if (resLines.length > 0) {
        console.log('First RES line:', JSON.stringify(resLines[0]));
        console.log('Starts with RES|?', resLines[0].startsWith('RES|'));
    }
    
    // Vérifier s'il y a des lignes RES| dans le fichier
    const hasResLines = lines.some(line => line.startsWith('RES|'));
    
    if (!hasResLines) {
        // Format texte libre - parser différemment
        return parseTextFormatHPRIM(content);
    }
    
    // Maintenant parser normalement (format structuré)
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.startsWith('RES|')) {
            const parts = line.split('|');
            console.log('Ligne RES trouvée, parts.length:', parts.length, 'Line:', line);
            if (parts.length >= 8) {
                const name = parts[1] ? parts[1].trim() : '';
                const code = parts[2] ? parts[2].trim() : '';
                const type = parts[3] ? parts[3].trim() : '';
                const valueStr = parts[4] ? parts[4].trim() : '';
                console.log('RES ligne trouvée:', line);
                console.log('Name:', name, 'ValueStr:', valueStr);
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
                
                if ((type === 'N' || type === 'A') && valueStr && name) {
                    console.log('Result added:', name, 'Type:', type, 'Value:', valueStr);
                    const cleanName = name.replace(/\s+/g, ' ').trim();
                    
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
                        
                        console.log('Fusionné "soit" avec:', lastResult.name);
                        continue; // Passer au suivant sans créer un nouveau résultat
                    }
                    const cleanUnit = unit;
                    const cleanUnit2 = unit2 || '';
                    
                    // Corriger l'encodage dans la valeur
                    const cleanValueStr = valueStr
                        .replace(/È/g, 'é')
                        .replace(/Ë/g, 'è')
                        .replace(/Ì/g, 'à')
                        .replace(/Á/g, 'à')
                        .replace(/Ç/g, 'ç');
                    
                    // Parser les valeurs avec symboles spéciaux
                    const parsedValue1 = parseSpecialValue(cleanValueStr);
                    const parsedValue2 = value2Str ? parseSpecialValue(value2Str) : null;
                    
                    // Associer les commentaires DFG si c'est le DFG
                    let associatedComments = [];
                    if (cleanName.toLowerCase().includes('dfg') || cleanName.toLowerCase().includes('ckd-epi') || code.includes('1.6')) {
                        associatedComments = [...dfgComments];
                    }
                    
                    // Chercher les lignes TEX qui suivent ce RES pour les commentaires complets
                    if (cleanName.toLowerCase().includes('commentaire') || cleanName.toLowerCase().includes('conclusion')) {
                        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
                            const nextLine = lines[j];
                            if (nextLine.startsWith('TEX|')) {
                                const texContent = nextLine.substring(4).trim();
                                if (texContent && texContent.length > 3) {
                                    // Corriger l'encodage des caractères
                                    const cleanTexContent = texContent
                                        .replace(/È/g, 'é')
                                        .replace(/Ë/g, 'è')
                                        .replace(/Ì/g, 'à')
                                        .replace(/Á/g, 'à')
                                        .replace(/Ç/g, 'ç');
                                    associatedComments.push(cleanTexContent);
                                }
                            } else if (nextLine.startsWith('RES|')) {
                                break; // Arrêter au prochain RES
                            }
                        }
                    }
                    
                    // Ajouter " :" si pas déjà présent
                    const finalName = cleanName.endsWith(':') ? cleanName : cleanName + ' :';
                    
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
                }
            }
        }
    }
    
    // Deuxième passe : créer les résultats groupés
    const groupedResults = [];
    
    for (const result of rawResults) {
        
        // Déterminer si anormal et s'il y a des normes
        let isAbnormal = false;
        let hasNorms = false;
        
        console.log(`Analyse ${result.name}:`, {
            value1: result.value1,
            min1: result.min1,
            max1: result.max1,
            value2: result.value2,
            min2: result.min2,
            max2: result.max2,
            status: result.status
        });
        
        if (result.status === 'H' || result.status === 'L') {
            isAbnormal = true;
            hasNorms = true;
        } else if ((result.min1 !== null && result.min1 !== 0) || (result.max1 !== null && result.max1 !== 0 && result.max1 < 9999)) {
            // Seulement considérer comme ayant des normes si les valeurs sont réellement définies
            hasNorms = true;
            if (result.min1 !== null && result.max1 !== null) {
                if (result.max1 < 9999) {
                    isAbnormal = result.value1 < result.min1 || result.value1 > result.max1;
                } else {
                    isAbnormal = result.value1 < result.min1;
                }
            } else if (result.max1 !== null && result.max1 < 9999) {
                isAbnormal = result.value1 > result.max1;
            } else if (result.min1 !== null && result.min1 > 0) {
                isAbnormal = result.value1 < result.min1;
            }
        } else if (result.name.toLowerCase().includes('dfg') || result.code.includes('1.6')) {
            // Logique spécifique pour le DFG (ml/min/1,73m²)
            hasNorms = true;
            if (result.value1 < 60) {
                isAbnormal = true; // <60 = insuffisance rénale
            }
        }
        
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
            operator2: result.operator2
        });
    }
    
    console.log(`${rawResults.length} résultats bruts trouvés`);
    console.log(`${groupedResults.length} résultats HPRIM groupés trouvés`);
    console.log('Grouped results:', groupedResults);
    return groupedResults;
}

// Parser pour format HPRIM en texte libre
function parseTextFormatHPRIM(content) {
    console.log('Parsing format texte libre...');
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
            
            console.log('Ligne candidate trouvée:', line);
            
            // Essayer d'extraire le nom et la valeur
            const parts = line.split(/\s{2,}/); // Split sur 2+ espaces
            console.log('Parts:', parts);
            
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
                
                console.log('Name:', name, 'ValueAndUnit:', valueAndUnit);
                
                // Extraire valeur et unité
                const valueMatch = valueAndUnit.match(/^([<>]?\s*[\d\.,]+|négatif|positif|absent)/i);
                const unitMatch = valueAndUnit.match(/([a-zA-Z\/°%µ]+[\w\/]*)\s*$/);
                
                if (name.length > 2) {
                    // Ajouter " :" si pas déjà présent
                    const finalName = name.endsWith(':') ? name : name + ' :';
                    
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
                    
                    console.log('Résultat créé:', result);
                    results.push(result);
                }
            }
        }
    }
    
    console.log('Résultats texte libre trouvés:', results.length);
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
    
    // Convertir en nombre
    const numericValue = parseFloat(cleanValue.replace(',', '.'));
    
    return {
        value: isNaN(numericValue) ? null : numericValue,
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
    if (value === null) return '';
    
    let formatted = (operator || '') + value;
    
    if (highlighted) {
        formatted = `<strong style="color: #ff5722;">${formatted}</strong>`;
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
    info.fileDate = extractFileDate(lines);
    
    // Extraction médecin
    info.doctorName = extractDoctorName(lines);
    
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
            // Nettoyer les balises HTML
            const cleanLine = line.replace(/<[^>]+>/g, '').replace(/&eacute;/g, 'é');
            const match = cleanLine.match(/M[éê]decin\s*:\s*([A-Z\s-]+)/);
            if (match) {
                return match[1].trim();
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

function generatePatientHeader(patientInfo) {
    let headerHtml = `<div style="background: #e3f2fd; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #1976d2;">`;
    
    // Première ligne : Nom + âge + date de naissance
    let firstLine = '';
    if (patientInfo.patientName) {
        firstLine += `<strong style="color: #1976d2; font-size: 1.1rem;">${patientInfo.patientName}</strong>`;
    }
    
    if (patientInfo.age !== null && patientInfo.age !== undefined) {
        if (firstLine) firstLine += '   ';
        firstLine += `<strong style="font-size: 1.1rem;">${patientInfo.age} ans</strong>`;
    }
    
    if (patientInfo.birthDate) {
        const birthDateStr = formatDate(patientInfo.birthDate);
        if (firstLine) firstLine += '   ';
        firstLine += `<span style="font-size: 1.1rem;">Né(e) le ${birthDateStr}</span>`;
    }
    
    if (firstLine) {
        headerHtml += `<div style="margin-bottom: 8px;">${firstLine}</div>`;
    }
    
    // Deuxième ligne : Prélèvement + médecin
    let secondLine = '';
    if (patientInfo.samplingDate) {
        const dateStr = formatDate(patientInfo.samplingDate);
        secondLine += `Prélèvement : ${dateStr}`;
    }
    
    if (patientInfo.doctorName) {
        if (secondLine) secondLine += ' • ';
        secondLine += `Dr ${patientInfo.doctorName}`;
    }
    
    if (secondLine) {
        headerHtml += `<div style="color: #666; font-size: 0.9rem;">${secondLine}</div>`;
    }
    
    if (patientInfo.confidence < 0.8) {
        headerHtml += `<div style="color: #ff9800; font-size: 0.8rem; margin-top: 5px;">⚠️ Informations extraites avec confiance réduite</div>`;
    }
    
    headerHtml += `</div>`;
    return headerHtml;
}

function formatDate(date) {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}