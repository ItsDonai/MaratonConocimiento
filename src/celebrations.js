import confetti from 'canvas-confetti';
import { takariVictory } from './takari.js';

// Se mantienen fuera del árbol que se reconstruye al actualizar el marcador.
let canvas;
let launch;
let timers = [];
let lastCorrect = '';
let lastWinner = '';
let lastIncorrect = '';
let feedbackSymbol;

export const animationPresets = [
  { id: 'correct', name: 'Confeti de acierto' },
  { id: 'incorrect', name: 'Respuesta incorrecta · ✕' },
  { id: 'winner', name: 'Takari con copa y fuegos artificiales' },
  { id: 'takari', name: 'Takari con copa y fuego' },
  { id: 'takari-sleeping', name: 'Takari durmiendo · espera' },
];

export function celebrationKeys(state) {
  if (!state) return { correct: '', incorrect: '', winner: '' };
  const tournament = state.kind === 'tournament';
  const game = tournament ? state.match : state;
  const question = game?.question || game?.questions?.[game.position];
  const playing = tournament ? state.phase === 'playing' : game?.phase === 'playing';
  const correct = playing && game?.feedback?.correct
    ? `${question?.id}:${game.position}:${game.feedback.team}` : '';
  const incorrect = playing && game?.feedback && !game.feedback.correct
    ? `${question?.id}:${game.position}:${game.feedback.team}:${game.attempts.length}` : '';
  let winner = '';
  if (tournament && state.winnerId != null && !state.waiting && ['winner', 'champion'].includes(state.phase)) {
    winner = `${state.phase}:${state.matches.length}:${state.winnerId}`;
  } else if (!tournament && game?.phase === 'finished' && game.teams[0].score !== game.teams[1].score) {
    winner = `match:${game.teams.map(t => `${t.name}:${t.score}`).join('|')}`;
  }
  return { correct, incorrect, winner };
}

export function stopCelebrations() {
  timers.forEach(clearTimeout); timers = [];
  launch?.reset();
  feedbackSymbol?.remove(); feedbackSymbol = null;
  document.querySelectorAll('.takari-victory.is-playing').forEach(node => node.classList.remove('is-playing'));
  document.querySelectorAll('.animation-preview .takari-sleeping.is-playing').forEach(node => node.classList.remove('is-playing'));
}

function showFeedbackSymbol(type, motion) {
  feedbackSymbol = document.createElement('div');
  feedbackSymbol.className = `feedback-symbol feedback-symbol-${type}`;
  feedbackSymbol.setAttribute('aria-hidden', 'true');
  const tile = document.createElement('div'); tile.className = 'feedback-symbol-tile';
  tile.textContent = type === 'correct' ? '✓' : '✕';
  feedbackSymbol.append(tile); document.body.append(feedbackSymbol);
  if (motion) tile.animate([
    { transform: 'scale(.55) rotate(-12deg)', opacity: 0 },
    { transform: 'scale(1.08) rotate(3deg)', opacity: 1, offset: .65 },
    { transform: 'scale(1) rotate(0)', opacity: 1 },
  ], { duration: 400, easing: 'ease-out' });
  const current = feedbackSymbol;
  timers.push(setTimeout(() => { current.remove(); if (feedbackSymbol === current) feedbackSymbol = null; }, 1100));
}

function fire(options) {
  if (!canvas) {
    canvas = document.createElement('canvas'); canvas.className = 'celebration-canvas';
    canvas.setAttribute('aria-hidden', 'true'); document.body.append(canvas);
    // Sin workers: funciona con la política de seguridad de Tauri tal como está.
    launch = confetti.create(canvas, { resize: true, disableForReducedMotion: true });
  }
  launch({ disableForReducedMotion: true, ...options });
}

export function updateCelebrations(state) {
  const keys = celebrationKeys(state);
  const changed = keys.correct !== lastCorrect || keys.incorrect !== lastIncorrect || keys.winner !== lastWinner;
  if (!changed) return;
  lastCorrect = keys.correct; lastIncorrect = keys.incorrect; lastWinner = keys.winner;
  playCelebration(keys.winner ? 'winner' : keys.correct ? 'correct' : keys.incorrect ? 'incorrect' : null);
}

export function playCelebration(type, target = document) {
  stopCelebrations();
  if (document.hidden) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (['correct', 'incorrect'].includes(type)) showFeedbackSymbol(type, !reduced);
  if (reduced) return;
  if (type === 'takari-sleeping') {
    target.querySelector('.takari-sleeping')?.classList.add('is-playing');
    return;
  }
  if (type === 'takari') {
    target.querySelector('.takari-victory:not([hidden])')?.classList.add('is-playing');
    return;
  }
  if (type === 'winner') {
    const colors = ['#ffcd55', '#fff1af', '#d7b2ff', '#ff95af', '#92b8ff'];
    [{ x: .24, y: .28 }, { x: .76, y: .3 }, { x: .5, y: .2 }, { x: .35, y: .4 }].forEach((origin, i) => {
      const burst = () => fire({ particleCount: 65, spread: 360, startVelocity: 27, gravity: .35, decay: .92, ticks: 100, scalar: .8, shapes: ['circle', 'star'], flat: true, colors, origin });
      if (i === 0) burst(); else timers.push(setTimeout(burst, i * 450));
    });
    target.querySelector('.winner-mascot')?.classList.add('is-playing');
  } else if (type === 'correct') {
    const options = { particleCount: 45, spread: 65, startVelocity: 32, ticks: 150, colors: ['#a875e8', '#ffcd55', '#ff95af', '#92b8ff', '#8cdda3'] };
    fire({ ...options, angle: 60, origin: { x: 0, y: .65 } });
    fire({ ...options, angle: 120, origin: { x: 1, y: .65 } });
    target.querySelector('.choice.correct')?.animate([{ transform: 'scale(.96)' }, { transform: 'scale(1.025)', offset: .6 }, { transform: 'scale(1)' }], { duration: 450, easing: 'ease-out' });
  }
}

export function winnerTrophy() {
  const node = takariVictory();
  node.classList.add('winner-mascot');
  return node;
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', stopCelebrations);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopCelebrations(); });
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => { if (event.matches) stopCelebrations(); });
}
