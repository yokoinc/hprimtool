// Test the improved HPRIM parser
const fs = require('fs');

// Mock DOM for testing
global.document = { getElementById: () => ({ style: {} }) };

// Load the key functions from renderer.js
const rendererCode = fs.readFileSync('/Users/cuffel.gregory/Downloads/hprimtool/hprim-electron/renderer.js', 'utf8');

// Evaluate the key parsing functions
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

// Test files
const testFiles = [
    '/Users/cuffel.gregory/Downloads/hprimtool/test-format-texte.hpr',
    '/Users/cuffel.gregory/Downloads/hprimtool/test-format-structure.hpr',
    '/Users/cuffel.gregory/Downloads/HPRIM Samples/02f59289cc1b4e6ca011cde151e33982_202411211621071070990.hpr'
];

console.log('🧪 Testing improved HPRIM parser\n');

for (const filePath of testFiles) {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`❌ File not found: ${filePath.split('/').pop()}`);
            continue;
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const fileName = filePath.split('/').pop();
        
        console.log(`📄 Testing: ${fileName}`);
        
        // Test format detection
        const format = detectHPRIMFormat(content);
        console.log(`   Format detected: ${format}`);
        
        // Test HTML decoding
        const hasHTMLEntities = content.includes('&eacute;') || content.includes('&deg;');
        console.log(`   Has HTML entities: ${hasHTMLEntities}`);
        
        if (hasHTMLEntities) {
            const decoded = decodeHTMLEntities(content.substring(0, 200));
            console.log(`   Decoded sample: ${decoded.substring(0, 50)}...`);
        }
        
        // Test parsing
        const results = parseHPRIM(content);
        console.log(`   Results found: ${results ? results.length : 0}`);
        
        if (results && results.length > 0) {
            console.log(`   First result: ${results[0].name} = ${results[0].value1} ${results[0].unit1 || ''}`);
            
            // Check for HTML entity handling
            const hasDecodedEntities = results.some(r => 
                r.name.includes('é') || r.name.includes('°') || r.name.includes('è')
            );
            console.log(`   Has properly decoded entities: ${hasDecodedEntities}`);
        }
        
        console.log(`   ✅ Successfully processed\n`);
        
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }
}

console.log('🎉 Test completed!');