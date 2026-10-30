// Para añadir un tema: registrar su id aquí, crear su CSS y admitirlo en Rust.
export const themes = [
  { id: 'classic', name: 'Clásico', description: 'La apariencia original, sobria y sencilla.' },
  { id: 'pop', name: 'Concurso pop', description: 'Violetas, tarjetas redondeadas y una celebración breve al acertar.' },
];
export function normalizeTheme(id) { return themes.some(theme => theme.id === id) ? id : 'classic'; }
export function applyTheme(id) { document.body.dataset.theme = normalizeTheme(id); }

export function mountThemeSettings(main, { current, save, back }) {
  const el = (tag, text, className) => { const node = document.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node; };
  main.append(el('h1', 'Configurar tema', 'question'));
  const panel = el('section', undefined, 'card');
  panel.append(el('p', 'El tema se aplica al control y a la pantalla de participantes. Los colores de cada equipo se conservan.'));
  const grid = el('div', undefined, 'theme-picker');
  let selected = current;
  const choices = [];
  const submit = el('button', 'Guardar tema', 'primary');
  const cancel = el('button', 'Volver sin guardar', 'choice');
  const status = el('p'); status.setAttribute('role', 'status');
  for (const theme of themes) {
    const label = el('label', undefined, `theme-tile theme-tile-${theme.id}`);
    const input = el('input'); input.type = 'radio'; input.name = 'system-theme'; input.value = theme.id; input.checked = current === theme.id;
    const sample = el('div', undefined, 'theme-sample'); sample.setAttribute('aria-hidden', 'true');
    sample.append(el('span', 'DITI  3'), el('span', 'DINE  2'), el('span', 'A · Marte'), el('span', 'B · Júpiter'));
    label.append(input, el('strong', theme.name), sample, el('span', theme.description));
    input.onchange = () => { selected = theme.id; applyTheme(selected); status.textContent = 'Vista previa aplicada. Guarda para actualizar ambas ventanas.'; };
    choices.push(input); grid.append(label);
  }
  cancel.onclick = () => { applyTheme(current); back(); };
  submit.onclick = async () => {
    [submit, cancel, ...choices].forEach(node => { node.disabled = true; });
    try { await save(selected); }
    catch (error) { status.textContent = `No se pudo guardar el tema: ${error.message || error}`; [submit, cancel, ...choices].forEach(node => { node.disabled = false; }); }
  };
  panel.append(grid, submit, cancel, status); main.append(panel);
}
