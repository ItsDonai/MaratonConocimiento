import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startGame, act, publicState } from './game.js';

const bank = JSON.parse(fs.readFileSync(new URL('./questions.json', import.meta.url)));
const start = (mode = 'limited', count = 2) => startGame(bank, ['Sol', 'Luna'], mode, count);
const choose = (s, team = 0) => act(s, { type: 'team', team });
const answer = (s, option) => act(s, { type: 'answer', option });
const wrong = s => s.questions[s.position].options.map((_, i) => i).filter(i => i !== s.questions[s.position].answer);

test('cantidad válida, ronda libre, banco sin repetidos e imágenes existentes', () => {
  assert.equal(start().questions.length, 2);
  const free = start('free');
  assert.equal(free.questions.length, bank.length);
  assert.equal(new Set(free.questions.map(q => q.id)).size, bank.length);
  assert.throws(() => start('limited', 0));
  assert.throws(() => start('limited', bank.length + 1));
  assert.throws(() => start('limited', 1.5));
  for (const q of bank) for (const option of q.options) assert.ok(fs.existsSync(`public${option.image}`));
});

test('el conductor elige equipo en cada pregunta y acierto entrega exactamente un punto', () => {
  let s = start();
  assert.throws(() => answer(s, 0));
  assert.throws(() => act(s, { type: 'next' }));
  s = choose(choose(s, 0), 1);
  s = answer(s, s.questions[0].answer);
  assert.deepEqual(s.teams.map(t => t.score), [0, 1]);
  assert.throws(() => answer(s, s.questions[0].answer));
  s = act(s, { type: 'next' });
  assert.equal(s.activeTeam, null);
  assert.equal(s.position, 1);
});

test('error pasa al otro equipo sin revelar; segundo equipo puede acertar', () => {
  let s = choose(start());
  s = answer(s, wrong(s)[0]);
  assert.equal(s.activeTeam, 1);
  assert.equal(publicState(s).question.answer, undefined);
  assert.throws(() => choose(s));
  assert.throws(() => answer(s, s.attempts[0].option));
  assert.throws(() => act(s, { type: 'next' }));
  s = answer(s, s.questions[0].answer);
  assert.deepEqual(s.teams.map(t => t.score), [0, 1]);
  assert.equal(publicState(s).question.answer, s.questions[0].answer);
});

test('dos errores permiten revelar sin puntos o avanzar sin revelar', () => {
  let s = choose(start());
  assert.throws(() => act(s, { type: 'reveal' }));
  const options = wrong(s);
  s = answer(s, options[0]); s = answer(s, options[1]);
  assert.equal(s.activeTeam, null);
  assert.equal(publicState(s).question.answer, undefined);
  assert.throws(() => answer(s, s.questions[0].answer));
  const revealed = act(s, { type: 'reveal' });
  assert.equal(revealed.revealed, true);
  assert.deepEqual(revealed.teams.map(t => t.score), [0, 0]);
  assert.equal(publicState(revealed).question.answer, s.questions[0].answer);
  assert.equal(act(s, { type: 'next' }).position, 1);
});

test('deshacer restaura puntuación, intento, turno y revelación', () => {
  let s = choose(start());
  const initial = structuredClone(s);
  s = answer(s, s.questions[0].answer);
  assert.deepEqual(act(s, { type: 'undo' }), initial);
  const options = wrong(initial);
  s = answer(initial, options[0]);
  assert.deepEqual(act(s, { type: 'undo' }), initial);
  s = answer(s, options[1]);
  const failed = structuredClone(s);
  s = act(s, { type: 'reveal' });
  assert.deepEqual(act(s, { type: 'undo' }), failed);
});

test('partida termina manualmente, conserva puntos y no permite más respuestas', () => {
  let s = choose(start('limited', 1), 1);
  s = answer(s, s.questions[0].answer);
  assert.equal(s.phase, 'playing');
  s = act(s, { type: 'next' });
  assert.equal(s.phase, 'finished');
  assert.equal(s.teams[1].score, 1);
  assert.equal(publicState(s).question, null);
  assert.throws(() => choose(s));
});

test('ronda libre recorre todo el banco una sola vez y sin filtrar claves al público', () => {
  let s = start('free');
  const seen = new Set();
  while (s.phase === 'playing') {
    const view = publicState(s);
    assert.equal(view.questions, undefined);
    assert.equal(view.history, undefined);
    assert.equal(view.question.answer, undefined);
    assert.equal(view.question.explanation, undefined);
    seen.add(view.question.id);
    s = choose(s, s.position % 2);
    s = answer(s, s.questions[s.position].answer);
    s = act(s, { type: 'next' });
  }
  assert.equal(seen.size, bank.length);
  assert.equal(s.teams.reduce((n,t) => n+t.score, 0), bank.length);
});
