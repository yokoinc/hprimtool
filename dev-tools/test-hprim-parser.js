// Test the improved HPRIM parser with sample files
const fs = require('fs');
const path = require('path');

// Mock DOM for testing
global.document = { getElementById: () => ({ style: {} }) };
global.window = {};

// Load and evaluate the relevant functions from renderer.js
const rendererCode = fs.readFileSync(path.join(__dirname, 'hprim-electron/renderer.js'), 'utf8');

// Extract and evaluate functions
const functions = [
    'detectHPRIMFormat',
    'decodeHTMLEntities', 
    'normalizeNumericValue',
    'parseHPRIM',
    'parseStructuredTagsHPRIM',
    'parseStructuredPipesHPRIM', 
    'parseTextReadableHPRIM',
    'parseTextResultLine',
    'parseRESLine',
    'processRawResults',
    'parseSpecialValue',
    'parseNorm',
    'escapeHtml'
];

for (const funcName of functions) {
    const regex = new RegExp(`function ${funcName}\\([^{]*\\{[\\s\\S]*?\\n\\s*\\}`, 'g');
    const match = rendererCode.match(regex);
    if (match && match[0]) {
        try {
            eval(match[0]);
            console.log(`✅ Loaded function: ${funcName}`);
        } catch (error) {
            console.log(`❌ Failed to load function: ${funcName} - ${error.message}`);
        }
    } else {
        console.log(`⚠️  Function not found: ${funcName}`);
    }
}

// Test files
const testFiles = [
    '/Users/cuffel.gregory/Downloads/hprimtool/test-format-texte.hpr',
    '/Users/cuffel.gregory/Downloads/hprimtool/test-format-structure.hpr',
    '/Users/cuffel.gregory/Downloads/HPRIM Samples/02f59289cc1b4e6ca011cde151e33982_202411211621071070990.hpr'
];

console.log('\n=== Testing HPRIM Parser ===\n');

for (const filePath of testFiles) {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`❌ File not found: ${path.basename(filePath)}`);
            continue;
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const fileName = path.basename(filePath);
        
        console.log(`📄 Testing: ${fileName}`);
        
        // Test format detection
        if (typeof detectHPRIMFormat === 'function') {
            const format = detectHPRIMFormat(content);
            console.log(`   Format détecté: ${format}`);
        }
        
        // Test parsing
        if (typeof parseHPRIM === 'function') {
            const results = parseHPRIM(content);
            console.log(`   Résultats trouvés: ${results ? results.length : 0}`);
            
            if (results && results.length > 0) {
                console.log(`   Premier résultat: ${results[0].name} = ${results[0].value1} ${results[0].unit1 || ''}`);
                if (results.length > 1) {
                    console.log(`   Dernier résultat: ${results[results.length-1].name} = ${results[results.length-1].value1} ${results[results.length-1].unit1 || ''}`);
                }
            }
        }
        
        console.log('   ✅ Parsing completed\n');
        
    } catch (error) {
        console.log(`   ❌ Error parsing ${path.basename(filePath)}: ${error.message}\n`);
    }
}

console.log('=== Test completed ===');