// Sitemap do site de documentação, gerado da lista de páginas (uaiui-nav.ts),
// sem dependência nova (@astrojs/sitemap pediria mudar o package.json). As
// URLs são absolutas, no domínio de `site` (astro.config.mjs), com barra
// final, iguais ao canonical de cada página.
import type { APIRoute } from 'astro';
import { docsNavFlat } from '../components/portifa-docs/config/uaiui-nav';

export const GET: APIRoute = ({ site }) => {
  const urls = docsNavFlat.map((item) => `  <url><loc>${new URL(item.href, site).href}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
