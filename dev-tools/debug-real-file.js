// Debug avec le vrai fichier
const fs = require('fs');

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

const file = '025448c60024437cac3ee7b1fe89bd61_202505201418016063658.hpr';
const content = fs.readFileSync(`/Users/cuffel.gregory/Downloads/HPRIM Samples/${file}`, 'utf8');

console.log('🔍 DEBUG AVEC LE VRAI FICHIER\n');

console.log('Étapes du décodage:');

// Étape 1: Original
console.log('1. Original:');
console.log(`   Taille: ${content.length}`);
console.log(`   ****LAB****: ${content.includes('****LAB****')}`);
console.log(`   RES| count: ${content.split('RES|').length - 1}`);

// Étape 2: Entités HTML seulement
let step2 = content
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&agrave;/g, 'à')
    .replace(/&acirc;/g, 'â')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&ucirc;/g, 'û')
    .replace(/&icirc;/g, 'î')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&deg;/g, '°')
    .replace(/&#039;/g, "'");

console.log('\n2. Après entités HTML:');
console.log(`   Taille: ${step2.length}`);
console.log(`   ****LAB****: ${step2.includes('****LAB****')}`);
console.log(`   RES| count: ${step2.split('RES|').length - 1}`);

// Étape 3: <br> vers \n
let step3 = step2.replace(/<br\s*\/?>/g, '\n');

console.log('\n3. Après <br> vers \\n:');
console.log(`   Taille: ${step3.length}`);
console.log(`   ****LAB****: ${step3.includes('****LAB****')}`);
console.log(`   RES| count: ${step3.split('RES|').length - 1}`);

// Étape 4: Suppression des balises HTML
let step4 = step3.replace(/<\/?(?:p|div|span|b|i|strong|em|u|font|center|table|tr|td|th|tbody|thead|head|body|html)[^>]*>/gi, '');

console.log('\n4. Après suppression balises HTML:');
console.log(`   Taille: ${step4.length}`);
console.log(`   ****LAB****: ${step4.includes('****LAB****')}`);
console.log(`   RES| count: ${step4.split('RES|').length - 1}`);

// Test complet
const final = decodeHTMLEntities(content);
console.log('\n5. Via fonction complète:');
console.log(`   Taille: ${final.length}`);
console.log(`   ****LAB****: ${final.includes('****LAB****')}`);
console.log(`   RES| count: ${final.split('RES|').length - 1}`);

// Chercher où sont perdues les lignes RES|
if (step3.split('RES|').length - 1 !== step4.split('RES|').length - 1) {
    console.log('\n❗ Les lignes RES| sont perdues lors de la suppression des balises HTML');
    
    // Chercher des balises contenant RES|
    const matches = step3.match(/<[^>]*RES\|[^>]*>/g);
    if (matches) {
        console.log('Balises contenant RES| trouvées:');
        matches.slice(0, 3).forEach(match => {
            console.log(`   "${match}"`);
        });
    }
}