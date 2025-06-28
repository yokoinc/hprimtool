// Simple test for key functions
console.log('Testing key utility functions...');

// Test escapeHtml function
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Test sanitizeFilePath function  
function sanitizeFilePath(filePath) {
    if (!filePath) return '';
    return filePath.split(/[/\\]/).pop() || filePath;
}

// Test parseSpecialValue function
function parseSpecialValue(valueStr) {
    if (!valueStr || valueStr === '') {
        return { value: null, highlighted: false, operator: null };
    }
    
    let cleanValue = valueStr.trim();
    let highlighted = false;
    let operator = null;
    
    if (cleanValue.includes('*')) {
        highlighted = true;
        cleanValue = cleanValue.replace(/\*/g, '');
    }
    
    if (cleanValue.startsWith('<')) {
        operator = '<';
        cleanValue = cleanValue.substring(1);
    } else if (cleanValue.startsWith('>')) {
        operator = '>';
        cleanValue = cleanValue.substring(1);
    }
    
    const numericValue = parseFloat(cleanValue.replace(',', '.'));
    
    return {
        value: isNaN(numericValue) ? null : numericValue,
        highlighted: highlighted,
        operator: operator
    };
}

// Test parseNorm function
function parseNorm(normStr) {
    if (!normStr || normStr === '') return null;
    const cleaned = normStr.replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
}

// Run tests
let passed = 0;
let failed = 0;

function test(name, actual, expected) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
        console.log(`✅ ${name}`);
        passed++;
    } else {
        console.log(`❌ ${name}`);
        console.log(`   Expected: ${JSON.stringify(expected)}`);
        console.log(`   Got:      ${JSON.stringify(actual)}`);
        failed++;
    }
}

// Test cases
test('escapeHtml basic', escapeHtml('<script>'), '&lt;script&gt;');
test('escapeHtml quotes', escapeHtml('"test"'), '&quot;test&quot;');
test('sanitizeFilePath Unix', sanitizeFilePath('/path/to/file.txt'), 'file.txt');
test('sanitizeFilePath Windows', sanitizeFilePath('C:\\path\\file.txt'), 'file.txt');
test('parseSpecialValue normal', parseSpecialValue('5.2'), { value: 5.2, highlighted: false, operator: null });
test('parseSpecialValue highlighted', parseSpecialValue('5.2*'), { value: 5.2, highlighted: true, operator: null });
test('parseSpecialValue less than', parseSpecialValue('<0.5'), { value: 0.5, highlighted: false, operator: '<' });
test('parseNorm valid', parseNorm('5.2'), 5.2);
test('parseNorm comma', parseNorm('5,2'), 5.2);
test('parseNorm empty', parseNorm(''), null);

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed === 0) {
    console.log('🎉 All utility function tests passed!');
    process.exit(0);
} else {
    console.log('❌ Some tests failed');
    process.exit(1);
}