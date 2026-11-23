import { parseQuestionCsv, matchImages } from './importer.js';
import { invoke, isTauri } from '@tauri-apps/api/core';

function el(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

async function prepareImage(file) {
  if (file.size > 20 * 1024 * 1024) throw new Error(`«${file.name}» supera 20 MB.`);
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error(`«${file.name}» no es una imagen válida o no se puede abrir.`); }
  try {
    if (bitmap.width * bitmap.height > 80_000_000) throw new Error(`«${file.name}» tiene demasiados píxeles.`);
    const ratio = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally { bitmap.close(); }
}

export function mountImporter(main, { current, save, back }) {
  main.append(el('h1', 'Importar preguntas'));
  const panel = el('section'); panel.className = 'card import-panel';
  const template = el('a', 'Descargar plantilla CSV'); template.href = `${import.meta.env.BASE_URL}plantilla-preguntas.csv`; template.download = 'plantilla-preguntas.csv';
  template.className = 'choice template-download';
  const downloadStatus = el('p'); downloadStatus.setAttribute('role', 'status');
  let downloading = false;
  template.onclick = async event => {
    if (!isTauri()) return;
    event.preventDefault();
    if (downloading) return;
    downloading = true; template.setAttribute('aria-disabled', 'true');
    downloadStatus.textContent = '';
    try {
      const saved = await invoke('save_question_template');
      downloadStatus.textContent = saved ? 'Plantilla guardada. Sustituye las preguntas de ejemplo por las tuyas.' : 'Descarga cancelada.';
    } catch (error) { downloadStatus.textContent = `No se pudo descargar la plantilla: ${String(error.message || error)}`; }
    finally { downloading = false; template.removeAttribute('aria-disabled'); }
  };
  const guide = el('details');
  guide.append(el('summary', 'Cómo llenar la plantilla CSV'));
  const tips = el('ul');
  [
    'La plantilla contiene tres preguntas de ejemplo solo de texto, con tres y cuatro opciones. Sustitúyelas antes de importar. Las imágenes son opcionales.',
    'Conserva los encabezados y escribe una pregunta por fila. Usa un id único dentro del archivo. Cada importación reemplaza el banco completo.',
    'Completa categoria, pregunta y las opciones A, B y C y añade imágenes solo si las necesitas. Para usar solo tres opciones, deja opcion_d e imagen_d vacías.',
    'En imagen_a, imagen_b, imagen_c e imagen_d escribe el nombre completo del archivo, por ejemplo jupiter.jpg, sin carpetas. Selecciona esos archivos al importar.',
    'En correcta escribe A, B, C o D.',
    'Guarda como CSV UTF-8 desde Excel o LibreOffice para conservar acentos y eñes. Se admite coma o punto y coma como separador.',
    'Máximo 500 preguntas por archivo. Límites de texto: id 80, categoría 60, pregunta 1200, cada opción 400 caracteres.'
  ].forEach(text => tips.append(el('li', text)));
  guide.append(tips);
  panel.append(template, downloadStatus, guide);
  panel.append(el('p', 'Selecciona el CSV y, si las hay, sus imágenes. Los nombres del CSV deben coincidir con los archivos. Se admiten PNG, JPG y WebP.'));
  panel.append(el('p', 'Al confirmar, este CSV reemplazará todo el banco anterior. Las preguntas anteriores que no estén en el archivo se eliminarán. Revisar el archivo no modifica el banco.'));
  const csv = el('input'); csv.type = 'file'; csv.accept = '.csv,text/csv';
  const images = el('input'); images.type = 'file'; images.multiple = true; images.accept = '.png,.jpg,.jpeg,.webp';
  const folder = el('input'); folder.type = 'file'; folder.multiple = true; folder.setAttribute('webkitdirectory', '');
  for (const [label, input] of [['Archivo CSV (UTF-8)', csv], ['Imágenes opcionales: seleccionar archivos', images], ['O seleccionar una carpeta de imágenes', folder]]) {
    const field = el('label'); field.className = 'field'; field.append(el('span', label), input); panel.append(field);
  }
  panel.append(el('p', 'Cada imagen se adapta a un máximo de 1024 píxeles para la proyección. Hasta 500 preguntas y 64 MB procesados por lote. Usa textos breves para los proyectores pequeños.'));
  const review = el('button', 'Revisar importación'); review.className = 'primary';
  const cancel = el('button', 'Volver a la configuración'); cancel.className = 'choice'; cancel.onclick = back;
  const result = el('div'); result.setAttribute('aria-live', 'polite');
  panel.append(review, cancel, result); main.append(panel);
  let version = 0;
  let pending = false;
  const invalidate = () => { version++; result.replaceChildren(el('p', 'Selección modificada. Revisa de nuevo antes de importar.')); };
  [csv, images, folder].forEach(input => input.addEventListener('change', invalidate));
  function lock(value) {
    pending = value;
    [csv, images, folder, review, cancel].forEach(input => { input.disabled = value; });
  }
  function showErrors(errors) {
    const title = el('p', 'No se guardó ningún cambio. Corrige lo siguiente:'); title.setAttribute('role', 'alert');
    const list = el('ul'); errors.slice(0, 100).forEach(error => list.append(el('li', error)));
    result.replaceChildren(title, list);
    if (errors.length > 100) result.append(el('p', `Y ${errors.length - 100} errores más.`));
  }
  review.onclick = async () => {
    if (pending) return;
    lock(true); result.replaceChildren(el('p', 'Revisando preguntas e imágenes…'));
    const reviewedVersion = version;
    try {
      if (!csv.files.length) throw new Error('Selecciona un archivo CSV.');
      if (csv.files[0].size > 2 * 1024 * 1024) throw new Error('El CSV supera 2 MB.');
      const parsed = parseQuestionCsv(await csv.files[0].text());
      if (parsed.errors.length) { showErrors(parsed.errors); return; }
      const matched = matchImages(parsed.questions, [...images.files, ...folder.files].filter(f => /\.(png|jpe?g|webp)$/i.test(f.name)));
      if (matched.errors.length) { showErrors(matched.errors); return; }
      const cache = new Map();
      const prepared = [];
      let size = 0;
      const errors = [];
      for (const question of parsed.questions) {
        const options = [];
        for (const option of question.options) {
          if (!option.image) { options.push({ text: option.text, image: '' }); continue; }
          const name = option.image.toLowerCase();
          if (!cache.has(name)) {
            try { cache.set(name, await prepareImage(matched.files.get(name))); }
            catch (error) { errors.push(error.message); cache.set(name, null); }
          }
          const image = cache.get(name);
          size += image?.length || 0;
          options.push({ text: option.text, image });
        }
        const { record: _record, ...data } = question;
        prepared.push({ ...data, options });
        if (size > 64 * 1024 * 1024) throw new Error('El lote supera 64 MB procesados. Reduce la cantidad de preguntas o el tamaño de sus imágenes.');
      }
      if (errors.length) { showErrors(errors); return; }
      result.replaceChildren(el('h2', 'Revisión lista'), el('p', `El banco actual de ${current.length} preguntas se reemplazará por las ${prepared.length} preguntas de este archivo. No se combinarán los bancos.`));
      const preview = el('details'); preview.append(el('summary', 'Ver preguntas antes de guardar'));
      for (const question of prepared) {
        const item = el('details');
        item.append(el('summary', `${question.id} · ${question.category} · ${question.text}`));
        const options = el('div'); options.className = 'import-options';
        question.options.forEach((option, i) => {
          const figure = el('figure'); const image = el('img'); image.src = option.image; image.alt = option.text; image.loading = 'lazy';
          if (option.image) figure.append(image);
          figure.append(el('figcaption', `${String.fromCharCode(65 + i)}. ${option.text}${question.answer === i ? ' · Correcta' : ''}`)); options.append(figure);
        });
        item.append(options); preview.append(item);
      }
      const commit = el('button', `Reemplazar banco de ${current.length} por ${prepared.length} preguntas`); commit.className = 'primary';
      commit.onclick = async () => {
        if (pending || version !== reviewedVersion) return;
        lock(true); commit.disabled = true;
        try { await save(prepared); }
        catch (error) { showErrors([String(error.message || error)]); }
        finally { lock(false); }
      };
      result.append(preview, commit);
    } catch (error) { showErrors([String(error.message || error)]); }
    finally { lock(false); }
  };
}
