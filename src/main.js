import './style.css';
import bank from './questions.json';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { act, startGame, publicState, validateBank } from './game.js';

const audience = new URLSearchParams(location.search).get('view') === 'participants';
document.body.classList.add(audience ? 'participants' : 'conductor');
const app = document.querySelector('#app');
const key = 'maraton-session-v2';
let state = null;
let busy = false;
let message = '';
let lastPublic = '';

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(text, action, disabled = false, className = 'primary') {
  const node = el('button', text, className);
  node.disabled = disabled || busy;
  node.addEventListener('click', action);
  return node;
}
function shell() {
  app.replaceChildren();
  const header = el('header');
  header.append(el('strong', 'Maratón del Conocimiento'), el('span', audience ? 'Participantes' : 'Control del conductor', 'mode'));
  const main = el('main');
  if (message) { const alert = el('p', message, 'error'); alert.setAttribute('role', 'alert'); main.append(alert); }
  app.append(header, main);
  return main;
}
async function readState() {
  if (isTauri()) return invoke('get_game_state');
  const value = JSON.parse(localStorage.getItem(key) || 'null');
  return audience ? publicState(value) : value;
}
async function writeState(next) {
  if (isTauri()) await invoke('set_game_state', { snapshot: next, display: publicState(next) });
  else localStorage.setItem(key, JSON.stringify(next));
  state = next;
}
async function change(action) {
  if (busy) return;
  busy = true; message = ''; render();
  try { await writeState(act(state, action)); }
  catch (error) { message = String(error.message || error); }
  finally { busy = false; render(); }
}
async function openAudience() {
  try {
    if (isTauri()) await invoke('open_participants');
    else window.open(`${location.origin}/?view=participants`, 'maraton-participantes');
  } catch (error) { message = `No se pudo abrir la pantalla: ${error}`; render(); }
}
function labeled(label, input) {
  const node = el('label', undefined, 'field'); node.append(el('span', label), input); return node;
}
function setup(main) {
  main.append(el('h1', 'Configurar partida', 'question'));
  const form = el('form', undefined, 'card');
  const names = [0, 1].map(i => {
    const input = el('input'); input.value = `Equipo ${i + 1}`; input.maxLength = 40; input.required = true;
    form.append(labeled(`Nombre del equipo ${i + 1}`, input)); return input;
  });
  const mode = el('select');
  for (const [value, label] of [['limited', 'Número de preguntas'], ['free', 'Ronda libre: todo el banco']]) {
    const option = el('option', label); option.value = value; mode.append(option);
  }
  const count = el('input'); count.type = 'number'; count.min = '1'; count.max = String(bank.length); count.value = String(bank.length); count.required = true;
  mode.addEventListener('change', () => { count.disabled = mode.value === 'free'; });
  form.append(labeled('Modalidad', mode), labeled(`Cantidad (1 a ${bank.length})`, count));
  form.append(el('p', 'En cada pregunta debes elegir qué equipo comienza. Las preguntas no se repiten durante la partida.', 'muted'));
  const submit = el('button', 'Iniciar partida', 'primary'); submit.type = 'submit'; submit.disabled = busy;
  form.append(submit);
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    busy = true; submit.disabled = true;
    try {
      const questions = isTauri() ? await invoke('get_questions') : bank;
      await writeState(startGame(questions, names.map(n => n.value), mode.value, Number(count.value)));
      message = '';
    } catch (error) { message = String(error.message || error); }
    finally { busy = false; render(); }
  });
  main.append(form);
}
function scoreboard(main, game) {
  const row = el('div', undefined, 'scoreboard');
  game.teams.forEach((team, i) => row.append(el('div', `${team.name}: ${team.score} punto${team.score === 1 ? '' : 's'}${game.activeTeam === i && !game.resolved ? ' · Turno actual' : ''}`, 'card')));
  main.append(row);
}
function question(main, game) {
  const q = game.question;
  main.append(el('p', `${game.mode === 'free' ? 'Ronda libre' : 'Partida'} · Pregunta ${game.position + 1} de ${game.total}`, 'muted'));
  if (!audience) {
    const controls = el('section', undefined, 'card');
    controls.append(el('h2', '¿Qué equipo comienza?'));
    game.teams.forEach((team, i) => controls.append(button(team.name, () => change({ type: 'team', team: i }), game.attempts.length > 0 || game.resolved, game.activeTeam === i ? 'primary' : 'choice')));
    controls.append(el('p', 'Puedes cambiar el equipo inicial antes del primer intento. Un error pasa el turno automáticamente.', 'muted'));
    main.append(controls);
  }
  const card = el('section', undefined, 'card');
  card.append(el('p', q.category, 'eyebrow'), el('h1', q.text, 'question'));
  const options = el('div', undefined, 'choices option-grid');
  q.options.forEach((option, i) => {
    const wrong = game.attempts.some(a => a.option === i && !a.correct);
    const correct = game.resolved && q.answer === i;
    const node = audience ? el('div', undefined, 'choice') : button('', () => change({ type: 'answer', option: i }), game.activeTeam === null || game.resolved || game.attempts.length >= 2 || wrong, 'choice');
    const image = el('img'); image.src = option.image; image.alt = option.text;
    image.addEventListener('error', () => { image.hidden = true; });
    node.append(image, el('span', `${String.fromCharCode(65 + i)}. ${option.text}${wrong ? ' · Incorrecta ✕' : ''}${correct ? ' · Correcta ✓' : ''}`));
    if (wrong) node.classList.add('incorrect');
    if (correct) node.classList.add('correct');
    options.append(node);
  });
  card.append(options);
  const feedback = el('div', undefined, 'feedback'); feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
  if (game.revealed) feedback.append(el('strong', 'Respuesta correcta revelada. No se asignan puntos.'));
  else if (game.feedback?.correct) feedback.append(el('strong', `✓ ¡Correcto! Un punto para ${game.teams[game.feedback.team].name}.`));
  else if (game.feedback) feedback.append(el('strong', game.attempts.length === 2 ? '✕ Ambos equipos fallaron. Sin puntos en esta pregunta.' : `✕ Respuesta incorrecta. Turno de ${game.teams[game.activeTeam].name}.`));
  else feedback.append(el('p', game.activeTeam === null ? 'Esperando a que el conductor elija el equipo inicial.' : `Responde ${game.teams[game.activeTeam].name}.`));
  if (game.resolved) feedback.append(el('p', q.explanation));
  card.append(feedback); main.append(card);
  if (!audience) {
    const controls = el('section', undefined, 'card');
    const current = state.questions[state.position];
    controls.append(el('p', `Solo conductor · Correcta: ${String.fromCharCode(65 + current.answer)}. ${current.options[current.answer].text}`));
    controls.append(button('Deshacer última acción', () => change({ type: 'undo' }), !state.history.length));
    controls.append(button('Revelar respuesta correcta', () => change({ type: 'reveal' }), game.resolved || game.attempts.length !== 2));
    controls.append(button(game.position + 1 === game.total ? 'Finalizar y ver resultado' : 'Siguiente pregunta', () => change({ type: 'next' }), !game.resolved && game.attempts.length !== 2));
    controls.append(el('p', 'Puedes avanzar después de un acierto o de dos errores. Revelar es opcional. El avance siempre es manual.', 'muted'));
    main.append(controls);
  }
}
function render() {
  const main = shell();
  if (!audience) main.append(button('Abrir pantalla de participantes', openAudience));
  if (!state) {
    if (audience) main.append(el('h1', 'Esperando la partida…', 'question'));
    else setup(main);
    return;
  }
  const game = audience ? state : publicState(state);
  scoreboard(main, game);
  if (game.phase === 'finished') {
    const [a, b] = game.teams;
    main.append(el('h1', a.score === b.score ? '¡Empate!' : `¡Ganó ${a.score > b.score ? a.name : b.name}!`, 'question'));
    main.append(el('p', `Partida terminada · ${game.total} preguntas.`));
  } else question(main, game);
  if (!audience) main.append(button('Nueva partida', async () => {
    if (!window.confirm('¿Volver a la configuración? Se borrará el marcador actual.')) return;
    busy = true;
    try { await writeState(null); message = ''; }
    catch (error) { message = String(error); }
    finally { busy = false; render(); }
  }));
}

async function boot() {
  try {
    validateBank(bank);
    state = await readState(); render();
    if (audience) {
      // Recupera también la partida al reabrir la ventana pública.
      const poll = async () => {
        try {
          const next = await readState(); const serialized = JSON.stringify(next);
          if (serialized !== lastPublic || message) { state = next; lastPublic = serialized; message = ''; render(); }
        } catch { message = 'Se perdió la conexión con el conductor. Reintentando…'; render(); }
        setTimeout(poll, 350);
      };
      poll();
    }
  } catch (error) { message = `No se pudo cargar la partida: ${error.message || error}`; shell().append(button('Reintentar', boot)); }
}
boot();
