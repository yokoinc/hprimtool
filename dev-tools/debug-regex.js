// Debug de la regex de suppression des balises HTML
const testContent = `HIL :                                                   -              
****LAB****
TEX|                                                                   
RES|HEMATIES : |NUM(1.1)|N|5000000|/mm3|||N|F||||
RES|H�moglobine : |NUM(2)|N|14.6|g/dL|12,1|15,0|N|F||||
****FIN****`;

console.log('🔍 DEBUG REGEX DE SUPPRESSION HTML\n');

console.log('Contenu de test:');
console.log(testContent);

console.log('\n1. Test de la regex actuelle:');
const regex1 = /<(?!\*\*\*\*)[^>]*>/g;
console.log(`Regex: ${regex1}`);

const result1 = testContent.replace(regex1, '');
console.log('Résultat:');
console.log(result1);

console.log('\n2. Test sans suppression de balises:');
const result2 = testContent
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&agrave;/g, 'à')
    .replace(/&deg;/g, '°')
    .replace(/&#039;/g, "'")
    .replace(/<br\s*\/?>/g, '\n');

console.log('Résultat:');
console.log(result2);

console.log('\n3. Vérifications:');
console.log(`Original contient ****LAB****: ${testContent.includes('****LAB****')}`);
console.log(`Résultat 1 contient ****LAB****: ${result1.includes('****LAB****')}`);
console.log(`Résultat 2 contient ****LAB****: ${result2.includes('****LAB****')}`);

console.log(`Original nombre RES|: ${testContent.split('RES|').length - 1}`);
console.log(`Résultat 1 nombre RES|: ${result1.split('RES|').length - 1}`);
console.log(`Résultat 2 nombre RES|: ${result2.split('RES|').length - 1}`);