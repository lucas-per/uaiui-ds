// Teste do destino do skip link sob o cabeçalho mobile sticky (D20 em docs/DOCS-PORTIFA.md: B-15 da auditoria).
// Rodar na raiz, depois de `npm run build`:
//   node --test "tests/portifa-docs/*.test.mjs"
// Os testes "Chromium" dirigem o site de dist/ num navegador real; o repositório não tem Playwright como dependência
// (package.json fora de escopo), então eles o procuram na máquina (PLAYWRIGHT_DIR e CHROMIUM_PATH, ou o cache do
// npx e ~/.cache/ms-playwright) e PULAM, com o motivo, se não o acharem. Na PR, a rodada local mostra pulados = 0.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';

const semBuild = !existsSync('dist') && 'rode npm run build antes';
const baseCssBruto = readFileSync('src/styles/portifa-docs/base.css', 'utf8');
const baseCss = baseCssBruto.replace(/\/\*[\s\S]*?\*\//g, '');

// ---------- estáticos ----------

test('base.css: scroll-margin-top do <main> até 887px, marcado ADAPTAÇÃO UaiUI (D20, B-15), com a conta do token por extenso', () => {
  assert.ok(baseCssBruto.includes('ADAPTAÇÃO UaiUI (D20, B-15)'));
  assert.match(baseCss, /@media \(max-width: 887px\) \{\s*main\[tabindex="-1"\] \{ scroll-margin-top: calc\(2 \* 1rem \+ 2\.875rem \+ 5px \+ 0\.5rem\); \}\s*\}/);
  assert.doesNotMatch(baseCss, /var\(--header-mobile-height\)/, 'a variável não chega ao <main> (fora de .uaiui-docs)');
  const chrome = readFileSync('src/styles/portifa-chrome/tokens.css', 'utf8');
  assert.match(chrome, /--header-mobile-core: 2\.875rem;/);
  assert.match(chrome, /--header-mobile-divider: 5px;/);
  assert.match(chrome, /--header-mobile-height: calc\(var\(--scale-x4\) \* 2 \+ var\(--header-mobile-core\) \+ var\(--header-mobile-divider\)\);/, 'a conta escrita por extenso é a do chrome');
  assert.match(readFileSync('docs/DOCS-PORTIFA.md', 'utf8'), /D20\./);
});

test('HTML gerado: o destino do skip link é o <main id="conteudo" tabindex="-1">, e a marca D20 não vai para o HTML', { skip: semBuild }, () => {
  for (const f of ['index.html', 'tokens/index.html', 'componentes/accordion/index.html', 'componentes/button/index.html', 'componentes/toast/index.html']) {
    const html = readFileSync(join('dist', f), 'utf8');
    assert.match(html, /<a class="skip[^"]*"[^>]*href="#conteudo"/, f);
    assert.match(html, /<main id="conteudo" tabindex="-1">/, f);
    assert.ok(!/D20/.test(html), f);
  }
});

// ---------- Chromium ----------

const achar = (candidatos) => candidatos.find((p) => p && existsSync(p));
const nos = (dir, filtro) => (existsSync(dir) ? readdirSync(dir).filter(filtro).map((n) => join(dir, n)) : []);
const pwDir = achar([process.env.PLAYWRIGHT_DIR, ...nos(join(homedir(), '.npm/_npx'), () => true).map((d) => join(d, 'node_modules/playwright'))]);
const chromePath = achar([
  process.env.CHROMIUM_PATH,
  ...nos(join(homedir(), '.cache/ms-playwright'), (n) => n.startsWith('chromium-')).map((d) => join(d, 'chrome-linux64/chrome')),
]);
const semNavegador = (!semBuild && !pwDir && 'playwright não encontrado (defina PLAYWRIGHT_DIR)') || (!semBuild && !chromePath && 'Chromium não encontrado (defina CHROMIUM_PATH)') || semBuild;

let server, browser, base;
const tipos = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.xml': 'application/xml' };
before(async () => {
  if (semNavegador) return;
  server = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = join('dist', p);
    if (!existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': tipos[extname(f)] ?? 'application/octet-stream' }).end(readFileSync(f));
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = await import(pathToFileURL(join(pwDir, 'index.mjs')).href);
  browser = await chromium.launch({ executablePath: chromePath });
});
after(async () => {
  await browser?.close();
  await new Promise((ok) => (server ? server.close(ok) : ok()));
});

const abrir = async (largura, altura) => (await browser.newContext({ viewport: { width: largura, height: altura } })).newPage();

test('Chromium: ativar o skip link por teclado deixa o primeiro conteúdo logo abaixo do cabeçalho sticky (320, 375 e 768px) e não muda em 1440px (B-15)', { skip: semNavegador }, async () => {
  for (const largura of [320, 375, 768, 1440]) {
    const page = await abrir(largura, 667);
    await page.goto(`${base}/componentes/button/`);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains('skip')), true, 'o skip link é o primeiro Tab');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.hash === '#conteudo' && document.activeElement.id === 'conteudo');
    const r = await page.evaluate(() => {
      const cab = document.querySelector('.site-header-mobile');
      const fim = getComputedStyle(cab).display === 'none' ? 0 : cab.getBoundingClientRect().bottom;
      return { fim, brand: document.querySelector('.uaiui-docs__brand').getBoundingClientRect().top, main: document.querySelector('main').getBoundingClientRect().top, margem: getComputedStyle(document.querySelector('main')).scrollMarginTop, hs: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    assert.equal(r.hs, 0, `${largura}px`);
    if (largura < 888) {
      assert.equal(r.fim, 83, `${largura}px: cabeçalho de 83px`);
      assert.equal(r.margem, '91px', `${largura}px`);
      assert.ok(r.main >= r.fim, `${largura}px: o topo do main (${r.main}) fica abaixo do cabeçalho (${r.fim})`);
      assert.ok(r.brand >= r.fim, `${largura}px: o 1º conteúdo (${r.brand}) fica visível abaixo do cabeçalho (${r.fim})`);
    } else {
      assert.equal(r.margem, '0px', 'em 1440px nada muda (cabeçalho não sticky)');
      assert.equal(r.fim, 0);
    }
  }
});

test('Chromium: as âncoras seguem a 91px do topo a 375px (B-12 e o skip link convivem)', { skip: semNavegador }, async () => {
  const page = await abrir(375, 667);
  for (const id of ['instalacao', 'uso', 'props', 'acessibilidade']) {
    await page.goto(`${base}/componentes/button/#${id}`);
    await page.waitForFunction((alvo) => Math.round(document.getElementById(alvo).getBoundingClientRect().top) === 91, id);
  }
});
