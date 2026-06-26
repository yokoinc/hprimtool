// Debug du décodage HTML
const fs = require('fs');

const file = '025448c60024437cac3ee7b1fe89bd61_202505201418016063658.hpr';
const content = fs.readFileSync(`/Users/cuffel.gregory/Downloads/HPRIM Samples/${file}`, 'utf8');

console.log('🔍 DEBUG DÉCODAGE HTML\n');

// Trouver la ligne ****LAB**** dans le contenu original
const originalLines = content.split('\n');
let labLineInOriginal = -1;

for (let i = 0; i < originalLines.length; i++) {
    if (originalLines[i].includes('****LAB****')) {
        labLineInOriginal = i;
        console.log(`Ligne ${i} dans l'original: "${originalLines[i]}"`);
        break;
    }
}

// Décoder les entités HTML (VERSION CORRIGÉE)
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
        // Supprimer les balises HTML mais préserver les marqueurs HPRIM ****...****
        .replace(/<(?!\*\*\*\*)[^>]*>/g, ''); // Préserver ****...****
}

const decodedContent = decodeHTMLEntities(content);
const decodedLines = decodedContent.split('\n');

console.log(`\nContenu original autour de la ligne ${labLineInOriginal}:`);
for (let i = Math.max(0, labLineInOriginal - 2); i <= Math.min(originalLines.length - 1, labLineInOriginal + 2); i++) {
    console.log(`  ${i}: "${originalLines[i]}"`);
}

console.log(`\nContenu décodé (premières lignes contenant LAB):`);
for (let i = 0; i < decodedLines.length; i++) {
    if (decodedLines[i].includes('LAB')) {
        console.log(`  ${i}: "${decodedLines[i]}"`);
    }
}

console.log(`\nNombre de lignes:`);
console.log(`  Original: ${originalLines.length}`);
console.log(`  Décodé: ${decodedLines.length}`);

// Chercher spécifiquement ****LAB****
console.log(`\nRecherche de ****LAB**** dans le contenu décodé:`);
let found = false;
for (let i = 0; i < decodedLines.length; i++) {
    if (decodedLines[i].includes('****LAB****')) {
        console.log(`  Trouvé ligne ${i}: "${decodedLines[i]}"`);
        found = true;
    }
}

if (!found) {
    console.log('  ❌ ****LAB**** introuvable dans le contenu décodé');
    
    // Chercher des variations
    console.log('\nRecherche de variations:');
    for (let i = 0; i < decodedLines.length; i++) {
        const line = decodedLines[i];
        if (line.includes('LAB') && line.includes('*')) {
            console.log(`  Ligne ${i}: "${line}"`);
        }
    }
}