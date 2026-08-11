import { defineConfig } from 'vite';

export default defineConfig({
  // Goreli taban: oyun hem kokte hem GitHub Pages'in /<repo>/ alt yolunda
  // ayni sekilde calisir. Kod tarafinda varlik yollari import.meta.env.BASE_URL
  // uzerinden kurulur (bkz. src/render/atlas.ts).
  base: './',
});
