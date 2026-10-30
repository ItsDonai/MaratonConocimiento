export function validateBank(bank) {
  if (!Array.isArray(bank) || !bank.length) throw new Error('El banco está vacío.');
  const ids = new Set();
  for (const q of bank) {
    if (ids.has(q.id) || !q.text || !Array.isArray(q.options) || q.options.length < 3 || q.options.length > 4 ||
        !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length ||
        q.options.some(o => !o.text || !o.image)) throw new Error('Revisa los identificadores, opciones e imágenes del banco.');
    ids.add(q.id);
  }
}

export function startGame(bank, names, mode, count, random = Math.random) {
  validateBank(bank);
  if (!['limited', 'free'].includes(mode)) throw new Error('Modo inválido.');
  if (mode === 'limited' && (!Number.isInteger(count) || count < 1 || count > bank.length)) throw new Error(`Elige entre 1 y ${bank.length} preguntas.`);
  const questions = structuredClone(bank);
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }
  return {
    phase: 'playing', mode,
    teams: [0, 1].map(i => ({ name: names[i]?.trim().slice(0, 40) || `Equipo ${i + 1}`, score: 0 })),
    questions: questions.slice(0, mode === 'free' ? bank.length : count),
    position: 0, activeTeam: null, attempts: [], resolved: false, revealed: false, feedback: null, history: [],
  };
}

export function act(state, action) {
  if (!state || state.phase !== 'playing') throw new Error('No hay una pregunta activa.');
  const next = structuredClone(state);
  const q = next.questions[next.position];
  switch (action.type) {
    case 'team':
      if (next.resolved || next.attempts.length) throw new Error('El equipo inicial ya no se puede cambiar en esta pregunta.');
      if (![0, 1].includes(action.team)) throw new Error('Equipo inválido.');
      next.activeTeam = action.team;
      break;
    case 'answer': {
      if (next.resolved || next.attempts.length >= 2 || next.activeTeam === null) throw new Error('Elige el equipo inicial o termina la pregunta actual.');
      if (!Number.isInteger(action.option) || !q.options[action.option] || next.attempts.some(a => a.option === action.option)) throw new Error('Esa respuesta no está disponible.');
      const correct = action.option === q.answer;
      const team = next.activeTeam;
      next.attempts.push({ team, option: action.option, correct });
      next.feedback = { correct, team };
      if (correct) { next.teams[team].score++; next.resolved = true; }
      else next.activeTeam = next.attempts.length === 2 ? null : 1 - team;
      break;
    }
    case 'reveal':
      if (next.resolved || next.attempts.length !== 2) throw new Error('La respuesta se puede revelar cuando ambos equipos fallan.');
      next.revealed = true; next.resolved = true;
      break;
    case 'undo':
      if (!next.history.length) throw new Error('No hay una acción para deshacer.');
      return { ...next.history.pop(), history: next.history };
    case 'next':
      if (!next.resolved && next.attempts.length !== 2) throw new Error('Primero termina los intentos de esta pregunta.');
      next.position++;
      if (next.position === next.questions.length) next.phase = 'finished';
      next.activeTeam = null; next.attempts = []; next.resolved = false; next.revealed = false; next.feedback = null;
      next.history = [];
      return next;
    default: throw new Error('Acción desconocida.');
  }
  const { history: _history, ...previous } = structuredClone(state);
  next.history.push(previous);
  return next;
}

// La pantalla pública recibe solo la pregunta actual y nunca la clave oculta.
export function publicState(state) {
  if (!state) return null;
  const q = state.questions[state.position];
  return {
    phase: state.phase, mode: state.mode, teams: state.teams, position: state.position,
    total: state.questions.length, activeTeam: state.activeTeam, attempts: state.attempts,
    resolved: state.resolved, revealed: state.revealed, feedback: state.feedback,
    question: q ? {
      id: q.id, text: q.text, category: q.category, options: q.options,
      ...(state.resolved ? { answer: q.answer, explanation: q.explanation } : {}),
    } : null,
  };
}
