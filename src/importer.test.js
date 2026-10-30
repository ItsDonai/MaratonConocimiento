import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseQuestionCsv, matchImages, summarizeImport, columns } from './importer.js';

const row = ['quiz-1', 'Ciencia', '¿Cuál es el más grande?', 'Marte', 'marte.jpg', 'Júpiter', 'jupiter.jpg', 'Saturno', 'saturno.png', '', '', 'B', 'Júpiter es el más grande.'];
function csv(rows = [row], delimiter = ',') {
  return '\uFEFF' + [columns, ...rows].map(r => r.map(s => `"${String(s).replaceAll('"', '""')}"`).join(delimiter)).join('\r\n');
}
test('plantilla válida con cuatro y tres opciones', () => {
  const parsed = parseQuestionCsv(fs.readFileSync('public/plantilla-preguntas.csv', 'utf8'));
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.questions[0].options.length, 4);
  assert.equal(parsed.questions[1].options.length, 3);
  assert.equal(parsed.questions[0].answer, 1);
});
test('acentos, BOM, comas, punto y coma, comillas y saltos de línea', () => {
  for (const delimiter of [',', ';']) {
    const data = [...row]; data[2] = '¿Qué significa "grande", aquí?\nElige una opción.';
    const parsed = parseQuestionCsv(csv([data], delimiter));
    assert.deepEqual(parsed.errors, []);
    assert.equal(parsed.questions[0].text, data[2]);
    assert.equal(parsed.questions[0].options[1].text, 'Júpiter');
  }
});
test('rechaza ids duplicados, respuesta inexistente y opción incompleta', () => {
  assert.match(parseQuestionCsv(csv([row, row])).errors.join(), /repite/);
  const invalid = [...row]; invalid[11] = 'D';
  assert.match(parseQuestionCsv(csv([invalid])).errors.join(), /correcta/);
  invalid[9] = 'Venus'; invalid[10] = '';
  assert.match(parseQuestionCsv(csv([invalid])).errors.join(), /Imagen D/);
});
test('detecta encabezados incorrectos, CSV vacío y registros desiguales', () => {
  assert.ok(parseQuestionCsv('id,pregunta\n1,Hola').errors.length);
  assert.ok(parseQuestionCsv('').errors.length);
  assert.ok(parseQuestionCsv(csv([])).errors.length);
  assert.ok(parseQuestionCsv(csv([[...row, 'sobrante']])).errors.length);
});
test('no acepta rutas, URLs, SVG ni textos demasiado largos', () => {
  for (const filename of ['../marte.jpg', 'C:\\marte.jpg', 'https://example.com/marte.jpg', 'marte.svg']) {
    const invalid = [...row]; invalid[4] = filename;
    assert.ok(parseQuestionCsv(csv([invalid])).errors.length);
  }
  const invalid = [...row]; invalid[2] = 'x'.repeat(181);
  assert.ok(parseQuestionCsv(csv([invalid])).errors.length);
});
test('vincula imágenes ignorando mayúsculas, detecta faltantes y nombres ambiguos', () => {
  const { questions } = parseQuestionCsv(csv());
  const files = [{ name: 'MARTE.JPG' }, { name: 'jupiter.jpg' }, { name: 'saturno.png' }];
  assert.deepEqual(matchImages(questions, files).errors, []);
  assert.equal(matchImages(questions, files).files.get('marte.jpg'), files[0]);
  assert.match(matchImages(questions, files.slice(1)).errors.join(), /falta/);
  assert.match(matchImages(questions, [...files, { name: 'marte.jpg' }]).errors.join(), /más de una vez/);
});
test('resumen distingue altas y actualizaciones con id numérico o texto', () => {
  assert.deepEqual(summarizeImport([{ id:'1' }, { id:'nueva' }], [{ id:1 }]), { added:1, updated:1 });
});
