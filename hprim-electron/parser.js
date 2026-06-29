// ============================================================================
// parser.js — Coeur PUR de HPRIM Tool (parsing, normes, valeurs, encodage,
// extraction patient, dates, detection d'anomalie). Aucune dependance au DOM.
// Charge via <script src="parser.js"> avant renderer.js (fonctions globales),
// et requireable en Node pour les tests (voir module.exports en fin de fichier).
// ============================================================================

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

// Échappe les caractères HTML — à appliquer à TOUTE donnée issue du fichier avant
// insertion via innerHTML (le contenu d'un fichier HPRIM n'est pas de confiance).
function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Décode un fichier (Buffer/Uint8Array) en texte, en détectant l'encodage :
// UTF-8 strict d'abord, repli windows-1252 (fréquent pour les HPRIM français),
// puis latin1 en dernier recours. Gère le BOM UTF-8. Corrige le mojibake dû à
// une lecture forcée en latin1.
function decodeBuffer(bytes) {
    if (bytes === null || bytes === undefined) return '';
    const u8 = (bytes instanceof Uint8Array) ? bytes : Uint8Array.from(bytes);
    // Retirer un éventuel BOM UTF-8
    const body = (u8.length >= 3 && u8[0] === 0xEF && u8[1] === 0xBB && u8[2] === 0xBF)
        ? u8.subarray(3) : u8;
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(body);
    } catch (e) {
        try {
            return new TextDecoder('windows-1252').decode(body);
        } catch (e2) {
            let s = '';
            for (let i = 0; i < body.length; i++) s += String.fromCharCode(body[i]);
            return s;
        }
    }
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
                
                // Normes : intervalle combiné "min-max" (tolérant aux négatifs) ou bornes séparées.
                const range1 = parseNormRange(normStr, maxStr);
                const minStr = range1.minStr;
                maxStr = range1.maxStr;
                const status = parts[8] ? parts[8].trim() : '';
                
                const value2Str = parts[10] ? parts[10].trim() : '';
                const unit2 = parts[11] ? parts[11].trim() : '';
                const norm2Str = parts[12] ? parts[12].trim() : '';
                let max2Str = parts[13] ? parts[13].trim() : '';
                
                // Normes 2 (même helper partagé)
                const range2 = parseNormRange(norm2Str, max2Str);
                const min2Str = range2.minStr;
                max2Str = range2.maxStr;
                
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
        
        // Normes présentes dès qu'une borne existe ; anomalie = statut explicite H/L
        // OU comparaison numérique aux bornes (détection UNIFIÉE, cf. computeAbnormal).
        const hasNorms = (result.min1 !== null && result.min1 !== undefined)
            || (result.max1 !== null && result.max1 !== undefined);
        const isAbnormal = computeAbnormal(result).isAbnormal;

        Logger.debug(`Analyse ${result.name}:`, {
            value1: result.value1, min1: result.min1, max1: result.max1,
            status: result.status, hasNorms, isAbnormal
        });

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
    const maxStrRaw = parts[7] ? parts[7].trim() : '';
    // Normes : même helper partagé que le parser pipes (intervalle combiné "min-max"
    // tolérant aux négatifs, ou bornes séparées) — corrige le faux négatif format tags.
    const { minStr, maxStr } = parseNormRange(normStr, maxStrRaw);
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
            min1: parseNorm(minStr),
            max1: parseNorm(maxStr),
            status: status,
            type: type,
            isHighlighted1: parsedValue.highlighted || status === 'H' || status === 'L',
            hasNorms: !!(minStr || maxStr),
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
        // Détection d'anomalie UNIFIÉE (statut explicite H/L OU comparaison aux bornes)
        result.isAbnormal = computeAbnormal(result).isAbnormal;
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
    
    // Gérer les opérateurs de comparaison : < > ≤ ≥ =, et leurs variantes ASCII
    // <= >= (normalisées en ≤ ≥). Les valeurs censurées restent ainsi numériques.
    const opMatch = cleanValue.match(/^(<=|>=|[<>≤≥=])/);
    if (opMatch) {
        let op = opMatch[1];
        if (op === '<=') op = '≤';
        else if (op === '>=') op = '≥';
        operator = op;
        cleanValue = cleanValue.substring(opMatch[1].length);
    }
    
    // Essayer de convertir en nombre, sinon garder comme texte
    const numericValue = parseFloat(cleanValue.replace(',', '.'));
    
    return {
        value: isNaN(numericValue) ? cleanValue : numericValue,
        highlighted: highlighted,
        operator: operator
    };
}

// Découpe une norme combinée "min-max" (tolérante aux bornes négatives, ex. "-2 - 2")
// en { minStr, maxStr }. Si normStr n'est pas un intervalle, minStr = normStr.
// Un maxStr déjà fourni (champ séparé du fichier) est prioritaire et n'est pas écrasé.
// Helper PARTAGÉ par tous les parsers pour garantir l'équivalence des formats.
function parseNormRange(normStr, maxStr) {
    normStr = normStr || '';
    maxStr = maxStr || '';
    const m = normStr.match(/^\s*(-?[\d.,]+)\s*[-–]\s*(-?[\d.,]+)\s*$/);
    if (m) {
        return { minStr: m[1].trim(), maxStr: maxStr || m[2].trim() };
    }
    return { minStr: normStr, maxStr: maxStr };
}

function parseNorm(normStr) {
    if (!normStr || normStr === '') return null;
    const cleaned = normStr.replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
}

function formatValue(value, operator, highlighted) {
    if (value === null || value === undefined) return '';

    // value peut être du texte libre issu du fichier -> échappement obligatoire
    // (l'opérateur < / > est échappé aussi pour ne pas être pris pour une balise).
    let formatted = escapeHtml((operator || '') + value);

    if (highlighted) {
        formatted = `<span style="font-weight: bold;">${formatted}</span>`;
    }

    return formatted;
}

function formatNorms(min, max, result) {
    // Les normes réellement présentes dans le fichier priment toujours.
    // Intervalle min-max : min et max dans des spans dédiés pour pouvoir les aligner
    // autour du tiret (min à droite, tiret, max à gauche). min/max sont numériques.
    if (min !== null && max !== null) {
        return `<span class="norm-min">${min}</span><span class="norm-sep"> – </span><span class="norm-max">${max}</span>`;
    }
    if (max !== null) {
        return `&lt; ${max}`;
    }
    if (min !== null) {
        return `&gt; ${min}`;
    }
    // Aucune norme dans le fichier : pour le DFG (estimé), repli sur le seuil
    // de référence usuel "> 60 mL/min". N'écrase JAMAIS une borne fournie par le labo.
    const isDFG = (result && result.name && result.name.toLowerCase().includes('dfg'))
        || (result && result.code && result.code.includes('1.6'));
    if (isDFG) {
        return '&gt; 60';
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
    
    // Extraction médecin, laboratoire et téléphone
    info.doctorName = extractDoctorName(lines);
    info.laboratoryName = extractLaboratoryName(lines);
    info.phone = extractPhone(lines);
    
    // Calcul de l'âge
    if (info.birthDate && info.samplingDate) {
        info.age = calculateAge(info.birthDate, info.samplingDate);
    }
    
    // Validation croisée (cohérence des dates)
    info.confidence = validateDates(info.birthDate, info.samplingDate, info.fileDate);

    // Identitovigilance : une donnée d'identité ABSENTE doit faire chuter la confiance
    // (validateDates ne juge que la cohérence, pas la présence). Distingue
    // "donnée absente" de "donnée validée".
    if (!info.patientName) info.confidence *= 0.4;
    if (!info.birthDate) info.confidence *= 0.6;
    if (!info.samplingDate) info.confidence *= 0.8;

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
            // Validation : année de naissance réaliste (de 1900 à l'année courante).
            // Plafond dynamique -> ne rejette plus les naissances après 2024.
            const currentYear = new Date().getFullYear();
            if (birthYear >= 1900 && birthYear <= currentYear) {
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

// Téléphone du laboratoire : "Tel:..." / "Tél : ..." dans l'en-tête.
function extractPhone(lines) {
    for (let i = 0; i < Math.min(25, lines.length); i++) {
        const line = lines[i] || '';
        const m = line.match(/T[ée]l\.?\s*:?\s*(0\d[\d .]{7,}\d)/i);
        if (m) return m[1].replace(/\s+/g, ' ').trim();
    }
    return null;
}

function extractDoctorName(lines) {
    // Priorité 0 : "Médecin <nom>" (avec ou sans ':') ou "Dr/DR <nom>" dans l'en-tête,
    // y compris noms tout en majuscules (formats SOLABIO/Cerballiance réels).
    for (let i = 0; i < Math.min(25, lines.length); i++) {
        const line = (lines[i] || '').replace(/<[^>]+>/g, '').trim();
        let m = line.match(/M[éèêÉ]?decin\s*:?\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’.\- ]{2,40})$/);
        if (!m) m = line.match(/\b(?:Dr|DR|Docteur|Pr)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’.\- ]{2,40})$/);
        if (m) {
            const name = m[1].replace(/\s+/g, ' ').trim();
            if (name && !/^\d/.test(name) && !/expediteur/i.test(name)) return name;
        }
    }

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
    // Priorité 0a : ligne "Expediteur <labo>   Tel:..." (formats SOLABIO/BIOLBS)
    for (let i = 0; i < Math.min(25, lines.length); i++) {
        const line = (lines[i] || '').trim();
        const m = line.match(/Exp[ée]diteur\s+(.+)/i);
        if (m) {
            return m[1].replace(/\s{2,}T[ée]l.*$/i, '').replace(/\s+/g, ' ').trim();
        }
    }
    // Priorité 0b : ligne "<code numérique>   <NOM DU LABO>" (format Cerballiance)
    for (let i = 0; i < Math.min(15, lines.length); i++) {
        const line = (lines[i] || '').trim();
        const m = line.match(/^\d{8,}\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9'’.\- ]{8,})$/);
        if (m && /[A-Za-zÀ-ÿ]{4,}/.test(m[1])) {
            return m[1].replace(/\s+/g, ' ').trim();
        }
    }

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
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    // Rejet propre si une composante manque ou sort des bornes calendaires.
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;

    const d = new Date(year, month - 1, day);
    // Garde anti-débordement : JS « roule » les dates impossibles (31/02 -> 03/03).
    // On exige que les composantes recalculées coïncident, sinon date invalide -> null.
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    return d;
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

// Détection d'anomalie UNIFIÉE — source de vérité unique pour tous les parsers ET l'affichage.
// Combine le statut explicite H/L du fichier ET la comparaison numérique aux bornes, en
// tenant compte des opérateurs (< / >). Retourne { isAbnormal, direction: 'high'|'low'|'' }.
// Indépendante du format de fichier : corrige le faux négatif où une valeur hors-normes
// sans flag H/L (format pipes) était affichée « normale ».
function computeAbnormal(result) {
    if (!result) return { isAbnormal: false, direction: '' };

    const status = (result.status ? String(result.status) : '').trim().toUpperCase();
    if (status === 'H') return { isAbnormal: true, direction: 'high' };
    if (status === 'L') return { isAbnormal: true, direction: 'low' };

    const toNum = (x) => (x === null || x === undefined || x === '') ? NaN : parseFloat(String(x).replace(',', '.'));
    const v = toNum(result.value1);
    const lo = toNum(result.min1);
    const hi = toNum(result.max1);
    const op = result.operator1 || '';

    if (isFinite(v)) {
        // Censure de la valeur : "<x"/"≤x" plafonnent -> jamais "haute" ;
        // ">x"/"≥x" planchent -> jamais "basse" ; "=" et absence d'opérateur : neutres.
        const upperCensored = (op === '<' || op === '≤');
        const lowerCensored = (op === '>' || op === '≥');
        const canBeHigh = !upperCensored;
        const canBeLow = !lowerCensored;
        if (canBeHigh && isFinite(hi) && (v > hi || (lowerCensored && v >= hi))) return { isAbnormal: true, direction: 'high' };
        if (canBeLow && isFinite(lo) && (v < lo || (upperCensored && v <= lo))) return { isAbnormal: true, direction: 'low' };
    }
    return { isAbnormal: false, direction: '' };
}

// État d'un résultat pour l'affichage : 'high' / 'low' / 'normal' / '' (non mesurable).
function getResultState(result) {
    const ab = computeAbnormal(result);
    if (ab.direction === 'high') return 'high';
    if (ab.direction === 'low') return 'low';

    const v = parseFloat(String(result.value1).replace(',', '.'));
    const hasNorm = (result.min1 !== null && result.min1 !== undefined && result.min1 !== '')
        || (result.max1 !== null && result.max1 !== undefined && result.max1 !== '');
    return (isFinite(v) && hasNorm) ? 'normal' : '';
}

// ----------------------------------------------------------------------------
// Export Node (tests). En navigateur (script classique), ces fonctions sont déjà
// globales ; ce bloc est simplement ignoré (`module` indéfini).
// ----------------------------------------------------------------------------
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Logger, cleanEncoding, decodeHTMLEntities, escapeHtml, decodeBuffer,
        detectHPRIMFormat, parseHPRIM,
        parseStructuredTagsHPRIM, parseStructuredPipesHPRIM, parseTextReadableHPRIM,
        parseTextFormatHPRIM, parseRESLine, collectFollowingTEX, processRawResults,
        parseSpecialValue, parseNorm, formatValue, formatNorms,
        extractPatientInfo, extractPatientName, extractBirthDate, extractSamplingDate,
        extractSamplingTime, extractFileDate, extractDoctorName, extractLaboratoryName, extractPhone,
        parseDate, calculateAge, validateDates,
        computeAbnormal, getResultState
    };
}
