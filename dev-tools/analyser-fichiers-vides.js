// Analyser les fichiers qui donnent 0 résultats
const fs = require('fs');
const path = require('path');

// Mock DOM
global.document = { getElementById: () => ({ style: {} }) };

// Charger les fonctions
const rendererCode = fs.readFileSync('/Users/cuffel.gregory/Downloads/hprimtool/hprim-electron/renderer.js', 'utf8');

try {
    eval(rendererCode.match(/function detectHPRIMFormat[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function decodeHTMLEntities[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function normalizeNumericValue[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseHPRIM[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseStructuredTagsHPRIM[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseRESLine[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseSpecialValue[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function parseNorm[\s\S]*?^}/m)[0]);
    eval(rendererCode.match(/function processRawResults[\s\S]*?^}/m)[0]);
    
    console.log('✅ Fonctions chargées\n');
} catch (error) {
    console.log('❌ Erreur:', error.message);
    process.exit(1);
}

// Trouver les fichiers sans résultats
const hprimDir = '/Users/cuffel.gregory/Downloads/HPRIM Samples';
const allFiles = fs.readdirSync(hprimDir).filter(file => file.endsWith('.hpr'));

console.log('🔍 ANALYSE DES FICHIERS SANS RÉSULTATS\n');

// Échantillonner quelques fichiers pour l'analyse
const sampleFiles = allFiles.slice(0, 20); // Premiers 20 fichiers
const emptyFiles = [];

// Identifier les fichiers sans résultats
for (const file of sampleFiles) {
    const filePath = path.join(hprimDir, file);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const results = parseHPRIM(content);
        
        if (!results || results.length === 0) {
            emptyFiles.push({ file, content: content.substring(0, 2000) }); // Premier 2000 chars
        }
    } catch (error) {
        emptyFiles.push({ file, error: error.message });
    }
}

console.log(`📊 Sur ${sampleFiles.length} fichiers testés:`);
console.log(`   - ${sampleFiles.length - emptyFiles.length} avec résultats`);
console.log(`   - ${emptyFiles.length} sans résultats\n`);

if (emptyFiles.length === 0) {
    console.log('✅ Tous les fichiers de l\'échantillon donnent des résultats !');
    process.exit(0);
}

// Analyser chaque fichier vide en détail
for (let i = 0; i < Math.min(3, emptyFiles.length); i++) {
    const fileInfo = emptyFiles[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 FICHIER ${i + 1}: ${fileInfo.file}`);
    console.log(`${'='.repeat(60)}\n`);
    
    if (fileInfo.error) {
        console.log(`❌ ERREUR: ${fileInfo.error}\n`);
        continue;
    }
    
    const content = fileInfo.content;
    const lines = content.split('\n');
    
    // 1. Analyser la structure générale
    console.log('📋 STRUCTURE GÉNÉRALE:');
    console.log(`   Lignes totales: ${lines.length}`);
    console.log(`   Taille: ${content.length} caractères`);
    
    // 2. Détecter le format
    const format = detectHPRIMFormat(content);
    console.log(`   Format détecté: ${format}`);
    
    // 3. Chercher les marqueurs HPRIM
    const hasLabMarker = content.includes('****LAB****');
    const hasFinMarker = content.includes('****FIN****');
    const hasResLines = content.includes('RES|');
    const hasVRPattern = content.includes('VR:');
    
    console.log(`   Marqueur ****LAB****: ${hasLabMarker ? '✅' : '❌'}`);
    console.log(`   Marqueur ****FIN****: ${hasFinMarker ? '✅' : '❌'}`);
    console.log(`   Lignes RES|: ${hasResLines ? '✅' : '❌'}`);
    console.log(`   Pattern VR:: ${hasVRPattern ? '✅' : '❌'}`);
    
    // 4. Afficher les premières lignes
    console.log('\n📄 PREMIÈRES LIGNES:');
    for (let j = 0; j < Math.min(10, lines.length); j++) {
        const line = lines[j].trim();
        if (line) {
            console.log(`   ${j + 1}: "${line}"`);
        }
    }
    
    // 5. Analyser les lignes RES| si elles existent
    if (hasResLines) {
        console.log('\n🔍 ANALYSE DES LIGNES RES|:');
        const resLines = lines.filter(line => line.startsWith('RES|'));
        console.log(`   Nombre de lignes RES|: ${resLines.length}`);
        
        if (resLines.length > 0) {
            console.log('   Échantillon des lignes RES|:');
            for (let k = 0; k < Math.min(3, resLines.length); k++) {
                const resLine = resLines[k];
                const parts = resLine.split('|');
                console.log(`     Ligne ${k + 1}:`);
                console.log(`       Contenu: "${resLine}"`);
                console.log(`       Parties: ${parts.length}`);
                if (parts.length >= 5) {
                    console.log(`       Type: "${parts[3] || 'vide'}"`);
                    console.log(`       Nom: "${parts[1] || 'vide'}"`);
                    console.log(`       Valeur: "${parts[4] || 'vide'}"`);
                }
                
                // Tester le parsing de cette ligne
                const parsed = parseRESLine(resLine);
                console.log(`       Parsing: ${parsed ? '✅ Réussi' : '❌ Échoué'}`);
                if (parsed) {
                    console.log(`       Résultat: ${parsed.name} = ${parsed.value1}`);
                }
            }
        }
    }
    
    // 6. Chercher d'autres patterns possibles
    console.log('\n🔎 AUTRES PATTERNS RECHERCHÉS:');
    const patterns = [
        { name: 'Lignes TEX|', pattern: 'TEX|', count: (content.match(/TEX\|/g) || []).length },
        { name: 'Données numériques isolées', pattern: /\b\d+[.,]\d+\b/g, count: (content.match(/\b\d+[.,]\d+\b/g) || []).length },
        { name: 'Unités médicales', pattern: /\b(g\/dL|mmol\/L|G\/L|%|\d+\/\d+)\b/g, count: (content.match(/\b(g\/dL|mmol\/L|G\/L|%|\d+\/\d+)\b/g) || []).length },
        { name: 'Encodage bizarre', pattern: /[À-ÿ]/g, count: (content.match(/[À-ÿ]/g) || []).length },
        { name: 'Entités HTML', pattern: /&[a-z]+;/g, count: (content.match(/&[a-z]+;/g) || []).length }
    ];
    
    patterns.forEach(pattern => {
        console.log(`   ${pattern.name}: ${pattern.count} occurences`);
    });
    
    // 7. Chercher la section entre ****LAB**** et ****FIN****
    if (hasLabMarker && hasFinMarker) {
        console.log('\n📦 CONTENU ENTRE ****LAB**** ET ****FIN****:');
        const labStart = content.indexOf('****LAB****');
        const finStart = content.indexOf('****FIN****');
        
        if (labStart !== -1 && finStart !== -1 && finStart > labStart) {
            const labSection = content.substring(labStart + 11, finStart).trim();
            const labLines = labSection.split('\n').filter(line => line.trim());
            
            console.log(`   Lignes dans la section LAB: ${labLines.length}`);
            console.log('   Échantillon:');
            labLines.slice(0, 5).forEach((line, idx) => {
                console.log(`     ${idx + 1}: "${line.trim()}"`);
            });
            
            // Compter les types de lignes dans la section LAB
            const resCount = labLines.filter(line => line.startsWith('RES|')).length;
            const texCount = labLines.filter(line => line.startsWith('TEX|')).length;
            const otherCount = labLines.length - resCount - texCount;
            
            console.log(`   Types de lignes: RES|=${resCount}, TEX|=${texCount}, Autres=${otherCount}`);
        }
    }
}

// Recommandations basées sur l'analyse
console.log(`\n\n💡 RECOMMANDATIONS BASÉES SUR L'ANALYSE:\n`);

if (emptyFiles.length > 0) {
    console.log('🔧 AMÉLIORATIONS SUGGÉRÉES:');
    console.log('1. Vérifier si parseStructuredTagsHPRIM() gère correctement la section ****LAB****');
    console.log('2. Analyser les conditions de filtrage dans parseRESLine()');
    console.log('3. Vérifier si certains fichiers ont des formats de lignes RES| différents');
    console.log('4. Implémenter un parser pour les lignes TEX| (texte libre)');
    console.log('5. Gérer les fichiers avec des encodages de caractères différents');
    
    console.log('\n🎯 ACTIONS PRIORITAIRES:');
    console.log('A. Modifier parseStructuredTagsHPRIM() pour être plus permissif');
    console.log('B. Ajouter des logs de debug pour voir où les résultats se perdent');
    console.log('C. Tester avec un parsing plus agressif des données numériques');
}

console.log('\n🔍 Analyse terminée. Prêt pour les corrections !');