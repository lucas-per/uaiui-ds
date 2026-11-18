import { defineConfig } from 'astro/config';

// Site próprio, publicado na raiz de https://uaiui.lpereira.me (sem subcaminho).
export default defineConfig({
  site: 'https://uaiui.lpereira.me',
  server: { port: 4321 },
});
