// Simple test framework for HPRIM parsing logic
const fs = require('fs');
const path = require('path');

// Mock DOM elements for testing
global.document = {
    getElementById: () => ({ style: {} })
};

// Mock window object
global.window = {
    electronAPI: {
        onFileToOpen: () => {},
        onFileSelected: () => {}
    }
};

// Load renderer functions (excluding DOM-dependent parts)
const rendererCode = fs.readFileSync(path.join(__dirname, 'renderer.js'), 'utf8');

// Extract specific functions we need for testing
const functionMatches = rendererCode.match(/function (parseSpecialValue|parseNorm|escapeHtml|sanitizeFilePath|parseHPRIM|parseTextFormatHPRIM|extractPatientInfo|formatValue|formatNorms|calculateAge|validateDates|generatePatientHeader|formatDate|extractPatientName|extractBirthDate|extractSamplingDate|extractFileDate|extractDoctorName|parseDate)\([^}]+\}(?:[^}]*\})*)/g);

if (functionMatches) {
    functionMatches.forEach(func => {
        try {
            eval(func);
        } catch (error) {
            console.warn('Could not evaluate function:', func.split('(')[0]);
        }
    });
}

// Test cases
const testCases = [
    {
        name: 'parseSpecialValue with normal value',
        input: '5.2',
        expected: { value: 5.2, highlighted: false, operator: null }
    },
    {
        name: 'parseSpecialValue with highlighted value',
        input: '5.2*',
        expected: { value: 5.2, highlighted: true, operator: null }
    },
    {
        name: 'parseSpecialValue with less than operator',
        input: '<0.5',
        expected: { value: 0.5, highlighted: false, operator: '<' }
    },
    {
        name: 'parseSpecialValue with greater than operator',
        input: '>100',
        expected: { value: 100, highlighted: false, operator: '>' }
    },
    {
        name: 'parseNorm with valid value',
        input: '5.2',
        expected: 5.2
    },
    {
        name: 'parseNorm with comma decimal',
        input: '5,2',
        expected: 5.2
    },
    {
        name: 'parseNorm with empty string',
        input: '',
        expected: null
    },
    {
        name: 'escapeHtml with dangerous characters',
        input: '<script>alert("test")</script>',
        expected: '&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;'
    },
    {
        name: 'sanitizeFilePath with full path',
        input: '/Users/test/Documents/file.hpr',
        expected: 'file.hpr'
    },
    {
        name: 'sanitizeFilePath with Windows path',
        input: 'C:\\Users\\test\\Documents\\file.hpr',
        expected: 'file.hpr'
    }
];

// Simple test runner
function runTests() {
    console.log('Running HPRIM Tool Tests...\n');
    
    let passed = 0;
    let failed = 0;
    
    testCases.forEach(testCase => {
        try {
            let result;
            
            switch (testCase.name.split(' ')[0]) {
                case 'parseSpecialValue':
                    result = parseSpecialValue(testCase.input);
                    break;
                case 'parseNorm':
                    result = parseNorm(testCase.input);
                    break;
                case 'escapeHtml':
                    result = escapeHtml(testCase.input);
                    break;
                case 'sanitizeFilePath':
                    result = sanitizeFilePath(testCase.input);
                    break;
                default:
                    throw new Error(`Unknown test function: ${testCase.name}`);
            }
            
            if (JSON.stringify(result) === JSON.stringify(testCase.expected)) {
                console.log(`✅ ${testCase.name}`);
                passed++;
            } else {
                console.log(`❌ ${testCase.name}`);
                console.log(`   Expected: ${JSON.stringify(testCase.expected)}`);
                console.log(`   Got:      ${JSON.stringify(result)}`);
                failed++;
            }
        } catch (error) {
            console.log(`❌ ${testCase.name} - Error: ${error.message}`);
            failed++;
        }
    });
    
    console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
    console.log(`Success rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    
    return failed === 0;
}

// Additional integration tests
function testHPRIMParsing() {
    console.log('\nTesting HPRIM parsing with sample data...');
    
    // Sample HPRIM data
    const sampleData = `RES|GLUCOSE|GLU|N|5.2|mmol/L|3.5|6.5|N|
RES|HEMOGLOBINE|HGB|N|14.5|g/dL|12.0|16.0|N|
RES|CREATININE|CREA|N|85*|µmol/L|60|120|H|`;
    
    try {
        const results = parseHPRIM(sampleData);
        
        if (results && results.length > 0) {
            console.log(`✅ HPRIM parsing successful - ${results.length} results found`);
            return true;
        } else {
            console.log('❌ HPRIM parsing failed - no results found');
            return false;
        }
    } catch (error) {
        console.log(`❌ HPRIM parsing failed - Error: ${error.message}`);
        return false;
    }
}

// Run all tests
if (require.main === module) {
    const basicTestsPass = runTests();
    const hprimTestsPass = testHPRIMParsing();
    
    if (basicTestsPass && hprimTestsPass) {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
    } else {
        console.log('\n❌ Some tests failed');
        process.exit(1);
    }
}

module.exports = { runTests, testHPRIMParsing };