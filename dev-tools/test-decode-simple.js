// Test simple du décodage
function decodeHTMLEntities(text) {
    if (!text || typeof text !== 'string') return text;
    
    return text
        .replace(/&eacute;/g, 'é')
        .replace(/&egrave;/g, 'è')
        .replace(/&agrave;/g, 'à')
        .replace(/&acirc;/g, 'â')
        .replace(/&ocirc;/g, 'ô')
        .replace(/&ucirc;/g, 'û')
        .replace(/&icirc;/g, 'î')
        .replace(/&ccedil;/g, 'ç')
        .replace(/&deg;/g, '°')
        .replace(/&#039;/g, "'")
        .replace(/<br\s*\/?>/g, '\n')
        // Supprimer les balises HTML mais préserver les marqueurs HPRIM ****...****
        .replace(/<(?!\*\*\*\*)[^>]*>/g, ''); // Préserver ****...****
}

const testString = `HIL :                                                   -              
****LAB****
TEX|                                                                   `;

console.log('Avant décodage:');
console.log(testString);

console.log('\nAprès décodage:');
const decoded = decodeHTMLEntities(testString);
console.log(decoded);

console.log('\nLignes après décodage:');
decoded.split('\n').forEach((line, i) => {
    console.log(`${i}: "${line}"`);
});