// Debug parseStructuredTagsHPRIM
const fs = require('fs');

// Mock DOM
global.document = { getElementById: () => ({ style: {} }) };

// Charger les fonctions
const rendererCode = fs.readFileSync('/Users/cuffel.gregory/Downloads/hprimtool/hprim-electron/renderer.js', 'utf8');

try {
    eval(rendererCode.match(/function parseStructuredTagsHPRIM[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseRESLine[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function processRawResults[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseSpecialValue[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseNorm[\s\S]*?^}/m)[0]);
    
    console.log('✅ Fonctions chargées\n');
} catch (error) {
    console.log('❌ Erreur:', error.message);
    process.exit(1);
}

// Test avec un fichier problématique
const file = '025448c60024437cac3ee7b1fe89bd61_202505201418016063658.hpr';
const content = fs.readFileSync(`/Users/cuffel.gregory/Downloads/HPRIM Samples/${file}`, 'utf8');

console.log('🔍 DEBUG parseStructuredTagsHPRIM\n');

const lines = content.split('\n');
let inLabSection = false;
let labLineCount = 0;
let resLineCount = 0;
let resFound = [];

console.log('Analyse ligne par ligne:');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.includes('****LAB****')) {
        console.log(`Ligne ${i}: ****LAB**** trouvé - inLabSection = true`);
        inLabSection = true;
        continue;
    }
    
    if (line.includes('****FIN****')) {
        console.log(`Ligne ${i}: ****FIN**** trouvé - inLabSection = false`);
        inLabSection = false;
        continue;
    }
    
    if (inLabSection) {
        labLineCount++;
        console.log(`Ligne ${i} (dans LAB): "${line.substring(0, 50)}..."`);
        
        if (line.startsWith('RES|')) {
            resLineCount++;
            resFound.push({ line: i, content: line.substring(0, 80) });
            console.log(`  -> LIGNE RES| trouvée !`);
        }
    }
}

console.log(`\nRésumé:`);
console.log(`- Lignes dans section LAB: ${labLineCount}`);
console.log(`- Lignes RES| trouvées: ${resLineCount}`);

if (resFound.length > 0) {
    console.log(`\nLignes RES| détectées:`);
    resFound.slice(0, 3).forEach((res, i) => {
        console.log(`  ${i + 1}. Ligne ${res.line}: "${res.content}..."`);
    });
    
    console.log(`\nTest de parseRESLine sur la première:`)
    const result = parseRESLine(resFound[0].content);
    console.log(`Résultat: ${result ? 'Réussi' : 'Échoué'}`);
    if (result) {
        console.log(`  Name: ${result.name}`);
        console.log(`  Value: ${result.value1}`);
        console.log(`  Unit: ${result.unit1}`);
    }
} else {
    console.log(`\n❌ Aucune ligne RES| trouvée dans la section LAB`);
}

// Test direct de parseStructuredTagsHPRIM
console.log(`\n🧪 Test direct de parseStructuredTagsHPRIM:`);
const results = parseStructuredTagsHPRIM(content);
console.log(`Résultats: ${results ? results.length : 0}`);