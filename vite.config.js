import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // Rust vigila su propio código; Vite no debe intentar abrir sus binarios.
    watch: { ignored: ['**/src-tauri/**', '**/.npm-cache/**'] },
  },
});
