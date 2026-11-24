import test from 'node:test';
import assert from 'node:assert/strict';
import { soundForAction } from './sounds.js';

test('aciertos y errores suenan solo al registrar una respuesta', () => {
  for (const correct of [true, false]) {
    const game = { feedback: { correct } };
    assert.equal(soundForAction(null, game, { type: 'answer' }), correct ? 'correct' : 'incorrect');
    assert.equal(soundForAction(null, { kind: 'tournament', match: game }, { type: 'answer' }), correct ? 'correct' : 'incorrect');
    for (const type of ['undo', 'reveal', 'team']) assert.equal(soundForAction(null, game, { type }), null);
  }
});

test('victoria individual al terminar, sin sonido en empate ni al volver a leer el resultado', () => {
  const previous = { phase: 'playing' };
  const next = { phase: 'finished', teams: [{ score: 2 }, { score: 1 }] };
  assert.equal(soundForAction(previous, next, { type: 'next' }), 'victory');
  assert.equal(soundForAction(next, next, { type: 'next' }), null);
  assert.equal(soundForAction(previous, { ...next, teams: [{ score: 1 }, { score: 1 }] }, { type: 'next' }), null);
});

test('torneo celebra solo la confirmación de un ganador, incluido el id cero', () => {
  for (const phase of ['winner', 'champion']) {
    const next = { kind: 'tournament', phase, winnerId: 0 };
    assert.equal(soundForAction(null, next, { type: 'confirm_winner' }), 'victory');
    assert.equal(soundForAction(null, next, { type: 'wait' }), null);
    assert.equal(soundForAction(null, { ...next, winnerId: null }, { type: 'confirm_winner' }), null);
  }
  assert.equal(soundForAction(null, { kind: 'tournament', phase: 'review', winnerId: 0 }, { type: 'next' }), null);
});
