import Papa from 'papaparse';

export const columns = ['id', 'categoria', 'pregunta', 'opcion_a', 'imagen_a', 'opcion_b', 'imagen_b', 'opcion_c', 'imagen_c', 'opcion_d', 'imagen_d', 'correcta', 'explicacion'];

export function parseQuestionCsv(text) {
  if (text.includes('\uFFFD')) return { questions: [], errors: ['El archivo contiene caracteres ilegibles. Guárdalo como CSV UTF-8.'] };
  const result = Papa.parse(text.replace(/^\uFEFF/, ''), { skipEmptyLines: 'greedy', delimitersToGuess: [',', ';'], delimiter: '' });
  const errors = result.errors.map(e => `Registro ${(e.row ?? 0) + 1}: ${e.message}`);
  const [rawHeader = [], ...rows] = result.data;
  const header = rawHeader.map(v => v.trim().toLowerCase());
  for (const field of columns.filter(c => !['opcion_d', 'imagen_d'].includes(c))) {
    if (!header.includes(field)) errors.push(`Falta la columna «${field}».`);
  }
  if (new Set(header).size !== header.length) errors.push('Hay encabezados repetidos.');
  if (errors.length) return { questions: [], errors };
  if (!rows.length) errors.push('El CSV no contiene preguntas.');
  if (rows.length > 500) errors.push('Importa como máximo 500 preguntas por archivo.');
  const questions = [];
  const ids = new Set();
  rows.forEach((row, index) => {
    const record = index + 2;
    const error = message => errors.push(`Registro ${record}: ${message}`);
    if (row.length !== header.length) { error('La cantidad de campos no coincide con el encabezado.'); return; }
    const data = Object.fromEntries(header.map((key, i) => [key, String(row[i] ?? '').trim()]));
    if (!data.id || data.id.length > 80) error('El id es obligatorio y debe tener hasta 80 caracteres.');
    if (ids.has(data.id)) error(`El id «${data.id}» se repite en el CSV.`);
    ids.add(data.id);
    if (!data.categoria || data.categoria.length > 60) error('La categoría es obligatoria (máximo 60 caracteres).');
    if (!data.pregunta || data.pregunta.length > 180) error('La pregunta es obligatoria (máximo 180 caracteres).');
    if (data.explicacion.length > 300) error('La explicación admite hasta 300 caracteres.');
    const options = [];
    for (const letter of ['a', 'b', 'c', 'd']) {
      const option = data[`opcion_${letter}`] || '';
      const image = data[`imagen_${letter}`] || '';
      if (letter === 'd' && !option && !image) continue;
      if (!option || option.length > 80) error(`La opción ${letter.toUpperCase()} requiere texto (máximo 80 caracteres).`);
      if (!image || !/\.(png|jpe?g|webp)$/i.test(image) || /[\\/:]/.test(image) || image === '..') {
        error(`Imagen ${letter.toUpperCase()}: usa solo el nombre del archivo PNG, JPG o WebP, sin carpetas.`);
      }
      options.push({ text: option, image });
    }
    const answer = ['A', 'B', 'C', 'D'].indexOf(data.correcta.toUpperCase());
    if (answer < 0 || answer >= options.length) error('La respuesta correcta debe ser A, B, C o D y existir entre las opciones.');
    questions.push({ id: data.id, category: data.categoria, text: data.pregunta, options, answer, explanation: data.explicacion, record });
  });
  return { questions, errors };
}

export function matchImages(questions, files) {
  const map = new Map();
  const errors = [];
  for (const file of files) {
    // Comparación sin distinguir mayúsculas, como es habitual en Windows.
    const name = file.name.toLowerCase();
    if (map.has(name)) errors.push(`El nombre «${file.name}» aparece más de una vez entre las imágenes.`);
    map.set(name, file);
  }
  for (const q of questions) for (const option of q.options) {
    if (!map.has(option.image.toLowerCase())) errors.push(`Registro ${q.record}: falta la imagen «${option.image}».`);
  }
  return { files: map, errors };
}

export function summarizeImport(questions, current) {
  const ids = new Set(current.map(q => String(q.id)));
  const updated = questions.filter(q => ids.has(String(q.id))).length;
  return { added: questions.length - updated, updated };
}
