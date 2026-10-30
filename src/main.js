import './style.css';
import './participants.css';
import './conductor.css';
import './themes.css';
import bank from './questions.json';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { act, startGame, publicState, validateBank } from './game.js';
import { mountImporter } from './import-view.js';
import { teamLogos, getTeamLogo, applyTeamColor, teamNameElement } from './team-logos.js';
import { mountLogoSettings } from './system-logo.js';
import { startTournament, tournamentAct, publicTournament, extendTournamentBank } from './tournament.js';
import { mountTournamentSetup, renderTournament } from './tournament-view.js';
import { applyTheme, normalizeTheme, mountThemeSettings } from './themes.js';

const encounterLogo = new URL('../logos/LOGO ENCUENTRO.png', import.meta.url).href;
let systemLogo = encounterLogo;
let configuringLogo = false;
let configuringTheme = false;
let currentTheme = 'classic';
let lastCelebration = '';
async function refreshTheme() {
  const saved = isTauri() ? await invoke('get_theme') : localStorage.getItem('maraton-theme');
  const next = normalizeTheme(saved);
  const changed = next !== currentTheme;
  currentTheme = next; applyTheme(next);
  return changed;
}
const logoStorageKey = 'maraton-system-logo';

async function refreshSystemLogo() {
  const saved = isTauri() ? await invoke('get_system_logo') : localStorage.getItem(logoStorageKey);
  const next = saved || encounterLogo;
  const changed = next !== systemLogo;
  systemLogo = next;
  return changed;
}

const audience = new URLSearchParams(location.search).get('view') === 'participants';
document.body.classList.add(audience ? 'participants' : 'conductor');
const app = document.querySelector('#app');
const key = 'maraton-session-v2';
let state = null;
let busy = false;
let message = '';
let lastPublic = '';
let availableBank = bank;
let importing = false;
let configuringTournament = false;
const displayState = value => value?.kind === 'tournament' ? publicTournament(value) : publicState(value);

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
  const logo = el('img', undefined, 'encounter-logo');
  logo.src = systemLogo;
  logo.alt = 'Logo del sistema';
  header.append(logo, el('strong', 'Maratón del Conocimiento'), el('span', audience ? 'Participantes' : 'Control del conductor', 'mode'));
  const main = el('main');
  if (message) { const alert = el('p', message, 'error'); alert.setAttribute('role', 'alert'); main.append(alert); }
  app.append(header, main);
  return main;
}
async function readState() {
  if (isTauri()) return invoke('get_game_state');
  const value = JSON.parse(localStorage.getItem(key) || 'null');
  return audience ? displayState(value) : value;
}
async function writeState(next) {
  if (isTauri()) await invoke('set_game_state', { snapshot: next, display: displayState(next) });
  else localStorage.setItem(key, JSON.stringify(next));
  state = next;
}
async function change(action) {
  if (busy) return;
  busy = true; message = ''; render();
  try { await writeState(state?.kind === 'tournament' ? tournamentAct(state, action) : act(state, action)); }
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
  input.setAttribute('aria-label', label);
  const node = el('label', undefined, 'field'); node.append(el('span', label), input); return node;
}
function setup(main) {
  const actions = el('nav', undefined, 'home-actions');
  actions.setAttribute('aria-label', 'Acciones de inicio');
  actions.append(button('Abrir pantalla de participantes', openAudience));
  actions.append(button('Crear torneo de varios equipos', () => { configuringTournament = true; render(); }));
  actions.append(button('Configurar logo del sistema', () => { configuringLogo = true; render(); }));
  actions.append(button('Configurar tema', () => { configuringTheme = true; render(); }));
  if (isTauri()) actions.append(button('Importar preguntas desde CSV', () => { importing = true; render(); }));
  main.append(actions);
  main.append(el('p', `Banco disponible: ${availableBank.length} preguntas.`, 'muted'));
  if (!isTauri()) main.append(el('p', 'La importación con SQLite está disponible en la aplicación de escritorio.', 'muted'));
  main.append(el('h1', 'Configurar partida', 'question'));
  const form = el('form', undefined, 'card');
  const logos = [];
  const names = [0, 1].map(i => {
    const input = el('input'); input.value = `Equipo ${i + 1}`; input.maxLength = 40; input.required = true;
    form.append(labeled(`Nombre del equipo ${i + 1}`, input));
    const select = el('select');
    const none = el('option', 'Sin logo'); none.value = ''; select.append(none);
    teamLogos.forEach(logo => { const option = el('option', logo.name); option.value = logo.id; select.append(option); });
    const preview = el('img', undefined, 'team-logo-preview'); preview.hidden = true;
    select.addEventListener('change', () => {
      const logo = getTeamLogo(select.value);
      applyTeamColor(input, select.value);
      preview.hidden = !logo;
      if (logo) { preview.src = logo.image; preview.alt = `Logo ${logo.name}`; }
      else { preview.removeAttribute('src'); preview.alt = ''; }
    });
    logos.push(select);
    form.append(labeled(`Logo del equipo ${i + 1}`, select), preview);
    return input;
  });
  const mode = el('select');
  for (const [value, label] of [['limited', 'Número de preguntas'], ['free', 'Ronda libre: todo el banco']]) {
    const option = el('option', label); option.value = value; mode.append(option);
  }
  const count = el('input'); count.type = 'number'; count.min = '1'; count.max = String(availableBank.length); count.value = String(availableBank.length); count.required = true;
  mode.addEventListener('change', () => { count.disabled = mode.value === 'free'; });
  form.append(labeled('Modalidad', mode), labeled(`Cantidad (1 a ${availableBank.length})`, count));
  form.append(el('p', 'En cada pregunta debes elegir qué equipo comienza. Las preguntas no se repiten durante la partida.', 'muted'));
  const submit = el('button', 'Iniciar partida', 'primary'); submit.type = 'submit'; submit.disabled = busy;
  form.append(submit);
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    busy = true; submit.disabled = true;
    try {
      const questions = isTauri() ? await invoke('get_questions') : availableBank;
      await writeState(startGame(questions, names.map(n => n.value), mode.value, Number(count.value), undefined, logos.map(logo => logo.value)));
      message = '';
    } catch (error) { message = String(error.message || error); }
    finally { busy = false; render(); }
  });
  main.append(form);
}
function scoreboard(main, game) {
  const row = el('div', undefined, 'scoreboard');
  game.teams.forEach((team, i) => {
    const card = el('div', undefined, 'card team-score');
    const logo = getTeamLogo(team.logo);
    if (logo) card.style.setProperty('--team-color', `var(--team-color-${logo.id}, ${logo.color})`);
    if (logo) {
      const image = el('img', undefined, 'team-logo'); image.src = logo.image; image.alt = `Logo ${logo.name}`;
      card.append(image);
    }
    const label = el('span');
    label.append(teamNameElement(team), `: ${team.score} punto${team.score === 1 ? '' : 's'}${game.activeTeam === i && !game.resolved ? ' · Turno actual' : ''}`);
    card.append(label);
    row.append(card);
  });
  main.append(row);
}
function question(main, game) {
  const q = game.question;
  const meta = game.tournament;
  main.append(el('p', meta
    ? `${meta.final ? 'Final' : `Encuentro ${meta.number}`} · ${meta.mode === 'points' ? `Meta: ${meta.limit} puntos` : `Límite: ${meta.limit} preguntas`} · Pregunta ${game.position + 1}${meta.mode === 'questions' && game.position >= meta.limit ? ' · Desempate' : ''}`
    : `${game.mode === 'free' ? 'Ronda libre' : 'Partida'} · Pregunta ${game.position + 1} de ${game.total}`, 'muted'));
  if (!audience) {
    const controls = el('section', undefined, 'card');
    controls.append(el('h2', '¿Qué equipo comienza?'));
    game.teams.forEach((team, i) => {
      const choice = button('', () => change({ type: 'team', team: i }), game.attempts.length > 0 || game.resolved, game.activeTeam === i ? 'primary' : 'choice');
      choice.append(teamNameElement(team)); controls.append(choice);
    });
    controls.append(el('p', 'Puedes cambiar el equipo inicial antes del primer intento. Un error pasa el turno automáticamente.', 'muted'));
    main.append(controls);
  }
  const card = el('section', undefined, 'card question-card');
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
  else if (game.feedback?.correct) {
    const text = el('strong'); text.append('✓ ¡Correcto! Un punto para ', teamNameElement(game.teams[game.feedback.team]), '.'); feedback.append(text);
  } else if (game.feedback) {
    const text = el('strong');
    if (game.attempts.length === 2) text.textContent = '✕ Ambos equipos fallaron. Sin puntos en esta pregunta.';
    else text.append('✕ Respuesta incorrecta. Turno de ', teamNameElement(game.teams[game.activeTeam]), '.');
    feedback.append(text);
  } else {
    const text = el('p');
    if (game.activeTeam === null) text.textContent = 'Esperando a que el conductor elija el equipo inicial.';
    else text.append('Responde ', teamNameElement(game.teams[game.activeTeam]), '.');
    feedback.append(text);
  }
  if (game.resolved) feedback.append(el('p', q.explanation));
  card.append(feedback); main.append(card);
  if (!audience) {
    const controls = el('section', undefined, 'card');
    const currentMatch = state.kind === 'tournament' ? state.match : state;
    const current = currentMatch.questions[currentMatch.position];
    controls.append(el('p', `Solo conductor · Correcta: ${String.fromCharCode(65 + current.answer)}. ${current.options[current.answer].text}`));
    controls.append(button('Deshacer última acción', () => change({ type: 'undo' }), !currentMatch.history.length));
    controls.append(button('Revelar respuesta correcta', () => change({ type: 'reveal' }), game.resolved || game.attempts.length !== 2));
    controls.append(button(meta ? 'Cerrar pregunta y continuar' : game.position + 1 === game.total ? 'Finalizar y ver resultado' : 'Siguiente pregunta', () => change({ type: 'next' }), !game.resolved && game.attempts.length !== 2));
    if (meta) {
      controls.append(button('Cerrar enfrentamiento', () => change({ type: 'close_match' }), game.teams[0].score === game.teams[1].score));
      controls.append(el('p', 'Al cerrar el enfrentamiento gana quien tenga más puntos. Si hay empate, continúa el desempate.', 'muted'));
    }
    controls.append(el('p', 'Puedes avanzar después de un acierto o de dos errores. Revelar es opcional. El avance siempre es manual.', 'muted'));
    main.append(controls);
  }
}
function render() {
  renderScreen();
  const game = state?.kind === 'tournament' ? state.match : state;
  const q = game?.question || game?.questions?.[game.position];
  const signature = game?.feedback?.correct ? `${q?.id}:${game.position}:${game.feedback.team}` : '';
  if (signature && signature !== lastCelebration && currentTheme === 'pop' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelector('.choice.correct')?.animate([{ transform: 'scale(.96)' }, { transform: 'scale(1.025)', offset: .6 }, { transform: 'scale(1)' }], { duration: 450, easing: 'ease-out' });
  }
  lastCelebration = signature;
}
function renderScreen() {
  const main = shell();
  if (!audience && configuringTheme) {
    mountThemeSettings(main, {
      current: currentTheme,
      back: () => { configuringTheme = false; render(); },
      save: async theme => {
        if (isTauri()) await invoke('set_theme', { theme });
        else localStorage.setItem('maraton-theme', theme);
        currentTheme = theme; applyTheme(theme); configuringTheme = false;
        message = 'Tema guardado.'; render();
      },
    });
    return;
  }
  if (!audience && configuringTournament) {
    mountTournamentSetup(main, {
      count: availableBank.length,
      back: () => { configuringTournament = false; render(); },
      create: async teams => {
        const questions = isTauri() ? await invoke('get_questions') : availableBank;
        await writeState(startTournament(questions, teams));
        configuringTournament = false; message = ''; render();
      },
    });
    return;
  }
  if (!audience && configuringLogo) {
    mountLogoSettings(main, {
      current: systemLogo, defaultLogo: encounterLogo,
      back: () => { configuringLogo = false; render(); },
      save: async image => {
        if (isTauri()) await invoke('set_system_logo', { image });
        else if (image) localStorage.setItem(logoStorageKey, image);
        else localStorage.removeItem(logoStorageKey);
        systemLogo = image || encounterLogo;
        configuringLogo = false; message = 'Logo del sistema guardado.'; render();
      },
    });
    return;
  }
  if (!audience && importing) {
    mountImporter(main, {
      current: availableBank,
      back: () => { importing = false; message = ''; render(); },
      save: async questions => {
        await invoke('import_questions', { questions });
        const updated = new Map(availableBank.map(q => [String(q.id), q]));
        questions.forEach(q => updated.set(String(q.id), q));
        availableBank = [...updated.values()];
        if (state?.kind === 'tournament') await writeState(extendTournamentBank(state, availableBank));
        importing = false;
        message = `Importación guardada. Banco disponible: ${availableBank.length} preguntas.`;
        render();
      },
    });
    return;
  }
  if (!audience && state) main.append(button('Abrir pantalla de participantes', openAudience));
  if (!state) {
    if (audience) main.append(el('h1', 'Esperando la partida…', 'question'));
    else setup(main);
    return;
  }
  if (state.kind === 'tournament') {
    renderTournament(main, audience ? state : publicTournament(state), {
      audience, scoreboard, question, change, busy,
      importQuestions: () => {
        if (!isTauri()) { message = 'Importa preguntas desde la aplicación de escritorio.'; render(); return; }
        importing = true; render();
      },
    });
    if (!audience) main.append(button('Salir del torneo', async () => {
      if (!window.confirm('¿Salir del torneo? Se borrarán sus resultados temporales y el control de preguntas usadas.')) return;
      busy = true;
      try { await writeState(null); message = ''; }
      catch (error) { message = String(error); }
      finally { busy = false; render(); }
    }));
    return;
  }
  const game = audience ? state : publicState(state);
  main.classList.add(game.phase === 'playing' ? 'playing' : 'finished');
  scoreboard(main, game);
  if (game.phase === 'finished') {
    const [a, b] = game.teams;
    const title = el('h1', undefined, 'question');
    if (a.score === b.score) title.textContent = '¡Empate!';
    else title.append('¡Ganó ', teamNameElement(a.score > b.score ? a : b), '!');
    main.append(title);
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
    await refreshTheme();
    await refreshSystemLogo();
    if (!audience && isTauri()) availableBank = await invoke('get_questions');
    validateBank(availableBank);
    state = await readState(); render();
    if (audience) {
      let lastLogoCheck = Date.now();
      // Recupera también la partida al reabrir la ventana pública.
      const poll = async () => {
        try {
          const next = await readState(); const serialized = JSON.stringify(next);
          let logoChanged = false;
          if (Date.now() - lastLogoCheck >= 2000) { logoChanged = await refreshSystemLogo(); logoChanged = await refreshTheme() || logoChanged; lastLogoCheck = Date.now(); }
          if (serialized !== lastPublic || message || logoChanged) { state = next; lastPublic = serialized; message = ''; render(); }
        } catch { message = 'Se perdió la conexión con el conductor. Reintentando…'; render(); }
        setTimeout(poll, 350);
      };
      poll();
    }
  } catch (error) { message = `No se pudo cargar la partida: ${error.message || error}`; shell().append(button('Reintentar', boot)); }
}
boot();

// La ventana pública se puede proyectar sin bordes; Escape siempre permite salir.
if (audience) {
  window.addEventListener('keydown', async event => {
    if (event.key !== 'F11' && event.key !== 'Escape') return;
    event.preventDefault();
    try {
      if (isTauri()) await invoke('participants_fullscreen', { exit: event.key === 'Escape' });
      else if (event.key === 'Escape' || document.fullscreenElement) {
        if (document.fullscreenElement) await document.exitFullscreen();
      } else await document.documentElement.requestFullscreen();
    } catch (error) { message = `No se pudo cambiar la pantalla completa: ${error}`; render(); }
  });
}
