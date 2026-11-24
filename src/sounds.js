// Tonos locales: no necesitan archivos de audio ni conexión a internet.
const preferenceKey = 'maraton-sound-enabled';
const melodies = {
  click: [[0, 720, .045, .035]],
  correct: [[0, 523.25, .12, .09], [.12, 659.25, .12, .09], [.24, 783.99, .24, .09]],
  incorrect: [[0, 220, .17, .07], [.18, 146.83, .3, .07]],
  victory: [[0, 523.25, .16, .09], [.18, 659.25, .16, .09], [.36, 783.99, .16, .09], [.56, 1046.5, .55, .09]],
};

// Solo acciones confirmadas: deshacer, revelar o recargar no reproducen resultados.
export function soundForAction(previous, next, action) {
  if (action.type === 'answer') {
    const game = next?.kind === 'tournament' ? next.match : next;
    if (game?.feedback) return game.feedback.correct ? 'correct' : 'incorrect';
  }
  if (next?.kind === 'tournament') {
    if (action.type === 'confirm_winner' && next.winnerId != null && ['winner', 'champion'].includes(next.phase)) return 'victory';
  } else if (previous?.phase === 'playing' && next?.phase === 'finished' && next.teams[0].score !== next.teams[1].score) {
    return 'victory';
  }
  return null;
}

export function createSounds() {
  let enabled = true;
  let context;
  const voices = new Set();
  try { enabled = localStorage.getItem(preferenceKey) !== 'false'; } catch { /* Preferencia opcional. */ }

  function stop() {
    for (const voice of voices) {
      try { voice.stop(); } catch { /* El tono ya terminó. */ }
    }
    voices.clear();
  }

  async function play(type) {
    if (!enabled || !melodies[type]) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      context ||= new Audio();
      if (context.state === 'suspended') await context.resume();
      if (!enabled || context.state !== 'running') return;
      if (type !== 'click') stop();
      const now = context.currentTime;
      for (const [delay, frequency, duration, volume] of melodies[type]) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = now + delay;
        oscillator.type = type === 'incorrect' ? 'triangle' : 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(volume, start + .008);
        gain.gain.exponentialRampToValueAtTime(.001, start + duration);
        oscillator.connect(gain); gain.connect(context.destination);
        voices.add(oscillator);
        oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(start); oscillator.stop(start + duration + .02);
      }
    } catch { /* Un dispositivo sin audio no debe interrumpir la partida. */ }
  }

  return {
    get enabled() { return enabled; },
    play,
    stop,
    toggle() {
      enabled = !enabled;
      if (!enabled) stop();
      try { localStorage.setItem(preferenceKey, String(enabled)); } catch { /* Preferencia opcional. */ }
      if (enabled) void play('click');
    },
  };
}
