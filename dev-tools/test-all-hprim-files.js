// Test exhaustif de tous les fichiers HPRIM
const fs = require('fs');
const path = require('path');

// Mock DOM pour les tests
global.document = { getElementById: () => ({ style: {} }) };

// Charger les fonctions du renderer.js
const rendererCode = fs.readFileSync('/Users/cuffel.gregory/Downloads/hprimtool/hprim-electron/renderer.js', 'utf8');

// Évaluer les fonctions de parsing
try {
    eval(rendererCode.match(/function detectHPRIMFormat[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function decodeHTMLEntities[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function normalizeNumericValue[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseHPRIM[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseStructuredTagsHPRIM[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseTextReadableHPRIM[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseTextResultLine[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseRESLine[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function processRawResults[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseSpecialValue[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseNorm[\s\S]*?^}/m)[0]);
    
    // Fonction pour l'ancien parser en cas de fallback
    eval(rendererCode.match(/function parseStructuredPipesHPRIM[\s\S]*?return groupedResults;\s*}/m)[0]);
    
    console.log('✅ Toutes les fonctions chargées avec succès');
} catch (error) {
    console.log('❌ Erreur lors du chargement des fonctions:', error.message);
}

// Analyser tous les fichiers HPRIM
const hprimDir = '/Users/cuffel.gregory/Downloads/HPRIM Samples';
console.log(`\n🔍 Analyse de tous les fichiers HPRIM dans: ${hprimDir}\n`);

if (!fs.existsSync(hprimDir)) {
    console.log('❌ Dossier HPRIM Samples introuvable');
    process.exit(1);
}

const files = fs.readdirSync(hprimDir).filter(file => 
    file.endsWith('.hpr') || file.endsWith('.hpm1') || file.endsWith('.hpm2') || file.endsWith('.hpm3')
);

console.log(`📁 ${files.length} fichiers HPRIM trouvés\n`);

// Statistiques globales
const stats = {
    total: files.length,
    success: 0,
    errors: 0,
    formats: {
        structured_tags: 0,
        structured_pipes: 0,
        text_readable: 0,
        unknown: 0
    },
    issues: {
        noResults: [],
        parseErrors: [],
        encodingIssues: [],
        unknownFormats: []
    }
};

// Tester chaque fichier
for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(hprimDir, file);
    
    // Afficher progression tous les 50 fichiers
    if (i % 50 === 0 || i === files.length - 1) {
        process.stdout.write(`\r⏳ Progression: ${i + 1}/${files.length} (${Math.round((i + 1) / files.length * 100)}%)`);
    }
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Détecter le format
        const format = detectHPRIMFormat(content);
        stats.formats[format]++;
        
        // Vérifier les entités HTML
        const hasHTMLEntities = content.includes('&eacute;') || content.includes('&deg;') || content.includes('&agrave;');
        if (hasHTMLEntities) {
            // Tester le décodage
            const decoded = decodeHTMLEntities(content.substring(0, 500));
            if (decoded.includes('&')) {
                stats.issues.encodingIssues.push(file);
            }
        }
        
        // Parser le fichier
        const results = parseHPRIM(content);
        
        if (!results || results.length === 0) {
            stats.issues.noResults.push({ file, format });
        } else {
            stats.success++;
            
            // Vérifier la qualité des résultats
            const hasInvalidValues = results.some(r => 
                r.value1 === null || r.value1 === undefined || r.name === ''
            );
            
            if (hasInvalidValues) {
                stats.issues.parseErrors.push({ file, format, resultCount: results.length });
            }
        }
        
        if (format === 'unknown') {
            stats.issues.unknownFormats.push(file);
        }
        
    } catch (error) {
        stats.errors++;
        stats.issues.parseErrors.push({ file, error: error.message });
    }
}

console.log('\n\n📊 RÉSULTATS DE L\'ANALYSE EXHAUSTIVE\n');

// Afficher les statistiques
console.log('🎯 STATISTIQUES GLOBALES:');
console.log(`   Total de fichiers: ${stats.total}`);
console.log(`   Succès: ${stats.success} (${Math.round(stats.success / stats.total * 100)}%)`);
console.log(`   Erreurs: ${stats.errors} (${Math.round(stats.errors / stats.total * 100)}%)`);

console.log('\n📋 RÉPARTITION DES FORMATS:');
Object.entries(stats.formats).forEach(([format, count]) => {
    const percentage = Math.round(count / stats.total * 100);
    console.log(`   ${format}: ${count} (${percentage}%)`);
});

// Afficher les problèmes détectés
console.log('\n⚠️  PROBLÈMES DÉTECTÉS:\n');

if (stats.issues.noResults.length > 0) {
    console.log(`🔴 ${stats.issues.noResults.length} fichiers sans résultats:`);
    stats.issues.noResults.slice(0, 5).forEach(issue => {
        console.log(`   - ${issue.file} (format: ${issue.format})`);
    });
    if (stats.issues.noResults.length > 5) {
        console.log(`   ... et ${stats.issues.noResults.length - 5} autres`);
    }
    console.log('');
}

if (stats.issues.parseErrors.length > 0) {
    console.log(`🟡 ${stats.issues.parseErrors.length} fichiers avec erreurs de parsing:`);
    stats.issues.parseErrors.slice(0, 5).forEach(issue => {
        if (issue.error) {
            console.log(`   - ${issue.file}: ${issue.error}`);
        } else {
            console.log(`   - ${issue.file} (${issue.resultCount} résultats avec valeurs invalides)`);
        }
    });
    if (stats.issues.parseErrors.length > 5) {
        console.log(`   ... et ${stats.issues.parseErrors.length - 5} autres`);
    }
    console.log('');
}

if (stats.issues.unknownFormats.length > 0) {
    console.log(`🟠 ${stats.issues.unknownFormats.length} fichiers de format inconnu:`);
    stats.issues.unknownFormats.slice(0, 5).forEach(file => {
        console.log(`   - ${file}`);
    });
    if (stats.issues.unknownFormats.length > 5) {
        console.log(`   ... et ${stats.issues.unknownFormats.length - 5} autres`);
    }
    console.log('');
}

if (stats.issues.encodingIssues.length > 0) {
    console.log(`🔵 ${stats.issues.encodingIssues.length} fichiers avec problèmes d'encodage:`);
    stats.issues.encodingIssues.slice(0, 5).forEach(file => {
        console.log(`   - ${file}`);
    });
    if (stats.issues.encodingIssues.length > 5) {
        console.log(`   ... et ${stats.issues.encodingIssues.length - 5} autres`);
    }
    console.log('');
}

// Recommandations
console.log('💡 RECOMMANDATIONS POUR L\'ÉTAPE 3:\n');

if (stats.issues.unknownFormats.length > 0) {
    console.log('1. 📝 Analyser les formats inconnus pour étendre la détection');
}

if (stats.issues.noResults.length > 0) {
    console.log('2. 🔧 Améliorer les parsers pour les fichiers sans résultats');
}

if (stats.issues.parseErrors.length > 0) {
    console.log('3. 🛠️  Corriger les erreurs de parsing détectées');
}

if (stats.issues.encodingIssues.length > 0) {
    console.log('4. 🌐 Étendre le décodage des entités HTML');
}

console.log('\n🎉 Analyse terminée ! Prêt pour l\'étape 3.');