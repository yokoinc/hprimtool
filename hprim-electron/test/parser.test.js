// Tests du coeur de parsing HPRIM (node:test, zéro dépendance).
// Lancer : npm test   (depuis hprim-electron/)
process.env.NODE_ENV = 'production'; // silence Logger.debug

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const P = require('../parser.js');

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const pipes = fixture('pipes.hpr');
const tags = fixture('tags.hpr');
const text = fixture('text.hpr');

const byName = (arr, frag) => arr.find(r => r.name && r.name.toUpperCase().includes(frag.toUpperCase()));

// ---------------------------------------------------------------------------
test('detectHPRIMFormat distingue les 3 formats', () => {
    assert.equal(P.detectHPRIMFormat(tags), 'structured_tags');
    assert.equal(P.detectHPRIMFormat(pipes), 'structured_pipes');
    assert.equal(P.detectHPRIMFormat(text), 'text_readable');
});

// ---------------------------------------------------------------------------
test('parseNorm gère décimales à virgule, négatifs et bornes préfixées', () => {
    assert.equal(P.parseNorm('12,0'), 12);
    assert.equal(P.parseNorm('-2'), -2);
    assert.equal(P.parseNorm(''), null);
    assert.equal(P.parseNorm('< 5'), null); // borne préfixée → ignorée (jamais inversée)
});

test('parseSpecialValue extrait opérateur, astérisque et négatif', () => {
    assert.deepEqual(P.parseSpecialValue('>120'), { value: 120, highlighted: false, operator: '>' });
    assert.deepEqual(P.parseSpecialValue('*12.9*'), { value: 12.9, highlighted: true, operator: null });
    assert.equal(P.parseSpecialValue('-8').value, -8);
});

// ---------------------------------------------------------------------------
// Détection d'anomalie UNIFIÉE — le coeur clinique du correctif.
test('computeAbnormal : comparaison numérique sans flag H/L (fix faux négatif)', () => {
    assert.equal(P.computeAbnormal({ value1: '1.42', min1: 0.74, max1: 1.06 }).direction, 'high');
    assert.equal(P.computeAbnormal({ value1: '0.50', min1: 0.74, max1: 1.06 }).direction, 'low');
    assert.equal(P.computeAbnormal({ value1: '0.90', min1: 0.74, max1: 1.06 }).direction, '');
});

test('computeAbnormal : statut explicite prioritaire et insensible à la casse', () => {
    assert.equal(P.computeAbnormal({ value1: '0.9', min1: 0.74, max1: 1.06, status: 'H' }).direction, 'high');
    assert.equal(P.computeAbnormal({ value1: '0.9', status: 'l' }).direction, 'low');
});

test('computeAbnormal : opérateurs < / > pris en compte', () => {
    assert.equal(P.computeAbnormal({ value1: '100', operator1: '>', min1: 0.27, max1: 4.2 }).direction, 'high');
    assert.equal(P.computeAbnormal({ value1: '4.2', operator1: '>', min1: 0.27, max1: 4.2 }).direction, 'high'); // >max inclus
});

test('computeAbnormal : valeur censurée ">x" jamais classée basse (gating opérateur)', () => {
    // ">0.5" avec normes 1.0-4.0 : la vraie valeur peut être dans l'intervalle -> ne PAS classer low.
    assert.equal(P.computeAbnormal({ value1: '0.5', operator1: '>', min1: 1.0, max1: 4.0 }).direction, '');
    assert.equal(P.computeAbnormal({ value1: '10', operator1: '<', min1: 1.0, max1: 4.0 }).direction, '');
});

test('computeAbnormal : virgule décimale française non corrompue', () => {
    // parseFloat("3,2") vaudrait 3 sans normalisation -> faux. Doit donner low (3,2 < 3,5).
    assert.equal(P.computeAbnormal({ value1: '3,2', min1: '3,5', max1: '5,1' }).direction, 'low');
});

// ---------------------------------------------------------------------------
test('pipes : valeur hors-normes SANS statut est signalée (régression critique)', () => {
    const r = P.parseHPRIM(pipes);
    const glu = byName(r, 'GLUCOSE');
    assert.ok(glu, 'GLUCOSE doit être parsé');
    assert.equal(glu.isAbnormal, true);
    assert.equal(P.getResultState(glu), 'high');
});

test('pipes : valeur dans les normes = normal', () => {
    const r = P.parseHPRIM(pipes);
    assert.equal(P.getResultState(byName(r, 'HEMOGLOBINE')), 'normal');
    assert.equal(P.getResultState(byName(r, 'CREATININE')), 'normal');
});

test('pipes : statut explicite L respecté', () => {
    const r = P.parseHPRIM(pipes);
    assert.equal(P.getResultState(byName(r, 'TSH')), 'low');
});

test('pipes : bornes négatives préservées (fix split sur "-")', () => {
    const r = P.parseHPRIM(pipes);
    const be = byName(r, 'BASE EXCESS');
    assert.equal(be.min1, -2);
    assert.equal(be.max1, 2);
    assert.equal(P.getResultState(be), 'low'); // -8 < -2
});

// ---------------------------------------------------------------------------
test('tags : détection numérique cohérente avec le format pipes', () => {
    const r = P.parseHPRIM(tags);
    assert.equal(P.getResultState(byName(r, 'GLYCEMIE')), 'high'); // 1.30 > 1.06, sans flag
    assert.equal(P.getResultState(byName(r, 'SODIUM')), 'normal'); // 140 ∈ [136,145]
});

test('tags : norme combinée "min-max" -> borne haute préservée (fix MAJOR parseRESLine)', () => {
    const r = P.parseHPRIM(tags);
    const ca = byName(r, 'CALCIUM');
    assert.equal(ca.min1, 2.20);
    assert.equal(ca.max1, 2.60); // sans le fix, max serait null
    assert.equal(P.getResultState(ca), 'high'); // 3.00 > 2.60
});

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
test('decodeBuffer : UTF-8 préservé, windows-1252 récupéré, BOM géré', () => {
    assert.equal(P.decodeBuffer(Buffer.from([0xC3, 0xA9])), 'é');            // "é" UTF-8
    assert.equal(P.decodeBuffer(Buffer.from([0x4E, 0xE9, 0x65])), 'Née');    // 0xE9 = "é" cp1252 (invalide UTF-8 -> repli)
    assert.equal(P.decodeBuffer(Buffer.from([0xEF, 0xBB, 0xBF, 0x41])), 'A'); // BOM UTF-8 retiré
});

test('escapeHtml neutralise le HTML injecté', () => {
    assert.equal(P.escapeHtml('<img onerror=x>'), '&lt;img onerror=x&gt;');
    assert.equal(P.escapeHtml(`a & "b" 'c'`), 'a &amp; &quot;b&quot; &#39;c&#39;');
});

test('confidence : chute sous le seuil quand l\'identité est absente', () => {
    const info = P.extractPatientInfo('RES|GLUCOSE|GLU|N|1.0|g/L|0.7|1.1||\nRES|UREE|URE|N|0.4|g/L|0.1|0.5||');
    assert.ok(info.confidence < 0.8, 'confidence doit être pénalisée (' + info.confidence + ')');
});

test('en-tête SOLABIO : nom, naissance, labo, téléphone, prescripteur extraits', () => {
    const content = fixture('header-solabio.hpm');
    const info = P.extractPatientInfo(content);
    assert.equal(info.patientName, 'DUPONT JEAN');
    assert.ok(info.birthDate, 'date de naissance extraite');
    assert.equal(info.birthDate.getFullYear(), 1950);
    assert.equal(info.laboratoryName, 'LBM BIOLBS - LA HETRAIE');
    assert.equal(info.phone, '02.32.85.33.33');
    assert.equal(info.doctorName, 'MARTIN PAUL');
});

test('text : format détecté, patient extrait, parsing sans erreur', () => {
    assert.equal(P.detectHPRIMFormat(text), 'text_readable');
    const info = P.extractPatientInfo(text);
    assert.ok(info.patientName && info.patientName.toUpperCase().includes('MARTIN'));
    assert.ok(Array.isArray(P.parseHPRIM(text)));
});

// ---------------------------------------------------------------------------
// Opérateurs ≤ ≥ = (et variantes ASCII) — extraction + gating de l'anomalie.
test('parseSpecialValue extrait ≤ ≥ = et normalise <= >=', () => {
    assert.deepEqual(P.parseSpecialValue('≤0,05'), { value: 0.05, highlighted: false, operator: '≤' });
    assert.deepEqual(P.parseSpecialValue('≥120'), { value: 120, highlighted: false, operator: '≥' });
    assert.deepEqual(P.parseSpecialValue('<=5'), { value: 5, highlighted: false, operator: '≤' });
    assert.deepEqual(P.parseSpecialValue('>=10'), { value: 10, highlighted: false, operator: '≥' });
    assert.deepEqual(P.parseSpecialValue('=7'), { value: 7, highlighted: false, operator: '=' });
    assert.equal(P.parseSpecialValue('-8').operator, null); // négatif != opérateur
});

test('computeAbnormal : ≤ se comporte comme <, ≥ comme >, = neutre', () => {
    // ≤ : plafonné -> jamais haut ; bas si sous l'intervalle
    assert.equal(P.computeAbnormal({ value1: '0.03', operator1: '≤', min1: 0.5, max1: 1.0 }).direction, 'low');
    assert.equal(P.computeAbnormal({ value1: '0.8', operator1: '≤', min1: 0.5, max1: 1.0 }).direction, ''); // peut être dans l'intervalle
    // ≥ : planché -> jamais bas ; haut si au-dessus (borne incluse comme pour >)
    assert.equal(P.computeAbnormal({ value1: '200', operator1: '≥', min1: 10, max1: 100 }).direction, 'high');
    assert.equal(P.computeAbnormal({ value1: '4.2', operator1: '≥', min1: 0.27, max1: 4.2 }).direction, 'high');
    assert.equal(P.computeAbnormal({ value1: '0.5', operator1: '≥', min1: 1.0, max1: 4.0 }).direction, ''); // peut être dans l'intervalle
    // = : pas de censure, comparaison des deux côtés
    assert.equal(P.computeAbnormal({ value1: '5', operator1: '=', min1: 1, max1: 4 }).direction, 'high');
    assert.equal(P.computeAbnormal({ value1: '0.5', operator1: '=', min1: 1, max1: 4 }).direction, 'low');
});

// ---------------------------------------------------------------------------
// DFG : la borne du fichier prime ; "> 60" n'est qu'un repli sans normes.
test('formatNorms : DFG ne masque pas une borne fournie par le labo', () => {
    assert.equal(P.formatNorms(null, null, { name: 'DFG (estimé)' }), '&gt; 60'); // repli
    assert.equal(P.formatNorms(null, null, { code: '1.6' }), '&gt; 60');          // repli par code
    assert.equal(P.formatNorms(90, null, { name: 'DFG' }), '&gt; 90');            // borne réelle respectée
    assert.equal(P.formatNorms(null, null, { name: 'GLUCOSE' }), '');             // non-DFG sans normes
});

// ---------------------------------------------------------------------------
// Plafond de l'année de naissance dynamique (plus de blocage après 2024).
test('extractBirthDate : plafond = année courante (accepte une naissance récente, rejette le futur)', () => {
    const recent = `${new Date().getFullYear()}`;
    const ok = P.extractBirthDate(['', '', '', '', '', '', `15/03/${recent}`]);
    assert.ok(ok && ok.getFullYear() === new Date().getFullYear(), 'naissance de l\'année courante acceptée');
    const future = P.extractBirthDate(['', '', '', '', '', '', '15/03/2999']);
    assert.equal(future, null, 'année dans le futur rejetée');
});

// ---------------------------------------------------------------------------
// parseDate : dates valides acceptées, dates impossibles rejetées proprement.
test('parseDate : valide une date correcte et rejette jour/mois hors bornes', () => {
    const ok = P.parseDate('15/03/1980');
    assert.ok(ok && ok.getDate() === 15 && ok.getMonth() === 2 && ok.getFullYear() === 1980);
    assert.equal(P.parseDate('32/01/1980'), null); // jour > 31
    assert.equal(P.parseDate('15/13/1980'), null); // mois > 12
    assert.equal(P.parseDate('00/00/1980'), null); // composantes nulles
    assert.equal(P.parseDate('31/02/1980'), null); // 31 février -> pas de débordement silencieux
    assert.equal(P.parseDate('15-03-1980'), null); // séparateur non géré (les appelants normalisent en '/')
});
