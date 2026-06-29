// Test final du routing avec les corrections
const fs = require('fs');

// Mock DOM
global.document = { getElementById: () => ({ style: {} }) };

// Charger TOUTES les fonctions corrigées
const rendererCode = fs.readFileSync('/Users/cuffel.gregory/Downloads/hprimtool/hprim-electron/renderer.js', 'utf8');

try {
    eval(rendererCode.match(/function detectHPRIMFormat[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function decodeHTMLEntities[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function normalizeNumericValue[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseStructuredTagsHPRIM[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseTextReadableHPRIM[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseLabFecampLine[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseTextResultLine[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseRESLine[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function processRawResults[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseSpecialValue[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseNorm[\s\S]*?^}/m)[0]);
    
    // Parser principal corrigé
    eval(rendererCode.match(/function parseHPRIM[\s\S]*?^}/m)[0]);
    
    console.log('✅ Toutes les fonctions corrigées chargées\n');
} catch (error) {
    console.log('❌ Erreur:', error.message);
    process.exit(1);
}

// Test sur le fichier problématique
const file = '025448c60024437cac3ee7b1fe89bd61_202505201418016063658.hpr';
const content = fs.readFileSync(`/Users/cuffel.gregory/Downloads/HPRIM Samples/${file}`, 'utf8');

console.log('🧪 TEST ROUTING FINAL AVEC CORRECTIONS\n');
console.log(`📄 Fichier: ${file}`);

// Test étape par étape
console.log('\n1. Détection de format:');
const format = detectHPRIMFormat(content);
console.log(`   Format détecté: ${format}`);

console.log('\n2. Test direct parseStructuredTagsHPRIM:');
const directResults = parseStructuredTagsHPRIM(content);
console.log(`   Résultats directs: ${directResults ? directResults.length : 0}`);

console.log('\n3. Test via parseHPRIM (routing):');
const routedResults = parseHPRIM(content);
console.log(`   Résultats via routing: ${routedResults ? routedResults.length : 0}`);

if (directResults && routedResults) {
    if (directResults.length === routedResults.length) {
        console.log('\n✅ SUCCÈS ! Le routing fonctionne correctement');
        
        console.log('\nÉchantillon des résultats:');
        routedResults.slice(0, 3).forEach((result, i) => {
            console.log(`  ${i + 1}. ${result.name} = ${result.value1} ${result.unit1 || ''}`);
            if (result.min1 || result.max1) {
                console.log(`     Normes: ${result.min1 || '?'} - ${result.max1 || '?'}`);
            }
            if (result.isHighlighted1) {
                console.log(`     ⚠️ Valeur anormale`);
            }
        });
        
    } else {
        console.log(`\n❌ PROBLÈME ! Résultats différents: ${directResults.length} vs ${routedResults.length}`);
    }
} else {
    console.log('\n❌ L\'un des parsers a échoué');
}

console.log('\n✅ Test terminé !');