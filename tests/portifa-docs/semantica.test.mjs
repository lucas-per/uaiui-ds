// Testes da semântica de títulos e blocos de código (D18 em docs/DOCS-PORTIFA.md: B-04 e B-11 da auditoria).
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
const arquivos = (dir, ext) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? arquivos(p, ext) : p.endsWith(ext) ? [p] : []; });
const rotas = ['index.html', 'tokens/index.html', 'componentes/accordion/index.html', 'componentes/button/index.html', 'componentes/toast/index.html'];

// ---------- estáticos ----------

test('Accordion (código): h2 "Demonstração" só para leitor de tela antes do primeiro <Example>, marcado ADAPTAÇÃO UaiUI (D18)', () => {
  const src = readFileSync('src/pages/componentes/accordion.astro', 'utf8');
  assert.match(src, /ADAPTAÇÃO UaiUI \(D18, B-04\)/);
  assert.ok(/<h2 class="uaiui-docs__sr-only">Demonstração<\/h2>\s*<Example code=\{basic\}/.test(src), 'o h2 oculto vem logo antes do primeiro exemplo');
  for (const f of ['button', 'toast']) assert.ok(!/sr-only/.test(readFileSync(`src/pages/componentes/${f}.astro`, 'utf8')), `${f} não ganha título oculto`);
});

test('CodeBlock (código): <pre> com tabindex, role="group" e aria-label, marcado ADAPTAÇÃO UaiUI (D18); nunca role="region"', () => {
  const src = readFileSync('src/components/portifa-docs/CodeBlock.astro', 'utf8');
  assert.match(src, /ADAPTAÇÃO UaiUI \(D18, B-11\)/);
  assert.match(src, /<pre tabindex="0" role="group" aria-label=\{`Código \$\{lang\.toUpperCase\(\)\}`\}>/);
  assert.ok(!/<pre[^>]*role="region"/.test(src));
  assert.match(readFileSync('docs/DOCS-PORTIFA.md', 'utf8'), /D18\./);
});

test('HTML gerado: no Accordion o primeiro h2 vem antes de qualquer h3; todo <pre> tem tabindex="0", role="group" e aria-label', { skip: semBuild }, () => {
  const acc = readFileSync('dist/componentes/accordion/index.html', 'utf8');
  const niveis = [...acc.matchAll(/<h([123])[\s>]/g)].map((m) => m[1]);
  assert.deepEqual(niveis.slice(0, 5), ['1', '2', '3', '3', '3'], 'h1, h2 oculto, e só então os h3 da demo');
  assert.match(acc, /<h2 class="uaiui-docs__sr-only"[^>]*>Demonstração<\/h2>/);
  let pres = 0;
  for (const r of rotas) {
    for (const m of readFileSync(join('dist', r), 'utf8').matchAll(/<pre\b[^>]*>/g)) {
      pres++;
      assert.match(m[0], /tabindex="0"/, r);
      assert.match(m[0], /role="group"/, r);
      assert.match(m[0], /aria-label="Código (HTML|CSS|JS)"/, r);
    }
  }
  assert.ok(pres >= 20, `${pres} blocos de código verificados`);
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

test('Chromium: outline do Accordion é h1, h2 (oculto), h3×3, h2…; o h2 oculto mede 1×1 e não ocupa espaço (B-04)', { skip: semNavegador }, async () => {
  for (const largura of [375, 1440]) {
    const page = await (await browser.newContext({ viewport: { width: largura, height: 900 } })).newPage();
    const medir = async (rota) => {
      await page.goto(`${base}${rota}`);
      return page.evaluate(() => {
        const titulo = document.querySelector('.uaiui-docs__title').getBoundingClientRect().bottom;
        const exemplo = document.querySelector('.uaiui-docs__example').getBoundingClientRect().top;
        const sr = document.querySelector('h2.uaiui-docs__sr-only');
        const r = sr?.getBoundingClientRect();
        return { folga: Math.round((exemplo - titulo) * 100) / 100, sr: sr && { w: r.width, h: r.height, pos: getComputedStyle(sr).position }, outline: [...document.querySelectorAll('h1,h2,h3')].slice(0, 6).map((h) => h.tagName) };
      });
    };
    const acc = await medir('/componentes/accordion/');
    const btn = await medir('/componentes/button/');
    assert.deepEqual(acc.outline, ['H1', 'H2', 'H3', 'H3', 'H3', 'H2'], `${largura}px`);
    assert.deepEqual(acc.sr, { w: 1, h: 1, pos: 'absolute' }, `${largura}px: h2 oculto de 1×1`);
    assert.equal(acc.folga, btn.folga, `${largura}px: o primeiro exemplo do Accordion fica à mesma distância do título que o do Button (sem título nesta rota)`);
  }
});

test('Chromium: cada <pre> visível é um grupo nomeado (não uma região) e o Tab para nele (B-11)', { skip: semNavegador }, async () => {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto(`${base}/componentes/accordion/`);
  const regioesAntes = await page.locator('[role="region"]').count();
  assert.equal(await page.locator('pre[role="region"]').count(), 0, 'nenhum pre vira região (landmark)');
  const css = page.getByRole('group', { name: 'Código CSS' });
  assert.ok((await css.count()) >= 1, 'o bloco de CSS aparece na árvore de acessibilidade como grupo "Código CSS"');
  assert.equal(await page.locator('pre:visible').count(), await page.locator('pre:visible[role="group"][aria-label]').count());
  await css.first().focus();
  assert.equal(await page.evaluate(() => document.activeElement.tagName + document.activeElement.getAttribute('aria-label')), 'PRECódigo CSS', 'o pre recebe foco');
  assert.ok(regioesAntes >= 1);
});
