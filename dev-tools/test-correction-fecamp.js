// Tester la correction pour les fichiers LABORATOIRE DE FECAMP
const fs = require('fs');

// Mock DOM
global.document = { getElementById: () => ({ style: {} }) };

// Charger les fonctions corrigées
const rendererCode = fs.readFileSync('/Users/cuffel.gregory/Downloads/hprimtool/hprim-electron/renderer.js', 'utf8');

try {
    eval(rendererCode.match(/function detectHPRIMFormat[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function decodeHTMLEntities[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function normalizeNumericValue[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseHPRIM[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseStructuredTagsHPRIM[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseTextReadableHPRIM[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseLabFecampLine[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseRESLine[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseSpecialValue[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseNorm[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function processRawResults[\s\S]*?^}/m)[0]);
    
    console.log('✅ Fonctions corrigées chargées\n');
} catch (error) {
    console.log('❌ Erreur:', error.message);
    process.exit(1);
}

// Tester les fichiers problématiques identifiés
const testFiles = [
    '025448c60024437cac3ee7b1fe89bd61_202505201418016063658.hpr',
    '02dcdc3c5ae54982968d1417723252df_202505221046467941413.hpr',
    '02f3cc929abb43f19fc91ab7cdb56735_202411200752093958351.hpr'
];

console.log('🧪 TEST DE LA CORRECTION POUR FORMAT LABORATOIRE DE FECAMP\n');

for (const file of testFiles) {
    const filePath = `/Users/cuffel.gregory/Downloads/HPRIM Samples/${file}`;
    
    if (!fs.existsSync(filePath)) {
        console.log(`❌ Fichier introuvable: ${file}\n`);
        continue;
    }
    
    console.log(`📄 Test: ${file}`);
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Détecter le format
        const format = detectHPRIMFormat(content);
        console.log(`   Format détecté: ${format}`);
        
        // Afficher quelques lignes d'exemple
        const lines = content.split('\n');
        const sampleLines = lines.filter(line => 
            line.includes(':') && 
            (line.includes('g/dL') || line.includes('G/L') || line.includes('/mm3') || line.includes('%'))
        ).slice(0, 3);
        
        console.log('   Lignes d\'exemple à parser:');
        sampleLines.forEach(line => {
            console.log(`     "${line.trim()}"`);
        });
        
        // Tester le parsing
        const results = parseHPRIM(content);
        console.log(`   Résultats trouvés: ${results ? results.length : 0}`);
        
        if (results && results.length > 0) {
            console.log('   ✅ SUCCÈS ! Échantillon des résultats:');
            results.slice(0, 3).forEach((result, i) => {
                console.log(`     ${i + 1}. ${result.name} = ${result.value1} ${result.unit1 || ''}`);
                if (result.min1 || result.max1) {
                    console.log(`        Normes: ${result.min1 || '?'} - ${result.max1 || '?'}`);
                }
                if (result.isHighlighted1) {
                    console.log(`        ⚠️ Valeur anormale`);
                }
            });
        } else {
            console.log('   ❌ Aucun résultat trouvé');
        }
        
    } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
    }
    
    console.log('');
}

// Test spécifique de parseLabFecampLine
console.log('🔬 TEST DIRECT DE parseLabFecampLine:\n');

const testLines = [
    'H�moglobine :                              14.6 g/dL    (12,1-15,0)',
    'PLAQUETTES :                           *141000* /mm3    (150000-400000)',
    'Neutrophiles % :                           42.6 %       -',
    'LEUCOCYTES :                               4.72 G/L     (4,00-10,00)'
];

testLines.forEach((line, i) => {
    console.log(`Test ${i + 1}: "${line}"`);
    const result = parseLabFecampLine(line);
    if (result) {
        console.log(`   ✅ Parsé: ${result.name} = ${result.value1} ${result.unit1}`);
        if (result.hasNorms) {
            console.log(`   Normes: ${result.min1} - ${result.max1}`);
        }
        if (result.isHighlighted1) {
            console.log(`   ⚠️ Valeur mise en évidence`);
        }
    } else {
        console.log(`   ❌ Échec du parsing`);
    }
    console.log('');
});

console.log('🎉 Test terminé !');