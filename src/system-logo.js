export function mountLogoSettings(main, { current, defaultLogo, save, back }) {
  const el = (tag, text) => { const node = document.createElement(tag); if (text) node.textContent = text; return node; };
  main.append(el('h1', 'Configurar logo del sistema'));
  const panel = el('section'); panel.className = 'card';
  const preview = el('img'); preview.className = 'system-logo-preview'; preview.src = current; preview.alt = 'Vista previa del logo del sistema';
  const field = el('label'); field.className = 'field';
  const input = el('input'); input.type = 'file'; input.accept = '.png,.jpg,.jpeg,.webp'; input.setAttribute('aria-label', 'Seleccionar logo del sistema');
  field.append(el('span', 'Seleccionar imagen PNG, JPG o WebP'), input);
  const status = el('p'); status.setAttribute('role', 'status');
  const submit = el('button', 'Guardar logo'); submit.className = 'primary'; submit.disabled = true;
  const reset = el('button', 'Usar logo original'); reset.className = 'choice';
  const cancel = el('button', 'Volver'); cancel.className = 'choice'; cancel.onclick = back;
  let pending = null;
  function lock(value) { [input, submit, reset, cancel].forEach(node => { node.disabled = value; }); }
  input.onchange = async () => {
    if (!input.files.length) return;
    lock(true); status.textContent = 'Preparando imagen…';
    let bitmap;
    try {
      const file = input.files[0];
      if (!/\.(png|jpe?g|webp)$/i.test(file.name) || file.size > 20 * 1024 * 1024) throw new Error('Elige un PNG, JPG o WebP de hasta 20 MB.');
      bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 80_000_000) throw new Error('La imagen tiene demasiados píxeles. Usa una versión más pequeña.');
      const ratio = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
      const canvas = el('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL('image/png');
      if (image.length > 2_800_022) throw new Error('El logo procesado supera 2 MB. Usa una imagen más pequeña.');
      await new Promise((resolve, reject) => { const imageCheck = new Image(); imageCheck.onload = resolve; imageCheck.onerror = reject; imageCheck.src = image; });
      pending = image; preview.src = image;
      status.textContent = 'Vista previa lista. Guarda para aplicar el cambio en ambas ventanas.';
      lock(false);
    } catch (error) {
      status.textContent = error.message || 'No se pudo abrir la imagen. Selecciona un archivo válido.';
      lock(false); submit.disabled = true;
    } finally { bitmap?.close(); }
  };
  reset.onclick = () => { pending = null; input.value = ''; preview.src = defaultLogo; submit.disabled = false; status.textContent = 'Guarda para restaurar el logo original.'; };
  submit.onclick = async () => {
    lock(true);
    try { await save(pending); }
    catch (error) { status.textContent = `No se pudo guardar el logo: ${error.message || error}`; lock(false); }
  };
  panel.append(preview, field, el('p', 'La imagen se guarda en la aplicación; puedes mover o borrar el archivo original. Se conserva la transparencia y la proporción.'), status, submit, reset, cancel);
  main.append(panel);
}
