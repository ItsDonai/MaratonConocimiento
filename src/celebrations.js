import confetti from 'canvas-confetti';

// Se mantienen fuera del árbol que se reconstruye al actualizar el marcador.
let canvas;
let launch;
let timers = [];
let lastCorrect = '';
let lastWinner = '';

export const animationPresets = [
  { id: 'correct', name: 'Confeti de acierto' },
  { id: 'winner', name: 'Copa y fuegos artificiales' },
];

export function celebrationKeys(state) {
  if (!state) return { correct: '', winner: '' };
  const tournament = state.kind === 'tournament';
  const game = tournament ? state.match : state;
  const question = game?.question || game?.questions?.[game.position];
  const playing = tournament ? state.phase === 'playing' : game?.phase === 'playing';
  const correct = playing && game?.feedback?.correct
    ? `${question?.id}:${game.position}:${game.feedback.team}` : '';
  let winner = '';
  if (tournament && ['winner', 'champion'].includes(state.phase)) {
    winner = `${state.phase}:${state.matches.length}:${state.winnerId}`;
  } else if (!tournament && game?.phase === 'finished' && game.teams[0].score !== game.teams[1].score) {
    winner = `match:${game.teams.map(t => `${t.name}:${t.score}`).join('|')}`;
  }
  return { correct, winner };
}

export function stopCelebrations() {
  timers.forEach(clearTimeout); timers = [];
  launch?.reset();
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
  const changed = keys.correct !== lastCorrect || keys.winner !== lastWinner;
  if (!changed) return;
  lastCorrect = keys.correct; lastWinner = keys.winner;
  playCelebration(keys.winner ? 'winner' : keys.correct ? 'correct' : null);
}

export function playCelebration(type, target = document) {
  stopCelebrations();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden) return;
  if (type === 'winner') {
    const colors = ['#ffcd55', '#fff1af', '#d7b2ff', '#ff95af', '#92b8ff'];
    [{ x: .24, y: .28 }, { x: .76, y: .3 }, { x: .5, y: .2 }, { x: .35, y: .4 }].forEach((origin, i) => {
      const burst = () => fire({ particleCount: 65, spread: 360, startVelocity: 27, gravity: .35, decay: .92, ticks: 100, scalar: .8, shapes: ['circle', 'star'], flat: true, colors, origin });
      if (i === 0) burst(); else timers.push(setTimeout(burst, i * 450));
    });
    target.querySelector('.winner-trophy')?.animate([{ transform: 'scale(.7) rotate(-10deg)', opacity: .4 }, { transform: 'scale(1.08) rotate(4deg)', opacity: 1, offset: .65 }, { transform: 'scale(1) rotate(0)' }], { duration: 650, easing: 'ease-out' });
  } else if (type === 'correct') {
    const options = { particleCount: 45, spread: 65, startVelocity: 32, ticks: 150, colors: ['#a875e8', '#ffcd55', '#ff95af', '#92b8ff', '#8cdda3'] };
    fire({ ...options, angle: 60, origin: { x: 0, y: .65 } });
    fire({ ...options, angle: 120, origin: { x: 1, y: .65 } });
    target.querySelector('.choice.correct')?.animate([{ transform: 'scale(.96)' }, { transform: 'scale(1.025)', offset: .6 }, { transform: 'scale(1)' }], { duration: 450, easing: 'ease-out' });
  }
}

export function winnerTrophy() {
  const node = document.createElement('div'); node.className = 'winner-trophy';
  node.setAttribute('role', 'img'); node.setAttribute('aria-label', 'Copa del ganador'); node.textContent = '🏆';
  return node;
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', stopCelebrations);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopCelebrations(); });
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => { if (event.matches) stopCelebrations(); });
}
