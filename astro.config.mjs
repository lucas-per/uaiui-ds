import { defineConfig } from 'astro/config';

// Publicado como subcaminho do portifa: https://lpereira.me/uaiui
export default defineConfig({
  site: 'https://lpereira.me',
  base: '/uaiui',
  server: { port: 4321 },
});
