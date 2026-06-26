// Analyse complète des 692 fichiers HPRIM Samples
const fs = require('fs');
const path = require('path');

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
    eval(rendererCode.match(/function parseHPRIM[\s\S]*?^}/m)[0]);
    
    console.log('✅ Toutes les fonctions corrigées chargées\n');
} catch (error) {
    console.log('❌ Erreur lors du chargement des fonctions:', error.message);
    process.exit(1);
}

const hprimDir = '/Users/cuffel.gregory/Downloads/HPRIM Samples';

console.log('🔍 ANALYSE COMPLÈTE DES 692 FICHIERS HPRIM SAMPLES\n');

// Lister tous les fichiers .hpr
let allFiles;
try {
    allFiles = fs.readdirSync(hprimDir).filter(file => file.endsWith('.hpr'));
    console.log(`📁 Dossier: ${hprimDir}`);
    console.log(`📄 Fichiers .hpr trouvés: ${allFiles.length}\n`);
} catch (error) {
    console.log(`❌ Erreur lors de l'accès au dossier: ${error.message}`);
    process.exit(1);
}

// Statistiques globales
let stats = {
    total: allFiles.length,
    reussis: 0,
    echecs: 0,
    totalResultats: 0,
    formatsDetectes: {},
    erreurs: {},
    fichiersSansResultats: [],
    meilleursFichiers: [], // Top 5 avec le plus de résultats
    erreursTypes: {}
};

console.log('🚀 Début de l\'analyse...\n');

// Analyser chaque fichier
for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i];
    const filePath = path.join(hprimDir, file);
    
    // Afficher le progrès tous les 50 fichiers
    if (i % 50 === 0 || i === allFiles.length - 1) {
        console.log(`📊 Progrès: ${i + 1}/${allFiles.length} (${Math.round((i + 1) / allFiles.length * 100)}%)`);
    }
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const format = detectHPRIMFormat(content);
        
        // Compter les formats détectés
        stats.formatsDetectes[format] = (stats.formatsDetectes[format] || 0) + 1;
        
        // Parser le fichier
        const results = parseHPRIM(content);
        
        if (results && results.length > 0) {
            stats.reussis++;
            stats.totalResultats += results.length;
            
            // Garder les meilleurs fichiers (top 5)
            stats.meilleursFichiers.push({
                file: file,
                count: results.length,
                format: format
            });
            
            // Garder seulement les top 5
            stats.meilleursFichiers.sort((a, b) => b.count - a.count);
            if (stats.meilleursFichiers.length > 5) {
                stats.meilleursFichiers = stats.meilleursFichiers.slice(0, 5);
            }
            
        } else {
            stats.echecs++;
            stats.fichiersSansResultats.push({
                file: file,
                format: format
            });
        }
        
    } catch (error) {
        stats.echecs++;
        const errorType = error.message.substring(0, 50);
        stats.erreursTypes[errorType] = (stats.erreursTypes[errorType] || 0) + 1;
        
        stats.erreurs[file] = error.message;
    }
}

console.log('\n📊 RÉSULTATS DE L\'ANALYSE COMPLÈTE\n');

console.log('🎯 STATISTIQUES GÉNÉRALES:');
console.log(`   Fichiers analysés: ${stats.total}`);
console.log(`   Fichiers réussis: ${stats.reussis} (${Math.round(stats.reussis / stats.total * 100)}%)`);
console.log(`   Fichiers échoués: ${stats.echecs} (${Math.round(stats.echecs / stats.total * 100)}%)`);
console.log(`   Total de résultats extraits: ${stats.totalResultats}`);
console.log(`   Moyenne par fichier réussi: ${stats.reussis > 0 ? Math.round(stats.totalResultats / stats.reussis) : 0}`);

console.log('\n📝 FORMATS DÉTECTÉS:');
Object.entries(stats.formatsDetectes).sort((a, b) => b[1] - a[1]).forEach(([format, count]) => {
    const percentage = Math.round(count / stats.total * 100);
    console.log(`   ${format}: ${count} fichiers (${percentage}%)`);
});

console.log('\n🏆 TOP 5 FICHIERS AVEC LE PLUS DE RÉSULTATS:');
stats.meilleursFichiers.forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.file.substring(0, 40)}... - ${item.count} résultats (${item.format})`);
});

if (stats.fichiersSansResultats.length > 0) {
    console.log(`\n❌ FICHIERS SANS RÉSULTATS (${stats.fichiersSansResultats.length}):`);;
    stats.fichiersSansResultats.slice(0, 10).forEach(item => {
        console.log(`   - ${item.file.substring(0, 50)}... (${item.format})`);
    });
    if (stats.fichiersSansResultats.length > 10) {
        console.log(`   ... et ${stats.fichiersSansResultats.length - 10} autres`);
    }
}

if (Object.keys(stats.erreursTypes).length > 0) {
    console.log('\n🚨 TYPES D\'ERREURS:');
    Object.entries(stats.erreursTypes).sort((a, b) => b[1] - a[1]).forEach(([errorType, count]) => {
        console.log(`   "${errorType}...": ${count} fichiers`);
    });
}

console.log('\n🎉 ÉVALUATION FINALE:');
const tauxReussite = stats.reussis / stats.total;
if (tauxReussite >= 0.9) {
    console.log('   🥇 EXCELLENT ! Taux de réussite ≥ 90%');
} else if (tauxReussite >= 0.8) {
    console.log('   🥈 TRÈS BON ! Taux de réussite ≥ 80%');
} else if (tauxReussite >= 0.7) {
    console.log('   🥉 BON ! Taux de réussite ≥ 70%');
} else if (tauxReussite >= 0.5) {
    console.log('   ⚠️ MOYEN. Taux de réussite ≥ 50%');
} else {
    console.log('   🔴 FAIBLE. Taux de réussite < 50%');
}

console.log(`\n✅ Analyse terminée ! ${stats.totalResultats} résultats extraits au total.`);