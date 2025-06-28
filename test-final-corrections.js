// Test final des corrections - échantillon de fichiers problématiques
const fs = require('fs');

// Mock DOM
global.document = { getElementById: () => ({ style: {} }) };

// Charger TOUTES les fonctions nécessaires
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
    
    // Parser principal qui route vers les autres
    eval(rendererCode.match(/function parseHPRIM[\s\S]*?^}/m)[0]);
    
    console.log('✅ Toutes les fonctions chargées\n');
} catch (error) {
    console.log('❌ Erreur:', error.message, error.stack);
    process.exit(1);
}

// Test sur les fichiers problématiques identifiés précédemment
const hprimDir = '/Users/cuffel.gregory/Downloads/HPRIM Samples';
const problemFiles = [
    '025448c60024437cac3ee7b1fe89bd61_202505201418016063658.hpr',
    '02dcdc3c5ae54982968d1417723252df_202505221046467941413.hpr', 
    '02f3cc929abb43f19fc91ab7cdb56735_202411200752093958351.hpr',
    '0410ec77c1b049baa4a5c8c8aa797bfa_202505221046469651733.hpr',
    '05421a25c7484a21bf48a7c6d27dce88_202505221046467936653.hpr'
];

console.log('🎯 TEST FINAL DES CORRECTIONS\n');

let totalTested = 0;
let totalWithResults = 0;
let totalResults = 0;

for (const file of problemFiles) {
    const filePath = `${hprimDir}/${file}`;
    
    if (!fs.existsSync(filePath)) {
        console.log(`❌ ${file} - Fichier introuvable`);
        continue;
    }
    
    totalTested++;
    console.log(`📄 ${file}`);
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const format = detectHPRIMFormat(content);
        
        console.log(`   Format: ${format}`);
        
        // Parser avec la fonction principale
        const results = parseHPRIM(content);
        
        if (results && results.length > 0) {
            totalWithResults++;
            totalResults += results.length;
            
            console.log(`   ✅ ${results.length} résultats trouvés`);
            
            // Afficher quelques exemples
            results.slice(0, 2).forEach((result, i) => {
                const value = typeof result.value1 === 'number' ? 
                    result.value1.toString() : 
                    result.value1;
                
                console.log(`     ${i + 1}. ${result.name} = ${value} ${result.unit1 || ''}`);
                
                if (result.hasNorms && (result.min1 || result.max1)) {
                    console.log(`        Normes: ${result.min1 || '?'} - ${result.max1 || '?'}`);
                }
                
                if (result.isHighlighted1) {
                    console.log(`        ⚠️ Valeur anormale`);
                }
            });
            
            // Compter les types de données
            const numericCount = results.filter(r => typeof r.value1 === 'number').length;
            const textualCount = results.filter(r => typeof r.value1 === 'string').length;
            
            console.log(`     Types: ${numericCount} numériques, ${textualCount} textuelles`);
            
        } else {
            console.log(`   ❌ Aucun résultat`);
        }
        
    } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
    }
    
    console.log('');
}

// Statistiques finales
console.log('📊 RÉSULTATS FINAUX:');
console.log(`   Fichiers testés: ${totalTested}`);
console.log(`   Fichiers avec résultats: ${totalWithResults} (${Math.round(totalWithResults / totalTested * 100)}%)`);
console.log(`   Total de résultats extraits: ${totalResults}`);
console.log(`   Moyenne par fichier: ${totalWithResults > 0 ? Math.round(totalResults / totalWithResults) : 0}`);

if (totalWithResults / totalTested >= 0.8) {
    console.log('\n🎉 SUCCÈS ! Taux de réussite élevé (≥80%)');
} else {
    console.log('\n🔄 Des améliorations sont encore nécessaires');
}

console.log('\n✅ Test terminé !');