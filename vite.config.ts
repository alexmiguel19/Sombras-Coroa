import { defineConfig } from 'vite';

// base relativa: a build funciona no GitHub Pages, num servidor da escola ou aberta a partir de uma pasta.
export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
});
