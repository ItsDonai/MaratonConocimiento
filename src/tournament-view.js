import { teamLogos, applyTeamColor, teamNameElement } from './team-logos.js';
import { winnerTrophy } from './celebrations.js';
import { takariWaiting } from './takari.js';

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
  main.append(el('h1', 'Configurar equipos para las rondas', 'question'));
  const form = el('form', undefined, 'card');
  form.append(el('p', `Banco disponible: ${count} preguntas. Las preguntas vistas no vuelven a aparecer en las siguientes rondas. Tú eliges los enfrentamientos y decides qué equipos pasan; el sistema no lleva eliminatorias.`));
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
  const submit = el('button', 'Comenzar rondas', 'primary'); submit.type = 'submit';
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
  const mode = select(view.manualRounds ? [['questions', 'Cantidad de preguntas']] : [['questions', 'Límite de preguntas'], ['points', 'Primero en alcanzar los puntos']]);
  const limit = el('input'); limit.type = 'number'; limit.min = '1'; limit.max = String(view.remaining); limit.value = String(view.manualRounds && view.settings ? view.settings.limit : Math.min(4, view.remaining)); limit.required = true;
  limit.readOnly = !!(view.manualRounds && view.settings);
  form.append(field('Primer equipo', a), field('Segundo equipo', b), ...(view.manualRounds ? [] : [field('Es la final del torneo', final)]), field('Cómo termina este encuentro', mode), field('Límite del encuentro', limit));
  form.append(el('p', view.manualRounds ? `${view.remaining} preguntas sin usar. Si la ronda termina en empate, puedes desempatar con preguntas adicionales o confirmar el empate. Después puedes elegir cualquier par de equipos; los pases se deciden fuera del sistema.` : `${view.remaining} preguntas sin usar. En empate se añaden preguntas hasta desempatar. La final solo puede enfrentar a equipos que ya hayan ganado.`, 'muted'));
  const winners = new Set(view.matches.map(m => m.winnerId));
  final.onchange = () => {
    for (const node of [a, b]) for (const option of node.options) option.disabled = final.checked && !winners.has(option.value);
    if (final.checked) {
      const finalists = view.roster.filter(t => winners.has(t.id));
      a.value = finalists[0]?.id || ''; b.value = finalists[1]?.id || '';
    }
  };
  final.disabled = winners.size < 2 || busy;
  const submit = el('button', 'Iniciar enfrentamiento', 'primary'); submit.type = 'submit'; submit.disabled = busy || !view.remaining || (view.manualRounds && view.settings && view.remaining < view.settings.limit);
  form.append(submit);
  form.onsubmit = event => {
    event.preventDefault();
    change({ type: 'start_match', teamIds: [a.value, b.value], final: final.checked, mode: mode.value, limit: Number(limit.value) });
  };
  main.append(form);
}

export function renderTournament(main, view, { audience, scoreboard, question, change, importQuestions, busy }) {
  const nameNode = id => teamNameElement(view.roster.find(t => t.id === id) || { name: 'Equipo' });
  const offerTiebreak = () => {
    main.append(button('Desempatar con otra pregunta', () => change({ type: 'tiebreak' }), busy || !view.remaining));
    main.append(el('p', view.remaining ? 'Se conserva el marcador. Si continúa el empate, podrás agregar otra pregunta.' : 'No quedan preguntas nuevas para desempatar.', 'muted'));
  };
  if (view.phase === 'playing') {
    main.classList.add('playing');
    scoreboard(main, view.match);
    question(main, { ...view.match, tournament: { ...view.settings, number: view.matches.length + 1 } });
  } else {
    main.classList.add('finished');
    if (view.match && !['winner', 'champion'].includes(view.phase)) scoreboard(main, view.match);
    if (view.phase === 'lobby') {
      if (audience) main.append(takariWaiting('Esperando el primer enfrentamiento…'));
      else main.append(el('h1', 'Torneo listo', 'question'), el('p', 'Esperando el primer enfrentamiento.'));
    }
    if (view.phase === 'review') {
      main.append(el('h1', 'Encuentro terminado', 'question'), el('p', 'Esperando la confirmación del conductor.'));
      if (!audience) {
        const result = el('p'); if (view.winnerId === null) result.append('La ronda terminó en empate.');
        else result.append('Ganador por puntuación: ', nameNode(view.winnerId));
        main.append(result, button(view.manualRounds ? 'Confirmar resultado' : 'Confirmar ganador', () => change({ type: 'confirm_winner' }), busy), button('Corregir antes de confirmar', () => change({ type: 'reopen' }), busy));
        if (view.winnerId === null) offerTiebreak();
      }
    }
    if (['winner', 'champion'].includes(view.phase)) {
      if (view.phase === 'winner' && view.waiting) {
        if (audience) main.append(takariWaiting('Preparando el próximo enfrentamiento…'));
        else main.append(el('h1', 'Participantes en espera', 'question'), el('p', 'El resultado anterior sigue guardado. Puedes iniciar el próximo enfrentamiento.'));
      } else {
      const result = el('section', undefined, 'victory-panel');
      if (view.winnerId !== null) result.append(winnerTrophy());
      const title = el('h1', undefined, 'question');
      if (view.winnerId === null) title.append('Ronda terminada en empate');
      else title.append(view.phase === 'champion' ? '¡Campeón del torneo: ' : '¡Ganó ', nameNode(view.winnerId), '!'); result.append(title);
      scoreboard(result, view.match);
      result.append(el('p', view.phase === 'champion' ? 'Final terminada.' : 'El próximo enfrentamiento está habilitado.'));
      main.append(result);
      }
      if (!audience && view.phase === 'winner' && !view.waiting) {
        if (view.winnerId === null) offerTiebreak();
        if (view.manualRounds) {
          main.append(button('Siguiente partido', () => change({ type: 'next_match' }), busy || view.remaining < view.settings.limit));
          main.append(el('p', view.remaining < view.settings.limit ? `Quedan ${view.remaining} preguntas; no alcanzan para otro partido de ${view.settings.limit}. Vuelve al inicio para reiniciar el banco.` : `El siguiente partido usará ${view.settings.limit} preguntas de las ${view.remaining} restantes.`, 'muted'));
        } else main.append(button('Mostrar pantalla de espera', () => change({ type: 'show_waiting' }), busy));
      }
    }
    if (view.phase === 'exhausted') {
      main.append(el('h1', 'Encuentro pausado', 'question'), el('p', 'Se agotaron las preguntas y el marcador está empatado. Carga un nuevo banco para desempatar. Los identificadores ya utilizados no se repetirán.'));
      if (!audience) main.append(button('Continuar con el nuevo banco', () => change({ type: 'continue' }), busy || !view.remaining));
    }
    if (!audience && (view.phase === 'lobby' || (view.phase === 'winner' && (!view.manualRounds || view.selectingNext)))) matchForm(main, view, change, busy);
  }
  if (!audience) {
    const panel = el('details', undefined, 'card tournament-history'); panel.open = view.phase !== 'playing';
    panel.append(el('summary', `Control del torneo · ${view.matches.length} encuentros confirmados · ${view.used} preguntas usadas · ${view.remaining} disponibles`));
    const list = el('ol');
    view.matches.forEach(m => {
      const item = el('li');
      item.append(`${m.final ? 'Final' : `Encuentro ${m.number}`}: `, nameNode(m.teamIds[0]), ` ${m.scores[0]} - ${m.scores[1]} `, nameNode(m.teamIds[1]), m.winnerId === null ? ' · Empate' : ' · Ganó ', ...(m.winnerId === null ? [] : [nameNode(m.winnerId)]), ` · ${m.questions} preguntas`);
      list.append(item);
    });
    panel.append(list);
    const winners = [...new Set(view.matches.map(m => m.winnerId).filter(Boolean))];
    const winnerList = el('p', 'Equipos con victorias: ');
    winners.forEach((id, i) => { if (i) winnerList.append(', '); winnerList.append(nameNode(id)); });
    winnerList.append(winners.length ? '.' : 'Ninguno todavía.'); if (!view.manualRounds) panel.append(winnerList);
    panel.append(el('p', 'Registro temporal: se conserva mientras la aplicación esté abierta.', 'muted'));
    main.append(panel);
    if (['lobby', 'winner', 'exhausted'].includes(view.phase)) main.append(button('Reemplazar banco de preguntas del torneo', importQuestions, busy));
  }
}
