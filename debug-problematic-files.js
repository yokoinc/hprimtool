// Debug des fichiers problématiques
const fs = require('fs');

// Mock DOM
global.document = { getElementById: () => ({ style: {} }) };

// Charger les fonctions
const rendererCode = fs.readFileSync('/Users/cuffel.gregory/Downloads/hprimtool/hprim-electron/renderer.js', 'utf8');
eval(rendererCode.match(/function parseRESLine[\s\S]*?^}/m)[0]);
eval(rendererCode.match(/function processRawResults[\s\S]*?^}/m)[0]);
eval(rendererCode.match(/function parseSpecialValue[\s\S]*?^}/m)[0]);
eval(rendererCode.match(/function parseNorm[\s\S]*?^}/m)[0]);

// Tester un fichier problématique
const files = fs.readdirSync('/Users/cuffel.gregory/Downloads/HPRIM Samples')
    .filter(f => f.endsWith('.hpr'))
    .slice(0, 3); // Premier 3 fichiers

console.log('🔍 DIAGNOSTIC APPROFONDI\n');

for (const file of files) {
    const filePath = `/Users/cuffel.gregory/Downloads/HPRIM Samples/${file}`;
    const content = fs.readFileSync(filePath, 'utf8');
    
    console.log(`📄 Fichier: ${file}`);
    
    // Chercher les lignes RES|
    const lines = content.split('\n');
    const resLines = lines.filter(line => line.startsWith('RES|'));
    
    console.log(`   Total lignes RES|: ${resLines.length}`);
    
    // Analyser les 5 premières lignes RES
    console.log('   Échantillon des lignes RES:');
    for (let i = 0; i < Math.min(5, resLines.length); i++) {
        const line = resLines[i];
        const parts = line.split('|');
        
        console.log(`     Ligne ${i + 1}:`);
        console.log(`       Type: "${parts[3] || 'vide'}"`);
        console.log(`       Nom: "${parts[1] || 'vide'}"`);
        console.log(`       Valeur: "${parts[4] || 'vide'}"`);
        console.log(`       Parties total: ${parts.length}`);
        
        // Test du parsing
        const result = parseRESLine(line);
        console.log(`       Résultat parsing: ${result ? '✅ Accepté' : '❌ Rejeté'}`);
        if (result) {
            console.log(`       Value1 final: ${result.value1}`);
        }
        console.log('');
    }
    
    // Test du processRawResults
    const rawResults = resLines.map(line => parseRESLine(line)).filter(r => r !== null);
    console.log(`   Raw results créés: ${rawResults.length}`);
    
    if (rawResults.length > 0) {
        const processed = processRawResults(rawResults);
        console.log(`   Processed results: ${processed.length}`);
        console.log(`   Taux de survie: ${Math.round(processed.length / rawResults.length * 100)}%`);
        
        // Analyser ce qui est rejeté
        const rejected = rawResults.filter(r => 
            !r || !r.name || r.value1 === null || r.value1 === undefined
        );
        console.log(`   Rejetés par filtrage: ${rejected.length}`);
        if (rejected.length > 0) {
            console.log('   Raisons de rejet:');
            rejected.slice(0, 3).forEach((r, i) => {
                console.log(`     ${i + 1}. Name: "${r?.name || 'null'}", Value1: ${r?.value1}`);
            });
        }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
}

console.log('🎯 RECOMMANDATIONS:');
console.log('1. Élargir les types acceptés dans parseRESLine');
console.log('2. Assouplir le filtrage dans processRawResults');
console.log('3. Gérer les valeurs textuelles (commentaires, etc.)');