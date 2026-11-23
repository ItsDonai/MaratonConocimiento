import './takari.css';
import { takariImageSource } from './takari-palette.js';

// Dos celdas cuadradas de 887×887, en una sola imagen de 1774×887.
const victorySheet = new URL('../assets/mascots/takari/takari-victory-sheet-v1.png', import.meta.url).href;
const sleepingImage = new URL('../assets/mascots/takari/takari-sleeping-v4.png', import.meta.url).href;

export function takariSleeping(playing = true) {
  const node = document.createElement('div');
  node.className = `takari-sleeping${playing ? ' is-playing' : ''}`;
  node.setAttribute('role', 'img'); node.setAttribute('aria-label', 'Takari duerme sentado mientras suben unas letras Z');
  const image = document.createElement('img'); image.src = sleepingImage; image.alt = ''; image.setAttribute('aria-hidden', 'true');
  takariImageSource(sleepingImage).then(source => { image.src = source; image.dataset.palette = 'takari-original'; }).catch(error => console.warn('No se pudo aplicar la paleta de Takari.', error));
  const letters = document.createElement('span'); letters.className = 'takari-sleep-zs'; letters.setAttribute('aria-hidden', 'true');
  const pixels = ['11111', '00001', '00010', '00100', '01000', '10000', '11111'].join('');
  for (let i = 0; i < 3; i++) {
    const z = document.createElement('span');
    for (const value of pixels) {
      const pixel = document.createElement('i');
      if (value === '1') pixel.className = 'z-pixel';
      z.append(pixel);
    }
    letters.append(z);
  }
  node.append(image, letters);
  return node;
}

export function takariWaiting(title = 'Esperando la partida…') {
  const panel = document.createElement('section'); panel.className = 'takari-waiting';
  const heading = document.createElement('h1'); heading.className = 'question'; heading.textContent = title;
  const description = document.createElement('p'); description.textContent = 'El conductor está preparando el siguiente encuentro.';
  panel.append(takariSleeping(), heading, description);
  return panel;
}

export function takariVictory() {
  const node = document.createElement('div');
  node.className = 'takari-victory';
  node.setAttribute('role', 'img');
  node.setAttribute('aria-label', 'Takari levanta una copa y lanza una pequeña llamarada');
  node.style.backgroundImage = `url("${victorySheet}")`;
  return node;
}
