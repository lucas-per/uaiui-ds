// Testes da busca (D16 em docs/DOCS-PORTIFA.md: B-02, B-05 e B-09 da auditoria de acessibilidade).
// Rodar na raiz, depois de `npm run build`:
//   node --test "tests/portifa-docs/*.test.mjs"
// Os testes "Chromium" dirigem o site de dist/ num navegador real. O repositório não tem Playwright como
// dependência (package.json fora de escopo), então eles o procuram na máquina (PLAYWRIGHT_DIR e
// CHROMIUM_PATH, ou o cache do npx e ~/.cache/ms-playwright) e PULAM, com o motivo, se não o acharem.
// Na PR, a saída da rodada local mostra os três executados (pulados = 0).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';

const semBuild = !existsSync('dist') && 'rode npm run build antes';
const docsTs = readFileSync('src/components/portifa-docs/docs.ts', 'utf8');
const css = readFileSync('src/styles/portifa-docs/uaiui-docs.css', 'utf8');

// ---------- estáticos ----------

test('busca (código): sem <a> dentro do option, scrollIntoView, aria-expanded sincronizado e menu fechado antes do opener, tudo marcado ADAPTAÇÃO UaiUI', () => {
  const render = docsTs.slice(docsTs.indexOf('const render = () =>'), docsTs.indexOf('// Quem abriu a busca'));
  assert.ok(!/<a\b/.test(render), 'o template do option não tem <a>');
  assert.match(render, /<li role="option"[^>]*><span class="uaiui-docs__search-item">/);
  assert.match(render, /scrollIntoView\(\{ block: 'nearest' \}\)/);
  assert.match(render, /setAttribute\('aria-expanded', String\(shown\.length > 0\)\)/);
  assert.match(docsTs, /dialog\.addEventListener\('close', \(\) => \{\n\s+input\.setAttribute\('aria-expanded', 'false'\)/);
  const open = docsTs.slice(docsTs.indexOf('const open = () =>'), docsTs.indexOf('input.focus();'));
  assert.ok(open.indexOf('menuToggle!.click()') > -1 && open.indexOf('menuToggle!.click()') < open.indexOf('opener ='), 'o menu fecha antes de guardar o opener');
  assert.ok(open.indexOf('opener =') < open.indexOf('showModal()'));
  assert.equal((docsTs.match(/ADAPTAÇÃO UaiUI \(D16/g) ?? []).length >= 4, true);
  assert.match(readFileSync('docs/DOCS-PORTIFA.md', 'utf8'), /D16\./);
});

test('busca (CSS): nenhum seletor casa por `a` nos resultados; o item é .uaiui-docs__search-item (inclusive em forced-colors)', () => {
  assert.ok(!/search-results[^{]*\ba\b[^-{]*[{,:]/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'sem seletor `search-results a`');
  assert.equal((css.match(/\.uaiui-docs__search-item/g) ?? []).length >= 4, true);
});

test('HTML gerado: combobox da busca com aria-expanded="false" e sem listbox preenchida', { skip: semBuild }, () => {
  for (const f of ['index.html', 'tokens/index.html', 'componentes/button/index.html']) {
    const html = readFileSync(join('dist', f), 'utf8');
    const input = html.match(/<input[^>]*id="uaiui-docs-q"[^>]*>/)?.[0] ?? '';
    assert.match(input, /aria-expanded="false"/, f);
    assert.ok(!/aria-expanded="true"/.test(input), f);
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

test('Chromium: depois de ↓×4 o item ativo está visível em 375×667 e em 1280×600 (B-02)', { skip: semNavegador }, async () => {
  for (const [width, height] of [[375, 667], [1280, 600]]) {
    const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
    await page.goto(`${base}/`);
    await page.keyboard.press('Control+k');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown');
    const r = await page.evaluate(() => {
      const list = document.querySelector('#uaiui-docs-results');
      const sel = list.querySelector('[aria-selected="true"]').getBoundingClientRect();
      const box = list.getBoundingClientRect();
      return { texto: list.querySelector('[aria-selected="true"]').textContent, dentro: sel.top >= box.top - 1 && sel.bottom <= box.bottom + 1 && sel.bottom <= innerHeight, ativo: document.querySelector('#uaiui-docs-q').getAttribute('aria-activedescendant'), id: list.querySelector('[aria-selected="true"]').id };
    });
    assert.match(r.texto, /^Toast/, `${width}×${height}`);
    assert.equal(r.dentro, true, `${width}×${height}: o item ativo está dentro da lista visível`);
    assert.equal(r.ativo, r.id);
  }
});

test('Chromium: lista vazia tem aria-expanded=false; com resultados, true; fechada, false; o option não tem <a> e o clique navega (B-05)', { skip: semNavegador }, async () => {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await page.goto(`${base}/`);
  const exp = () => page.getAttribute('#uaiui-docs-q', 'aria-expanded');
  assert.equal(await exp(), 'false', 'antes de abrir');
  await page.keyboard.press('Control+k');
  assert.equal(await exp(), 'true', 'aberta, com resultados');
  assert.equal(await page.locator('#uaiui-docs-results li[role="option"] a').count(), 0, 'nenhum <a> dentro dos options');
  await page.keyboard.type('zzzz');
  assert.equal(await page.textContent('#uaiui-docs-results'), 'Nada encontrado.');
  assert.equal(await exp(), 'false', '"Nada encontrado."');
  assert.equal(await page.getAttribute('#uaiui-docs-q', 'aria-activedescendant'), null);
  await page.fill('#uaiui-docs-q', 'tok');
  assert.equal(await exp(), 'true', 'voltou a ter resultado');
  await page.keyboard.press('Escape');
  // O evento `close` do <dialog> é assíncrono (é ele que põe aria-expanded em false): espera o estado, sem pausa fixa.
  await page.waitForFunction(() => document.querySelector('#uaiui-docs-q').getAttribute('aria-expanded') === 'false');
  assert.equal(await exp(), 'false', 'fechada');
  await page.keyboard.press('Control+k');
  await page.locator('#uaiui-docs-results li[role="option"]').nth(3).click();
  await page.waitForURL('**/componentes/button/');
});

test('Chromium: Ctrl+K com o menu mobile aberto fecha o menu, abre a busca com o foco no campo e o Esc devolve o foco ao botão do menu (B-09)', { skip: semNavegador }, async () => {
  const page = await (await browser.newContext({ viewport: { width: 375, height: 667 } })).newPage();
  await page.goto(`${base}/componentes/button/`);
  const toggle = page.locator('[data-menu-toggle]');
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(await page.evaluate(() => document.querySelector('main').inert), true, 'com o menu aberto o main é inert');
  await page.keyboard.press('Control+k');
  const s = await page.evaluate(() => ({
    dialog: document.querySelector('dialog').open,
    foco: document.activeElement.id,
    menu: document.querySelector('[data-menu-toggle]').getAttribute('aria-expanded'),
    rotulo: document.querySelector('[data-menu-toggle]').getAttribute('aria-label'),
    inertes: [...document.body.children].filter((e) => e.inert).length,
    painelOculto: document.querySelector('#site-menu-mobile').hidden,
  }));
  assert.deepEqual(s, { dialog: true, foco: 'uaiui-docs-q', menu: 'false', rotulo: 'Abrir menu', inertes: 0, painelOculto: true });
  await page.keyboard.press('Escape');
  // Quem devolve o foco ao botão do menu é o evento `close` do <dialog>, assíncrono: espera o foco chegar.
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Abrir menu');
  const f = await page.evaluate(() => ({ dialog: document.querySelector('dialog').open, foco: document.activeElement.getAttribute('aria-label'), menu: document.querySelector('[data-menu-toggle]').getAttribute('aria-expanded') }));
  assert.deepEqual(f, { dialog: false, foco: 'Abrir menu', menu: 'false' }, 'o foco volta ao botão do menu, que continua fechado');
  await page.keyboard.press('Tab');
  assert.notEqual(await page.evaluate(() => document.activeElement.tagName), 'BODY', 'o Tab segue a partir do botão (foco não ficou preso)');
});
