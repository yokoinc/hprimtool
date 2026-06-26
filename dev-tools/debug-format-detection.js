// Debug de la détection de format avant/après décodage
const fs = require('fs');

// Charger les fonctions
const rendererCode = fs.readFileSync('/Users/cuffel.gregory/Downloads/hprimtool/hprim-electron/renderer.js', 'utf8');
eval(rendererCode.match(/function detectHPRIMFormat[\s\S]*?^}/m)[0]);
eval(rendererCode.match(/function decodeHTMLEntities[\s\S]*?^}/m)[0]);

const file = '025448c60024437cac3ee7b1fe89bd61_202505201418016063658.hpr';
const content = fs.readFileSync(`/Users/cuffel.gregory/Downloads/HPRIM Samples/${file}`, 'utf8');

console.log('🔍 DEBUG DÉTECTION DE FORMAT\n');

console.log('1. Détection sur contenu ORIGINAL:');
const originalFormat = detectHPRIMFormat(content);
console.log(`   Format: ${originalFormat}`);

console.log('\n2. Décodage HTML...');
const decodedContent = decodeHTMLEntities(content);

console.log('\n3. Détection sur contenu DÉCODÉ:');
const decodedFormat = detectHPRIMFormat(decodedContent);
console.log(`   Format: ${decodedFormat}`);

console.log('\n4. Analyse des critères:');
console.log('   Contenu original:');
console.log(`     Contient ****LAB****: ${content.includes('****LAB****')}`);
console.log(`     Contient ****FIN****: ${content.includes('****FIN****')}`);
console.log(`     Contient RES|: ${content.includes('RES|')}`);
console.log(`     Nombre de RES|: ${content.split('RES|').length - 1}`);

console.log('\n   Contenu décodé:');
console.log(`     Contient ****LAB****: ${decodedContent.includes('****LAB****')}`);
console.log(`     Contient ****FIN****: ${decodedContent.includes('****FIN****')}`);
console.log(`     Contient RES|: ${decodedContent.includes('RES|')}`);
console.log(`     Nombre de RES|: ${decodedContent.split('RES|').length - 1}`);

console.log('\n5. Explication du changement:');
if (originalFormat !== decodedFormat) {
    console.log(`   ⚠️ Le format change de ${originalFormat} à ${decodedFormat} après décodage`);
    
    if (originalFormat === 'structured_tags' && decodedFormat === 'structured_pipes') {
        console.log('   → Le décodage supprime les marqueurs ****LAB****, donc le format');
        console.log('     est reclassé comme structured_pipes (basé sur RES| uniquement)');
    }
} else {
    console.log(`   ✅ Le format reste stable: ${originalFormat}`);
}