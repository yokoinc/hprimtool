// Vérifier rapidement quelques fichiers pour voir l'état
const fs = require('fs');

// Mock DOM
global.document = { getElementById: () => ({ style: {} }) };

// Charger les fonctions corrigées
const rendererCode = fs.readFileSync('/Users/cuffel.gregory/Downloads/hprimtool/hprim-electron/renderer.js', 'utf8');

try {
    eval(rendererCode.match(/function parseHPRIM[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function detectHPRIMFormat[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function decodeHTMLEntities[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseStructuredTagsHPRIM[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseRESLine[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function processRawResults[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseSpecialValue[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseNorm[\s\S]*?^}/m)[0]);
} catch (error) {
    console.log('Erreur chargement:', error.message);
    process.exit(1);
}

const hprimDir = '/Users/cuffel.gregory/Downloads/HPRIM Samples';
const allFiles = fs.readdirSync(hprimDir).filter(file => file.endsWith('.hpr'));

console.log('🔍 VÉRIFICATION RAPIDE DU STATUT');
console.log(`Total fichiers: ${allFiles.length}`);

// Test sur 10 fichiers aléatoires
const randomFiles = allFiles.sort(() => 0.5 - Math.random()).slice(0, 10);
let success = 0;

console.log('\n📊 Test sur 10 fichiers aléatoires:');
randomFiles.forEach((file, i) => {
    try {
        const content = fs.readFileSync(`${hprimDir}/${file}`, 'utf8');
        const results = parseHPRIM(content);
        const count = results ? results.length : 0;
        
        if (count > 0) {
            success++;
            console.log(`  ${i+1}. ✅ ${file.substring(0, 30)}... - ${count} résultats`);
        } else {
            console.log(`  ${i+1}. ❌ ${file.substring(0, 30)}... - 0 résultats`);
        }
    } catch (error) {
        console.log(`  ${i+1}. 🚨 ${file.substring(0, 30)}... - ERREUR`);
    }
});

console.log(`\n📈 Taux de réussite estimé: ${success}/10 (${success * 10}%)`);

// Fichiers spécifiquement problématiques
const problemFiles = [
    '025448c60024437cac3ee7b1fe89bd61_202505201418016063658.hpr',
    '02dcdc3c5ae54982968d1417723252df_202505221046467941413.hpr',
    '02f3cc929abb43f19fc91ab7cdb56735_202411200752093958351.hpr'
];

console.log('\n🎯 Test des fichiers anciennement problématiques:');
problemFiles.forEach((file, i) => {
    const filePath = `${hprimDir}/${file}`;
    if (fs.existsSync(filePath)) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const results = parseHPRIM(content);
            const count = results ? results.length : 0;
            console.log(`  ${i+1}. ✅ ${file.substring(0, 40)}... - ${count} résultats`);
        } catch (error) {
            console.log(`  ${i+1}. ❌ ${file.substring(0, 40)}... - ERREUR`);
        }
    } else {
        console.log(`  ${i+1}. 🚫 ${file.substring(0, 40)}... - INTROUVABLE`);
    }
});

console.log('\n✅ Vérification terminée!');