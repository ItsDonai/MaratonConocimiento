import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startTournament, tournamentAct as act, publicTournament, remainingQuestions, extendTournamentBank } from './tournament.js';

const samples = JSON.parse(fs.readFileSync('src/questions.json', 'utf8'));
const bank = Array.from({ length: 20 }, (_, i) => ({ ...samples[i % samples.length], id: `q-${i}` }));
const teams = ['Uno', 'Dos', 'Tres', 'Cuatro'].map((name, i) => ({ name, logo: i % 2 ? 'diti' : 'dica' }));
const start = (data = bank) => startTournament(data, teams);
const match = (s, a = 0, b = 1, mode = 'questions', limit = 1, final = false) => act(s, { type: 'start_match', teamIds: [s.roster[a].id, s.roster[b].id], mode, limit, final });
const correct = (s, team = 0) => {
  s = act(s, { type: 'team', team });
  s = act(s, { type: 'answer', option: s.match.questions[s.match.position].answer });
  return act(s, { type: 'next' });
};
const failBoth = s => {
  s = act(s, { type: 'team', team: 0 });
  const wrong = s.match.questions[s.match.position].options.map((_, i) => i).filter(i => i !== s.match.questions[s.match.position].answer);
  for (const option of wrong.slice(0, 2)) s = act(s, { type: 'answer', option });
  return act(s, { type: 'next' });
};
const confirm = s => act(s, { type: 'confirm_winner' });

test('el torneo exige equipos distintos y límites válidos', () => {
  assert.throws(() => startTournament(bank, [{ name: 'A' }]));
  assert.throws(() => startTournament(bank, [{ name: 'A' }, { name: 'a' }]));
  assert.throws(() => match(start(), 0, 0));
  assert.throws(() => match(start(), 0, 1, 'points', 0));
  assert.throws(() => match(start(), 0, 1, 'questions', 21));
});

test('ganador se confirma una sola vez antes de habilitar el próximo encuentro', () => {
  let s = correct(match(start()));
  assert.equal(s.phase, 'review'); assert.equal(s.matches.length, 0);
  assert.throws(() => match(s, 2, 3));
  s = confirm(s);
  assert.equal(s.phase, 'winner'); assert.equal(s.matches.length, 1);
  assert.throws(() => confirm(s));
  s = match(s, 2, 3);
  assert.equal(s.phase, 'playing'); assert.deepEqual(s.match.teams.map(t => t.score), [0, 0]);
});

test('preguntas vistas nunca se repiten y las no mostradas siguen disponibles', () => {
  let s = start(); const seen = new Set();
  for (let i = 0; i < 6; i++) {
    s = match(s, i % 4, (i + 1) % 4);
    const q = s.match.questions[0]; assert.ok(!seen.has(q.id)); seen.add(q.id);
    s = confirm(correct(s));
  }
  assert.equal(s.usedIds.length, 6);
  assert.equal(new Set(s.usedIds).size, 6);
  assert.equal(remainingQuestions(s).length, 14);
});

test('límite de preguntas empatado continúa hasta desempatar', () => {
  let s = match(start(), 0, 1, 'questions', 2);
  s = correct(s, 0); s = correct(s, 1);
  assert.equal(s.phase, 'playing'); assert.equal(s.match.position, 2);
  s = failBoth(s); assert.equal(s.phase, 'playing');
  s = correct(s, 1);
  assert.equal(s.phase, 'review'); assert.equal(s.winnerId, s.roster[1].id);
  s = confirm(s); assert.equal(s.matches[0].questions, 4);
});

test('meta de puntos cuenta aciertos y solo cierra al alcanzar la meta', () => {
  let s = match(start(), 0, 1, 'points', 2);
  s = correct(s, 0); assert.equal(s.phase, 'playing');
  s = failBoth(s); assert.equal(s.phase, 'playing');
  s = correct(s, 0); assert.equal(s.phase, 'review');
  assert.deepEqual(s.match.teams.map(t => t.score), [2, 0]);
});

test('administrador puede volver a enfrentar a un equipo que perdió', () => {
  let s = confirm(correct(match(start()), 0));
  s = confirm(correct(match(s, 2, 3), 1));
  s = match(s, 1, 3);
  assert.deepEqual(s.settings.teamIds, [s.roster[1].id, s.roster[3].id]);
});

test('final exige dos ganadores previos y termina con un campeón', () => {
  assert.throws(() => match(start(), 0, 1, 'questions', 1, true));
  let s = confirm(correct(match(start()), 0));
  s = confirm(correct(match(s, 2, 3), 1));
  assert.throws(() => match(s, 0, 2, 'questions', 1, true));
  s = confirm(correct(match(s, 0, 3, 'points', 1, true), 1));
  assert.equal(s.phase, 'champion'); assert.equal(s.winnerId, s.roster[3].id);
  assert.equal(s.matches.length, 3); assert.equal(s.matches[2].final, true);
  assert.throws(() => match(s));
});

test('agotamiento con empate pausa y admite nuevas preguntas sin reutilizar ids', () => {
  let s = match(start(bank.slice(0, 2)), 0, 1, 'points', 2);
  s = correct(s, 0); s = correct(s, 1);
  assert.equal(s.phase, 'exhausted'); assert.equal(s.winnerId, null);
  assert.throws(() => act(s, { type: 'continue' }));
  s = extendTournamentBank(s, bank.slice(0, 4));
  s = act(s, { type: 'continue' });
  assert.equal(s.phase, 'playing'); assert.equal(s.usedIds.length, 3);
  assert.equal(new Set(s.usedIds).size, 3);
  s = confirm(correct(s)); assert.equal(s.matches[0].scores[0], 2);
});

test('al agotarse el banco gana quien tenga más puntos aunque no llegue a la meta', () => {
  let s = match(start(bank.slice(0, 2)), 0, 1, 'points', 2);
  s = correct(s, 1); s = failBoth(s);
  assert.equal(s.phase, 'review'); assert.equal(s.reason, 'exhausted');
  assert.equal(s.winnerId, s.roster[1].id);
  s = confirm(s); assert.deepEqual(s.matches[0].scores, [0, 1]);
});

test('cierre manual elige al líder y no permite declarar ganador en empate', () => {
  let s = match(start(), 0, 1, 'points', 5);
  assert.throws(() => act(s, { type: 'close_match' }));
  s = correct(s, 0);
  s = act(s, { type: 'close_match' });
  assert.equal(s.phase, 'review'); assert.equal(s.winnerId, s.roster[0].id);
  assert.equal(s.reason, 'closed');
  s = confirm(s); assert.equal(s.matches.length, 1);
  assert.throws(() => act(s, { type: 'close_match' }));
});

test('corrección antes de confirmar restaura el punto sin liberar preguntas vistas', () => {
  let s = correct(match(start()));
  s = act(s, { type: 'reopen' }); s = act(s, { type: 'undo' });
  assert.deepEqual(s.match.teams.map(t => t.score), [0, 0]);
  assert.equal(s.usedIds.length, 1); assert.equal(s.matches.length, 0);
  const publicView = publicTournament(s);
  assert.equal(publicView.bank, undefined); assert.equal(publicView.match.questions, undefined);
  assert.equal(publicView.match.question.answer, undefined);
  assert.equal(publicView.match.teams[0].logo, 'dica');
});
