import test from 'node:test';
import assert from 'node:assert/strict';
import { applyTakariPalette, takariColors } from './takari-palette.js';

test('bordes oscuros rojizos se representan como negro puro', () => {
  assert.deepEqual([...applyTakariPalette(new Uint8ClampedArray([18, 0, 10, 255, 5, 3, 4, 255]))], [0, 0, 0, 255, 0, 0, 0, 255]);
});
test('los colores de referencia se conservan sin alteraciones', () => {
  for (const hex of takariColors) {
    const rgba = [...[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)), 255];
    assert.deepEqual([...applyTakariPalette(new Uint8ClampedArray(rgba))], rgba);
  }
});
test('el render usa solo la paleta y transparencia binaria, sin halos de color', () => {
  const pixels = new Uint8ClampedArray([110, 8, 30, 10, 240, 199, 65, 255, 0, 90, 74, 180]);
  const output = applyTakariPalette(pixels);
  assert.deepEqual([...output.slice(0, 4)], [0, 0, 0, 0]);
  for (let i = 4; i < output.length; i += 4) {
    const hex = '#' + [...output.slice(i, i + 3)].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
    assert.ok(takariColors.includes(hex)); assert.equal(output[i + 3], 255);
  }
});
test('el borde de la silueta queda negro aunque el píxel fuente tuviera color', () => {
  const pixels = new Uint8ClampedArray(3 * 3 * 4);
  pixels.set([221, 168, 20, 255], 4 * 4);
  applyTakariPalette(pixels, 3, 3);
  assert.deepEqual([...pixels.slice(16, 20)], [0, 0, 0, 255]);
});
