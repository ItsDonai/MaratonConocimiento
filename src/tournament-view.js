import { teamLogos, applyTeamColor, teamNameElement } from './team-logos.js';

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function field(label, input) {
  input.setAttribute('aria-label', label);
  const wrapper = el('label', undefined, 'field'); wrapper.append(el('span', label), input); return wrapper;
}
function button(text, action, disabled = false) {
  const node = el('button', text, 'primary'); node.type = 'button'; node.disabled = disabled; node.onclick = action; return node;
}
function select(items) {
  const node = el('select');
  for (const [value, name] of items) { const option = el('option', name); option.value = value; node.append(option); }
  return node;
}

export function mountTournamentSetup(main, { create, back, count }) {
  main.append(el('h1', 'Configurar torneo', 'question'));
  const form = el('form', undefined, 'card');
  form.append(el('p', `Banco disponible: ${count} preguntas. Las preguntas vistas no vuelven a aparecer en otro encuentro del mismo torneo.`));
  const list = el('div');
  const entries = [];
  function add() {
    const row = el('div', undefined, 'tournament-team-row');
    const name = el('input'); name.value = `Equipo ${entries.length + 1}`; name.required = true; name.maxLength = 40;
    const logo = select([['', 'Sin logo'], ...teamLogos.map(l => [l.id, l.name])]);
    logo.onchange = () => applyTeamColor(name, logo.value);
    const entry = { row, name, logo };
    const remove = button('Quitar equipo', () => { entries.splice(entries.indexOf(entry), 1); row.remove(); });
    row.append(field('Nombre del equipo', name), field('Logo del equipo', logo), remove);
    entries.push(entry); list.append(row);
  }
  for (let i = 0; i < 4; i++) add();
  const addButton = button('Agregar equipo', () => { if (entries.length < 32) add(); });
  const status = el('p'); status.setAttribute('role', 'alert');
  const submit = el('button', 'Crear torneo', 'primary'); submit.type = 'submit';
  form.append(list, addButton, submit, button('Volver', back), status);
  form.onsubmit = async event => {
    event.preventDefault(); submit.disabled = true;
    try { await create(entries.map(e => ({ name: e.name.value, logo: e.logo.value }))); }
    catch (error) { status.textContent = error.message || String(error); submit.disabled = false; }
  };
  main.append(form);
}

function matchForm(main, view, change, busy) {
  const form = el('form', undefined, 'card');
  form.append(el('h2', 'Próximo enfrentamiento'));
  const items = view.roster.map(t => [t.id, t.name]);
  const a = select(items), b = select(items); b.selectedIndex = 1;
  const final = el('input'); final.type = 'checkbox';
  const mode = select([['questions', 'Límite de preguntas'], ['points', 'Primero en alcanzar los puntos']]);
  const limit = el('input'); limit.type = 'number'; limit.min = '1'; limit.max = String(view.remaining); limit.value = String(Math.min(5, view.remaining)); limit.required = true;
  form.append(field('Primer equipo', a), field('Segundo equipo', b), field('Es la final del torneo', final), field('Cómo termina este encuentro', mode), field('Límite del encuentro', limit));
  form.append(el('p', `${view.remaining} preguntas sin usar. En empate se añaden preguntas hasta desempatar. La final solo puede enfrentar a equipos que ya hayan ganado.`, 'muted'));
  const winners = new Set(view.matches.map(m => m.winnerId));
  final.onchange = () => {
    for (const node of [a, b]) for (const option of node.options) option.disabled = final.checked && !winners.has(option.value);
    if (final.checked) {
      const finalists = view.roster.filter(t => winners.has(t.id));
      a.value = finalists[0]?.id || ''; b.value = finalists[1]?.id || '';
    }
  };
  final.disabled = winners.size < 2 || busy;
  const submit = el('button', 'Iniciar enfrentamiento', 'primary'); submit.type = 'submit'; submit.disabled = busy || !view.remaining;
  form.append(submit);
  form.onsubmit = event => {
    event.preventDefault();
    change({ type: 'start_match', teamIds: [a.value, b.value], final: final.checked, mode: mode.value, limit: Number(limit.value) });
  };
  main.append(form);
}

export function renderTournament(main, view, { audience, scoreboard, question, change, importQuestions, busy }) {
  const nameNode = id => teamNameElement(view.roster.find(t => t.id === id) || { name: 'Equipo' });
  if (view.phase === 'playing') {
    main.classList.add('playing');
    scoreboard(main, view.match);
    question(main, { ...view.match, tournament: { ...view.settings, number: view.matches.length + 1 } });
  } else {
    main.classList.add('finished');
    if (view.match) scoreboard(main, view.match);
    if (view.phase === 'lobby') main.append(el('h1', 'Torneo listo', 'question'), el('p', 'Esperando el primer enfrentamiento.'));
    if (view.phase === 'review') {
      main.append(el('h1', 'Encuentro terminado', 'question'), el('p', 'Esperando la confirmación del conductor.'));
      if (!audience) {
        const result = el('p'); result.append('Ganador por puntuación: ', nameNode(view.winnerId));
        main.append(result, button('Confirmar ganador', () => change({ type: 'confirm_winner' }), busy), button('Corregir antes de confirmar', () => change({ type: 'reopen' }), busy));
      }
    }
    if (['winner', 'champion'].includes(view.phase)) {
      const title = el('h1', undefined, 'question');
      title.append(view.phase === 'champion' ? '¡Campeón del torneo: ' : '¡Ganó ', nameNode(view.winnerId), '!'); main.append(title);
      main.append(el('p', view.phase === 'champion' ? 'Final terminada.' : 'El próximo enfrentamiento está habilitado.'));
    }
    if (view.phase === 'exhausted') {
      main.append(el('h1', 'Encuentro pausado', 'question'), el('p', 'Se agotaron las preguntas y el marcador está empatado. Importa preguntas nuevas para desempatar; no se repetirán preguntas.'));
      if (!audience) main.append(button('Continuar con las preguntas añadidas', () => change({ type: 'continue' }), busy || !view.remaining));
    }
    if (!audience && ['lobby', 'winner'].includes(view.phase)) matchForm(main, view, change, busy);
  }
  if (!audience) {
    const panel = el('details', undefined, 'card tournament-history'); panel.open = view.phase !== 'playing';
    panel.append(el('summary', `Control del torneo · ${view.matches.length} encuentros confirmados · ${view.used} preguntas usadas · ${view.remaining} disponibles`));
    const list = el('ol');
    view.matches.forEach(m => {
      const item = el('li');
      item.append(`${m.final ? 'Final' : `Encuentro ${m.number}`}: `, nameNode(m.teamIds[0]), ` ${m.scores[0]} – ${m.scores[1]} `, nameNode(m.teamIds[1]), ' · Ganó ', nameNode(m.winnerId), ` · ${m.questions} preguntas`);
      list.append(item);
    });
    panel.append(list);
    const winners = [...new Set(view.matches.map(m => m.winnerId))];
    const winnerList = el('p', 'Equipos con victorias: ');
    winners.forEach((id, i) => { if (i) winnerList.append(', '); winnerList.append(nameNode(id)); });
    winnerList.append(winners.length ? '.' : 'Ninguno todavía.'); panel.append(winnerList);
    panel.append(el('p', 'Registro temporal: se conserva mientras la aplicación esté abierta.', 'muted'));
    main.append(panel);
    if (['lobby', 'winner', 'exhausted'].includes(view.phase)) main.append(button('Importar más preguntas para el torneo', importQuestions, busy));
  }
}
