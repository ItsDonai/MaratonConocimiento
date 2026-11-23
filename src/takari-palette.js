import reference from '../assets/mascots/takari/palette.json' with { type: 'json' };

export const takariColors = [reference.outline, reference.white,
  ...Object.values(reference.skin), ...Object.values(reference.bellyAndWingMembranes),
  ...Object.values(reference.polo), ...Object.values(reference.horns)];
const rgb = takariColors.map(hex => [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16)));

// Normalización del render: las imágenes generadas no siempre respetan los HEX.
// Sin desenfoque ni colores semitransparentes en el borde del pixel art.
export function applyTakariPalette(pixels, width, height) {
  const mapped = new Map();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) { pixels[i] = pixels[i + 1] = pixels[i + 2] = pixels[i + 3] = 0; continue; }
    const key = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
    let color = mapped.get(key);
    if (!color) {
      let best = Infinity;
      for (const candidate of rgb) {
        const distance = (pixels[i] - candidate[0]) ** 2 + (pixels[i + 1] - candidate[1]) ** 2 + (pixels[i + 2] - candidate[2]) ** 2;
        if (distance < best) { best = distance; color = candidate; }
      }
      mapped.set(key, color);
    }
    [pixels[i], pixels[i + 1], pixels[i + 2]] = color;
    pixels[i + 3] = 255;
  }
  if (Number.isInteger(width) && Number.isInteger(height) && width * height * 4 === pixels.length) {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (!pixels[i + 3]) continue;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1 ||
          !pixels[i - 1] || !pixels[i + 7] || !pixels[i - width * 4 + 3] || !pixels[i + width * 4 + 3]) {
        pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
      }
    }
  }
  return pixels;
}

const cache = new Map();
export function takariImageSource(url) {
  if (!cache.has(url)) {
    cache.set(url, (async () => {
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height);
      applyTakariPalette(data.data, canvas.width, canvas.height); context.putImageData(data, 0, 0);
      return canvas.toDataURL('image/png');
    })().catch(error => { cache.delete(url); throw error; }));
  }
  return cache.get(url);
}
