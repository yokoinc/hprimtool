// Debug ligne par ligne pour comprendre le problème
const fs = require('fs');

const file = '025448c60024437cac3ee7b1fe89bd61_202505201418016063658.hpr';
const content = fs.readFileSync(`/Users/cuffel.gregory/Downloads/HPRIM Samples/${file}`, 'utf8');

console.log('🔍 DEBUG LIGNE PAR LIGNE\n');

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
const lines = decodedContent.split('\n');

console.log(`Fichier: ${file}`);
console.log(`Taille originale: ${content.length}`);
console.log(`Taille décodée: ${decodedContent.length}`);
console.log(`Nombre de lignes: ${lines.length}\n`);

// Chercher les marqueurs LAB et FIN
let labLineNumber = -1;
let finLineNumber = -1;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.includes('****LAB****')) {
        labLineNumber = i;
        console.log(`Ligne ${i}: ****LAB**** trouvé: "${line}"`);
    }
    
    if (line.includes('****FIN****')) {
        finLineNumber = i;
        console.log(`Ligne ${i}: ****FIN**** trouvé: "${line}"`);
    }
}

console.log(`\nRésumé des marqueurs:`);
console.log(`  ****LAB****: ligne ${labLineNumber}`);
console.log(`  ****FIN****: ligne ${finLineNumber}`);

if (labLineNumber >= 0 && finLineNumber >= 0) {
    console.log(`\nSection LAB (lignes ${labLineNumber} à ${finLineNumber}):`);
    
    let resCount = 0;
    for (let i = labLineNumber + 1; i < finLineNumber; i++) {
        const line = lines[i].trim();
        if (line.startsWith('RES|')) {
            resCount++;
            console.log(`  Ligne ${i}: RES| - "${line.substring(0, 50)}..."`);
        }
    }
    
    console.log(`\nNombre total de lignes RES| dans la section: ${resCount}`);
} else {
    console.log('\n❌ Marqueurs LAB/FIN non trouvés correctement');
}