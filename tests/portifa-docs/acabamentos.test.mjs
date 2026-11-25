// Testes dos acabamentos de CSS da moldura (D19 em docs/DOCS-PORTIFA.md: B-07, B-08, B-10 e B-12 da auditoria; D21: amostra de cores em lista).
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
const semComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const cssBruto = readFileSync('src/styles/portifa-docs/uaiui-docs.css', 'utf8');
const css = semComentarios(cssBruto);
const regra = (seletor) => css.match(new RegExp(`${seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`))?.[1] ?? '';

// ---------- estáticos ----------

test('CSS: as quatro regras da D19 estão presentes e marcadas ADAPTAÇÃO UaiUI (D19, B-xx)', () => {
  for (const b of ['B-07', 'B-08', 'B-10', 'B-12']) assert.ok(cssBruto.includes(`ADAPTAÇÃO UaiUI (D19, ${b})`), `${b} sem marca`);
  assert.match(regra('.uaiui-docs .uaiui-docs__swatches'), /padding:\s*0;/, 'B-07');
  assert.match(css, /@media \(forced-colors: active\) \{\s*\.uaiui-docs \.uaiui-docs__swatch-color \{[^}]*forced-color-adjust: none;[^}]*border-color: CanvasText;/, 'B-08');
  const atual = regra('.uaiui-docs .uaiui-docs__pages-current');
  assert.match(atual, /white-space:\s*normal;/, 'B-10');
  assert.doesNotMatch(atual, /text-overflow|nowrap/, 'B-10: sem elipse nem nowrap');
  assert.match(css, /@media \(max-width: 887px\) \{[^@]*\.uaiui-docs a\[href\],\s*\.uaiui-docs button,\s*\.uaiui-docs input,\s*\.uaiui-docs summary,\s*\.uaiui-docs \[tabindex\] \{\s*scroll-margin-top: calc\(var\(--header-mobile-height\) \+ var\(--scale-x2\)\);/, 'B-12');
});

test('CSS: o forced-color-adjust: none fica só na amostra de cor; nenhum token novo; base.css não mudou', () => {
  const forced = (css.match(/forced-color-adjust: none/g) ?? []).length;
  const noBloco = [...css.matchAll(/([^{}]+)\{[^{}]*forced-color-adjust: none/g)].map((m) => m[1].trim());
  assert.ok(forced >= 1 && noBloco.some((s) => s.endsWith('.uaiui-docs__swatch-color')));
  assert.deepEqual([...new Set([...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]))], ['--uaiui-docs-gutter', '--uaiui-docs-inset', '--uaiui-docs-layout-shadow', '--uaiui-docs-pager-shadow-hover'], 'uaiui-docs.css só declara as 4 variáveis locais que já tinha (nenhum token novo)');
  assert.doesNotMatch(readFileSync('src/styles/portifa-docs/base.css', 'utf8'), /scroll-padding/);
  assert.match(readFileSync('docs/DOCS-PORTIFA.md', 'utf8'), /D19\./);
});

test('HTML gerado: as marcas ADAPTAÇÃO UaiUI da D19 não vão para o HTML', { skip: semBuild }, () => {
  const todos = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? todos(p) : p.endsWith('.html') ? [p] : []; });
  for (const f of todos('dist')) assert.ok(!/D19/.test(readFileSync(f, 'utf8')), f);
});

test('CSS: a amostra de cores é uma lista (quadrado à esquerda, nome à direita), marcada ADAPTAÇÃO UaiUI (D21), sem valor solto nem token novo', () => {
  assert.ok(cssBruto.includes('ADAPTAÇÃO UaiUI (D21)'), 'D21 sem marca');
  const ul = regra('.uaiui-docs .uaiui-docs__swatches');
  assert.match(ul, /flex-direction:\s*column;/);
  assert.match(ul, /gap:\s*var\(--scale-x2\);/, 'entre linhas: 8px pela escala');
  assert.doesNotMatch(ul, /flex-wrap/, 'sem quebra em linha: um item por linha');
  const li = regra('.uaiui-docs .uaiui-docs__swatch');
  assert.match(li, /display:\s*flex;/);
  assert.match(li, /align-items:\s*center;/);
  assert.match(li, /gap:\s*var\(--scale-x4\);/, 'entre quadrado e nome: 16px pela escala');
  assert.match(li, /overflow-wrap:\s*anywhere;/);
  assert.match(li, /font-family:\s*var\(--uaiui-docs-font-label\);/, 'o nome segue em fonte monoespaçada');
  const cor = regra('.uaiui-docs .uaiui-docs__swatch-color');
  assert.match(cor, /flex:\s*none;/, 'mesma largura em todos (não encolhe)');
  assert.match(cor, /width:\s*72px;[^}]*height:\s*40px;/, 'o quadrado mantém o tamanho');
  assert.match(cor, /border:\s*var\(--border-width-default\) solid var\(--ui-border-strong\);/, 'e a borda');
  assert.match(readFileSync('docs/DOCS-PORTIFA.md', 'utf8'), /D21\./);
});

test('HTML gerado: a amostra segue sendo ul/li com 11 itens, o quadrado vazio e sem texto alternativo novo; a marca D21 não vai para o HTML', { skip: semBuild }, () => {
  const html = readFileSync('dist/tokens/index.html', 'utf8');
  const ul = html.match(/<ul class="uaiui-docs__swatches"[^>]*>([\s\S]*?)<\/ul>/)[1];
  assert.equal((ul.match(/<li class="uaiui-docs__swatch"/g) ?? []).length, 11);
  assert.equal((ul.match(/<span class="uaiui-docs__swatch-color" style="[^"]*"><\/span>/g) ?? []).length, 11);
  assert.doesNotMatch(ul, /alt=|aria-label|aria-hidden|<img|<table/);
  assert.ok(!/D21/.test(html));
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

const abrir = async (largura, altura, opcoes = {}) => (await browser.newContext({ viewport: { width: largura, height: altura }, ...opcoes })).newPage();

test('Chromium: as amostras da página Tokens alinham com o h2 (x igual) de 320 a 1440px, sem rolagem horizontal (B-07)', { skip: semNavegador }, async () => {
  for (const largura of [320, 375, 768, 1440]) {
    const page = await abrir(largura, 900);
    await page.goto(`${base}/tokens/`);
    const r = await page.evaluate(() => {
      const ul = document.querySelector('.uaiui-docs__swatches');
      const itens = [...ul.children];
      return { pad: getComputedStyle(ul).paddingLeft, h2: document.querySelector('.uaiui-docs__body h2').getBoundingClientRect().x, x: itens[0].getBoundingClientRect().x, direita: Math.max(...itens.map((e) => e.getBoundingClientRect().right)), vw: document.documentElement.clientWidth, hs: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    assert.equal(r.pad, '0px', `${largura}px`);
    assert.equal(r.x, r.h2, `${largura}px: a 1ª amostra começa na coluna do texto`);
    assert.ok(r.direita <= r.vw && r.hs === 0, `${largura}px: sem overflow`);
  }
});

test('Chromium: a amostra de cores é uma lista: quadrado à esquerda do nome, nomes na mesma coluna, 16px entre os dois e 8px entre as linhas, sem rolagem horizontal, nem com o espaçamento de texto da WCAG (D21)', { skip: semNavegador }, async () => {
  const espacamento = '*{line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important} p{margin-bottom:2em !important}';
  const medir = (page) => page.evaluate(() => {
    const lis = [...document.querySelectorAll('.uaiui-docs__swatch')];
    const nome = (li) => { const r = document.createRange(); r.selectNodeContents([...li.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim())); return r.getBoundingClientRect(); };
    const quad = lis.map((l) => l.querySelector('.uaiui-docs__swatch-color').getBoundingClientRect());
    const nomes = lis.map(nome);
    const ul = document.querySelector('.uaiui-docs__swatches').getBoundingClientRect();
    const arred = (n) => Math.round(n * 100) / 100;
    return {
      n: lis.length, h2: document.querySelector('.uaiui-docs__body h2').getBoundingClientRect().x,
      xQuad: [...new Set(quad.map((r) => r.x))], largQuad: [...new Set(quad.map((r) => r.width))], xNome: [...new Set(nomes.map((r) => arred(r.x)))],
      gapH: [...new Set(nomes.map((r, i) => arred(r.x - quad[i].right)))], gapV: [...new Set(lis.slice(1).map((l, i) => arred(l.getBoundingClientRect().top - lis[i].getBoundingClientRect().bottom)))],
      centro: Math.max(...nomes.map((r, i) => Math.abs((r.top + r.bottom) / 2 - (quad[i].top + quad[i].bottom) / 2))),
      cortado: lis.some((l) => l.scrollWidth > l.clientWidth + 1) || nomes.some((r) => r.right > ul.right + 0.5),
      hs: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  for (const [largura, comEspacamento] of [[320, false], [320, true], [375, false], [768, false], [1440, false]]) {
    const page = await abrir(largura, 900);
    await page.goto(`${base}/tokens/`);
    await page.waitForSelector('.uaiui-docs__swatch');
    if (comEspacamento) {
      await page.addStyleTag({ content: espacamento });
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.uaiui-docs__swatch')).letterSpacing !== 'normal');
    }
    const r = await medir(page);
    const rotulo = `${largura}px${comEspacamento ? ' com espaçamento WCAG' : ''}`;
    assert.equal(r.n, 11, rotulo);
    assert.deepEqual(r.xQuad, [r.h2], `${rotulo}: todos os quadrados na coluna do texto`);
    assert.deepEqual(r.largQuad, [72], `${rotulo}: todos com a mesma largura`);
    assert.equal(r.xNome.length, 1, `${rotulo}: os nomes numa só coluna`);
    assert.ok(r.xNome[0] > r.xQuad[0] + 72, `${rotulo}: o nome fica à direita do quadrado`);
    assert.deepEqual(r.gapH, [16], `${rotulo}: 16px entre quadrado e nome`);
    assert.deepEqual(r.gapV, [8], `${rotulo}: 8px entre linhas`);
    assert.ok(r.centro <= 1, `${rotulo}: nome centralizado na vertical (${r.centro}px)`);
    assert.equal(r.cortado, false, `${rotulo}: nenhum nome cortado`);
    assert.equal(r.hs, 0, `${rotulo}: sem rolagem horizontal`);
    await page.context().close();
  }
});

test('Chromium: em forced-colors a amostra mostra a cor (fundo ≠ Canvas) e a borda e o texto continuam adaptando (B-08)', { skip: semNavegador }, async () => {
  const page = await abrir(1440, 900, { forcedColors: 'active' });
  await page.goto(`${base}/tokens/`);
  const r = await page.evaluate(() => {
    const cores = [...document.querySelectorAll('.uaiui-docs__swatch')].map((li) => { const s = getComputedStyle(li.querySelector('.uaiui-docs__swatch-color')); return { bg: s.backgroundColor, borda: s.borderTopColor, adj: s.forcedColorAdjust, texto: getComputedStyle(li).color }; });
    return { cores, h2: getComputedStyle(document.querySelector('.uaiui-docs__body h2')).color, celula: getComputedStyle(document.querySelector('.uaiui-docs__table td')).color };
  });
  assert.equal(r.cores.length, 11);
  assert.ok(new Set(r.cores.map((c) => c.bg)).size >= 8, 'as amostras têm cores diferentes entre si (não são todas Canvas)');
  for (const c of r.cores) { assert.equal(c.adj, 'none'); assert.equal(c.borda, c.texto, 'a borda acompanha a cor de sistema do texto (CanvasText)'); }
  assert.equal(r.h2, r.cores[0].texto, 'o resto continua adaptando');
  assert.equal(r.celula, r.h2);
});

test('Chromium: "Páginas" a 320px: com o espaçamento de texto WCAG o título não é cortado; sem ele, uma linha como antes (B-10)', { skip: semNavegador }, async () => {
  const espacamento = '*{line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important} p{margin-bottom:2em !important}';
  const medir = (page) => page.evaluate(() => { const e = document.querySelector('.uaiui-docs__pages-current'); const t = document.querySelector('.uaiui-docs__pages-toggle').getBoundingClientRect(); return { cortado: e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1, linhas: Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)), alturaBotao: Math.round(t.height), elipse: getComputedStyle(e).textOverflow, hs: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
  const page = await abrir(320, 700);
  await page.goto(`${base}/tokens/`);
  const sem = await medir(page);
  assert.deepEqual(sem, { cortado: false, linhas: 1, alturaBotao: 44, elipse: 'clip', hs: 0 });
  await page.addStyleTag({ content: espacamento });
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.uaiui-docs__pages-current')).letterSpacing !== 'normal');
  const com = await medir(page);
  assert.equal(com.cortado, false, 'não corta com o espaçamento');
  assert.equal(com.hs, 0);
  assert.ok(com.linhas >= 2, '"Tokens e temas" quebra em duas linhas em vez de perder o fim');
});

test('Chromium: a 375 e 768px, Shift+Tab não deixa sob o cabeçalho sticky nenhum elemento que cabe na área visível; skip link e âncoras seguem certos (B-12)', { skip: semNavegador }, async () => {
  for (const largura of [375, 768]) {
    const page = await abrir(largura, 667);
    await page.goto(`${base}/componentes/button/`);
    if (largura < 768) await page.click('[data-pages-toggle]');
    const margem = await page.evaluate(() => getComputedStyle(document.querySelector('.uaiui-docs__code pre')).scrollMarginTop);
    assert.equal(margem, '91px', `${largura}px: 83px do cabeçalho + 8px`);
    await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); const l = [...document.querySelectorAll('.uaiui-docs a[href],.uaiui-docs button,.uaiui-docs input,.uaiui-docs [tabindex="0"]')].filter((e) => e.offsetParent && !e.closest('[hidden]')); l[l.length - 1].focus(); });
    let sob = [];
    let paradas = 0;
    for (let i = 0; i < 150; i++) {
      await page.keyboard.press('Shift+Tab');
      const r = await page.evaluate(() => { const e = document.activeElement; if (e === document.body || e.closest('.site-header-mobile,.site-header,.site-footer,.site-footer-mobile,.skip')) return null; const hb = document.querySelector('.site-header-mobile').getBoundingClientRect().bottom; const rc = e.getBoundingClientRect(); return { nome: e.tagName + (e.getAttribute('aria-label') ?? ''), h: rc.height, top: rc.top, hb: getComputedStyle(document.querySelector('.site-header-mobile')).display === 'none' ? 0 : hb, sy: scrollY }; });
      if (!r) break;
      paradas++;
      if (r.h <= 584 && r.top < r.hb && r.sy > 0) sob.push(`${r.nome}@${r.top}`);
    }
    assert.ok(paradas > 25, `${largura}px: ${paradas} paradas percorridas`);
    assert.deepEqual(sob, [], `${largura}px: elementos sob o cabeçalho`);
    await page.goto(`${base}/componentes/button/#acessibilidade`);
    await page.waitForFunction(() => Math.round(document.getElementById('acessibilidade').getBoundingClientRect().top) === 91);
  }
});
