import { startGame, act, publicState, validateBank } from './game.js';
import { getTeamLogo } from './team-logos.js';

export function startTournament(bank, teams) {
  validateBank(bank);
  if (teams.length < 2 || teams.length > 32) throw new Error('Registra entre 2 y 32 equipos.');
  const roster = teams.map((t, i) => ({ id: `team-${i + 1}`, name: t.name.trim().slice(0, 40), logo: getTeamLogo(t.logo)?.id || null }));
  if (roster.some(t => !t.name) || new Set(roster.map(t => t.name.toLowerCase())).size !== roster.length) throw new Error('Cada equipo necesita un nombre distinto.');
  return { kind: 'tournament', phase: 'lobby', roster, bank: structuredClone(bank), usedIds: [], matches: [], match: null, settings: null, winnerId: null, reason: null };
}

export function remainingQuestions(tournament) {
  const used = new Set(tournament.usedIds.map(String));
  return tournament.bank.filter(q => !used.has(String(q.id)));
}

export function extendTournamentBank(state, bank) {
  validateBank(bank);
  const next = structuredClone(state);
  const ids = new Set(next.bank.map(q => String(q.id)));
  for (const q of bank) if (!ids.has(String(q.id))) { next.bank.push(structuredClone(q)); ids.add(String(q.id)); }
  return next;
}

function scoresWinner(match) {
  const [a, b] = match.teams;
  return a.score === b.score ? null : a.score > b.score ? 0 : 1;
}

export function tournamentAct(state, action) {
  if (state?.kind !== 'tournament') throw new Error('No hay un torneo activo.');
  const next = structuredClone(state);
  if (action.type === 'close_match') {
    if (!['playing', 'exhausted'].includes(next.phase)) throw new Error('No hay un encuentro abierto para cerrar.');
    const winner = scoresWinner(next.match);
    if (winner === null) throw new Error('El encuentro está empatado. Continúa con preguntas de desempate.');
    next.phase = 'review'; next.winnerId = next.settings.teamIds[winner]; next.reason = 'closed';
    return next;
  }
  if (action.type === 'start_match') {
    if (!['lobby', 'winner'].includes(next.phase)) throw new Error('Primero termina y confirma el encuentro actual.');
    const teams = action.teamIds?.map(id => next.roster.find(t => t.id === id));
    if (teams?.length !== 2 || teams.some(t => !t) || teams[0].id === teams[1].id) throw new Error('Selecciona dos equipos diferentes.');
    if (action.final) {
      const winners = new Set(next.matches.map(m => m.winnerId));
      if (!teams.every(t => winners.has(t.id))) throw new Error('La final requiere dos equipos que hayan ganado un encuentro.');
    }
    const remaining = remainingQuestions(next);
    if (!remaining.length) throw new Error('No quedan preguntas nuevas. Importa más preguntas para continuar.');
    if (!['points', 'questions'].includes(action.mode) || !Number.isInteger(action.limit) || action.limit < 1 || action.limit > remaining.length) throw new Error(`El límite debe ser un entero entre 1 y ${remaining.length}.`);
    next.match = startGame(remaining, teams.map(t => t.name), 'free', 0, Math.random, teams.map(t => t.logo));
    next.settings = { teamIds: teams.map(t => t.id), mode: action.mode, limit: action.limit, final: !!action.final };
    next.usedIds.push(String(next.match.questions[0].id));
    next.phase = 'playing'; next.winnerId = null; next.reason = null;
    return next;
  }
  if (action.type === 'confirm_winner') {
    if (next.phase !== 'review' || next.winnerId === null) throw new Error('El encuentro aún no tiene un ganador para confirmar.');
    next.matches.push({ number: next.matches.length + 1, ...next.settings, scores: next.match.teams.map(t => t.score), winnerId: next.winnerId, questions: next.match.position + 1, reason: next.reason });
    next.phase = next.settings.final ? 'champion' : 'winner';
    return next;
  }
  if (action.type === 'reopen') {
    if (next.phase !== 'review') throw new Error('El resultado no puede corregirse después de confirmarlo.');
    next.phase = 'playing'; next.winnerId = null; next.reason = null;
    return next;
  }
  if (action.type === 'continue') {
    if (next.phase !== 'exhausted') throw new Error('No hay un encuentro pausado.');
    const fresh = remainingQuestions(next);
    if (!fresh.length) throw new Error('Importa preguntas con identificadores nuevos para continuar.');
    const shown = next.match.questions.slice(0, next.match.position + 1);
    next.match.questions = [...shown, ...startGame(fresh, ['', ''], 'free', 0).questions];
    next.match = act(next.match, { type: 'next' });
    next.usedIds.push(String(next.match.questions[next.match.position].id));
    next.phase = 'playing';
    return next;
  }
  if (next.phase !== 'playing') throw new Error('No hay una pregunta activa en este momento.');
  if (action.type !== 'next') {
    next.match = act(next.match, action);
    return next;
  }
  if (!next.match.resolved && next.match.attempts.length !== 2) throw new Error('Primero termina los intentos de esta pregunta.');
  const winner = scoresWinner(next.match);
  const count = next.match.position + 1;
  const reached = next.settings.mode === 'points'
    ? next.match.teams.some(t => t.score >= next.settings.limit)
    : count >= next.settings.limit;
  const exhausted = count === next.match.questions.length;
  if (winner !== null && (reached || exhausted)) {
    next.phase = 'review'; next.winnerId = next.settings.teamIds[winner];
    next.reason = reached ? 'limit' : 'exhausted';
  } else if (exhausted) {
    next.phase = 'exhausted'; next.reason = 'exhausted';
  } else {
    next.match = act(next.match, action);
    next.usedIds.push(String(next.match.questions[next.match.position].id));
  }
  return next;
}

export function publicTournament(state) {
  const match = state.match ? publicState(state.match) : null;
  if (match && state.phase !== 'playing') match.question = null;
  return {
    kind: state.kind, phase: state.phase, roster: state.roster, settings: state.settings,
    matches: state.matches, winnerId: state.winnerId, reason: state.reason,
    used: state.usedIds.length, remaining: remainingQuestions(state).length, match,
  };
}
