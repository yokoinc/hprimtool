// Debug du routing dans parseHPRIM
const fs = require('fs');

// Mock DOM
global.document = { getElementById: () => ({ style: {} }) };

// Charger uniquement les fonctions nécessaires
const rendererCode = fs.readFileSync('/Users/cuffel.gregory/Downloads/hprimtool/hprim-electron/renderer.js', 'utf8');

// Créer une version debug de parseHPRIM
function parseHPRIM_DEBUG(content) {
    console.log('🔍 DEBUG parseHPRIM - Début...');
    
    // Détecter le format du fichier
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
    
    const format = detectHPRIMFormat(content);
    console.log('Format détecté:', format);
    
    // Décoder les entités HTML
    function decodeHTMLEntities(text) {
        if (!text || typeof text !== 'string') return text;
        
        return text
            .replace(/&eacute;/g, 'é')
            .replace(/&egrave;/g, 'è')
            .replace(/&agrave;/g, 'à')
            .replace(/&deg;/g, '°')
            .replace(/&#039;/g, "'")
            .replace(/<br\s*\/?>/g, '\n')
            .replace(/<[^>]+>/g, '');
    }
    
    const decodedContent = decodeHTMLEntities(content);
    console.log('Contenu décodé, taille:', decodedContent.length);
    
    // Router vers le bon parser selon le format
    switch(format) {
        case 'structured_tags':
            console.log('Routing vers parseStructuredTagsHPRIM...');
            // Appeler directement ici pour tester
            
            const rawResults = [];
            const lines = decodedContent.split('\n');
            
            let inLabSection = false;
            let labLinesFound = 0;
            let resLinesFound = 0;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                if (line.includes('****LAB****')) {
                    inLabSection = true;
                    console.log(`Ligne ${i}: Entrée dans section LAB`);
                    continue;
                }
                
                if (line.includes('****FIN****')) {
                    inLabSection = false;
                    console.log(`Ligne ${i}: Sortie de section LAB`);
                    continue;
                }
                
                if (inLabSection) {
                    labLinesFound++;
                    if (line.startsWith('RES|')) {
                        resLinesFound++;
                        console.log(`Ligne ${i}: RES| trouvée: "${line.substring(0, 50)}..."`);
                        
                        // Parser cette ligne directement ici
                        const parts = line.split('|');
                        if (parts.length >= 8) {
                            const name = parts[1] ? parts[1].trim() : '';
                            const valueStr = parts[4] ? parts[4].trim() : '';
                            const type = parts[3] ? parts[3].trim() : '';
                            
                            if ((type === 'N' || type === 'A') && valueStr && name) {
                                console.log(`  -> Ligne valide: ${name} = ${valueStr} (type: ${type})`);
                                rawResults.push({
                                    name: name,
                                    value1: parseFloat(valueStr.replace(',', '.')),
                                    type: type
                                });
                            } else {
                                console.log(`  -> Ligne rejetée: type="${type}", valueStr="${valueStr}", name="${name}"`);
                            }
                        }
                    }
                }
            }
            
            console.log(`Lignes dans LAB: ${labLinesFound}, RES| trouvées: ${resLinesFound}`);
            console.log(`Raw results créés: ${rawResults.length}`);
            
            return rawResults;
            
        case 'structured_pipes':
            console.log('Routing vers parseStructuredPipesHPRIM...');
            return [];
        case 'text_readable':
            console.log('Routing vers parseTextReadableHPRIM...');
            return [];
        default:
            console.log('Format inconnu, fallback vers parseStructuredPipesHPRIM...');
            return [];
    }
}

// Test
const file = '025448c60024437cac3ee7b1fe89bd61_202505201418016063658.hpr';
const content = fs.readFileSync(`/Users/cuffel.gregory/Downloads/HPRIM Samples/${file}`, 'utf8');

console.log('🧪 TEST DEBUG DU ROUTING\n');
const results = parseHPRIM_DEBUG(content);
console.log(`\nRésultats finaux: ${results.length}`);