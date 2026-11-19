// Testes da documentação no padrão do Portifa (ver docs/DOCS-PORTIFA.md). Rodar na raiz, depois de `npm run build`:
//   node --test "tests/portifa-docs/*.test.mjs"
// Não fazem parte do `npm run check` nem do CI (package.json e scripts/ fora do escopo da PR).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const semComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const props = (css) => [...semComentarios(css).matchAll(/^\s*(--[a-zA-Z0-9_-]+)\s*:/gm)].map((m) => m[1]);
const wrapper = new Set(props(readFileSync('src/styles/tokens-wrapper.css', 'utf8')));
const tokensDocs = readFileSync('src/styles/portifa-docs/tokens.css', 'utf8');
const blocos = [...semComentarios(tokensDocs).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ seletor: m[1].trim(), props: props(m[2]) }));
const doDocs = blocos.flatMap((b) => b.props);
const cssDocs = ['src/styles/portifa-docs/uaiui-docs.css', 'src/styles/portifa-docs/uaiui-docs-ds.css', 'src/styles/portifa-docs/uaiui-docs-tema.css'];

test('colisão: tokens do Portifa na documentação x os nomes do wrapper do DS', () => {
  const intersecao = doDocs.filter((p) => wrapper.has(p));
  console.log(`nomes do wrapper (tokens-wrapper.css): ${wrapper.size}`);
  console.log(`propriedades em .uaiui-docs (portifa-docs/tokens.css): ${doDocs.length}`);
  console.log(`interseção com o wrapper: ${intersecao.length}${intersecao.length ? ' (' + intersecao.join(', ') + ')' : ''}`);
  assert.equal(wrapper.size, 970);
  assert.deepEqual(blocos.map((b) => b.seletor), ['.uaiui-docs'], 'um bloco só, em .uaiui-docs (nada em :root)');
  assert.equal(new Set(doDocs).size, doDocs.length, 'nenhuma propriedade repetida');
  assert.deepEqual(intersecao, []);
});

test('todo var() dos CSS da documentação tem definição (.uaiui-docs, wrapper ou variável local)', () => {
  const locais = new Set(cssDocs.flatMap((f) => [...semComentarios(readFileSync(f, 'utf8')).matchAll(/\.uaiui-docs\s*\{([^}]*)\}/g)].flatMap((m) => props(m[1]))));
  const definidas = new Set([...doDocs, ...wrapper, ...locais]);
  const faltam = []; let usos = 0; const distintos = new Set();
  for (const f of [...cssDocs, 'src/styles/portifa-docs/tokens.css']) {
    for (const m of semComentarios(readFileSync(f, 'utf8')).matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)/g)) { usos++; distintos.add(m[1]); if (!definidas.has(m[1])) faltam.push(`${f}: ${m[1]}`); }
  }
  console.log(`var() na documentação: ${usos} usos, ${distintos.size} distintos; variáveis locais: ${[...locais].join(', ')}`);
  assert.deepEqual(faltam, []);
  // Os nomes que colidiam não podem voltar à cópia.
  for (const f of cssDocs) assert.doesNotMatch(semComentarios(readFileSync(f, 'utf8')), /var\(--(font-family-(title|body|label)|tag-border-subtle)\)/, f);
});

test('todo seletor dos CSS da documentação começa por .uaiui-docs (regra do Portifa)', () => {
  const ruins = [];
  for (const f of cssDocs) {
    const css = semComentarios(readFileSync(f, 'utf8'));
    for (const m of css.matchAll(/([^{};]+)\{/g)) {
      const cab = m[1].trim();
      if (cab.startsWith('@')) continue;
      for (const sel of cab.split(',').map((x) => x.trim())) if (!sel.startsWith('.uaiui-docs')) ruins.push(`${f}: ${sel}`);
    }
  }
  assert.deepEqual(ruins, []);
});

const arquivos = (dir, ext) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? arquivos(p, ext) : p.endsWith(ext) ? [p] : []; });

test('links internos do HTML gerado e do sitemap apontam para páginas que existem, com barra final', { skip: !existsSync('dist') && 'rode npm run build antes' }, () => {
  const paginas = arquivos('dist', '.html');
  const ruins = []; let total = 0;
  const existe = (caminho) => existsSync(join('dist', caminho, 'index.html')) || (statSync(join('dist', caminho), { throwIfNoEntry: false })?.isFile() ?? false);
  for (const p of paginas) {
    for (const m of readFileSync(p, 'utf8').matchAll(/\shref="(\/[^"#?]*)(#[^"]*)?"/g)) {
      const caminho = m[1];
      if (caminho.startsWith('/_astro/')) continue;
      total++;
      if (!caminho.endsWith('/')) ruins.push(`${p}: ${caminho} sem barra final`);
      if (!existe(caminho)) ruins.push(`${p}: ${caminho} não existe`);
      if (caminho.startsWith('/docs')) ruins.push(`${p}: rota antiga ${caminho}`);
    }
  }
  const sitemap = readFileSync('dist/sitemap.xml', 'utf8');
  const locs = [...sitemap.matchAll(/<loc>https:\/\/uaiui\.lpereira\.me(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
  for (const l of locs) if (!existe(l)) ruins.push(`sitemap: ${l} não existe`);
  console.log(`links internos verificados: ${total} em ${paginas.length} páginas; URLs no sitemap: ${locs.length}`);
  assert.equal(paginas.length, 5);
  assert.equal(locs.length, 5);
  assert.deepEqual(ruins, []);
});

test('canonical de cada página = URL do sitemap', { skip: !existsSync('dist') && 'rode npm run build antes' }, () => {
  const locs = [...readFileSync('dist/sitemap.xml', 'utf8').matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]).sort();
  const canon = arquivos('dist', '.html').map((p) => /<link rel="canonical" href="([^"]*)"/.exec(readFileSync(p, 'utf8'))?.[1]).sort();
  assert.deepEqual(canon, locs);
});

test('Plus Jakarta Sans: sha256 igual ao do commit a0e8583 do Portifa, com a licença', () => {
  const h = createHash('sha256').update(readFileSync('src/assets/fonts/plus-jakarta-sans-variable.woff2')).digest('hex');
  console.log(`${h}  plus-jakarta-sans-variable.woff2`);
  assert.equal(h, '392abb7bf09aa70b25a15fab19a416ca57fcc82727c719afaf51a98a7dc60197');
  assert.match(readFileSync('src/assets/fonts/OFL-Plus-Jakarta-Sans.txt', 'utf8'), /Copyright 2020 The Plus Jakarta Sans Project Authors[\s\S]*SIL OPEN FONT LICENSE Version 1\.1/);
});

test('Plus Jakarta Sans: igual à do repositório do Portifa (se a pasta irmã existir)', { skip: !existsSync(join(process.env.HOME ?? '', 'Projetos/portifa/.git')) && 'repositório do Portifa não encontrado' }, () => {
  const orig = execFileSync('git', ['-C', join(process.env.HOME, 'Projetos/portifa'), 'show', 'a0e8583:src/assets/fonts/plus-jakarta-sans-variable.woff2'], { maxBuffer: 1 << 24 });
  assert.equal(createHash('sha256').update(orig).digest('hex'), createHash('sha256').update(readFileSync('src/assets/fonts/plus-jakarta-sans-variable.woff2')).digest('hex'));
});

test('preload das fontes (D12): as 5 páginas pedem a Plus Jakarta Sans e a DM Sans no <head>, no mesmo arquivo do url() do CSS', { skip: !existsSync('dist') && 'rode npm run build antes' }, () => {
  const cssGerado = arquivos('dist/_astro', '.css').map((f) => readFileSync(f, 'utf8')).join('\n');
  for (const p of arquivos('dist', '.html')) {
    const html = readFileSync(p, 'utf8');
    const head = html.slice(0, html.indexOf('</head>'));
    for (const nome of ['plus-jakarta-sans-variable', 'dm-sans-variable']) {
      const m = new RegExp(`<link rel="preload" as="font" type="font/woff2" href="(/_astro/${nome}\\.[\\w-]+\\.woff2)" crossorigin>`).exec(head);
      assert.ok(m, `${p}: sem preload de ${nome}`);
      assert.ok(existsSync(join('dist', m[1])), `${p}: ${m[1]} não existe`);
      assert.ok(cssGerado.includes(`url(${m[1]})`), `${p}: ${m[1]} não é o arquivo do url() do CSS (seria baixado duas vezes)`);
    }
  }
  // O preload não troca o font-display: a fonte de título continua optional.
  assert.match(readFileSync('src/styles/portifa-docs/fonts.css', 'utf8'), /font-family: 'Portifa Plus Jakarta Sans';[\s\S]*?font-display: optional;/);
});

test('cópia: os blocos do cabeçalho mobile sticky continuam em uaiui-docs.css, sem marca de adaptação (decisão 11)', () => {
  const css = readFileSync('src/styles/portifa-docs/uaiui-docs.css', 'utf8');
  assert.match(css, /@media \(max-width: 887px\) \{\s*\.uaiui-docs \.uaiui-docs__body > h2 \{\s*scroll-margin-top: calc\(var\(--header-mobile-height\) \+ var\(--scale-x2\)\);/);
  assert.match(css, /@media \(min-width: 768px\) and \(max-width: 887px\) \{[\s\S]*?top: calc\(var\(--header-mobile-height\) \+ var\(--scale-x10\)\);/);
  assert.ok(doDocs.includes('--header-mobile-height'));
});

test('marcas "ADAPTAÇÃO UaiUI" na documentação', () => {
  const fontes = [...arquivos('src/components/portifa-docs', '.astro'), ...arquivos('src/components/portifa-docs', '.ts'), ...arquivos('src/styles/portifa-docs', '.css'), 'src/layouts/DocsLayout.astro', ...arquivos('src/pages', '.astro'), 'src/pages/sitemap.xml.ts'];
  const porArquivo = fontes.map((f) => [f, readFileSync(f, 'utf8').split('ADAPTAÇÃO UaiUI').length - 1]).filter(([, n]) => n);
  console.log(porArquivo.map(([f, n]) => `${n}  ${f}`).join('\n'));
  for (const f of ['src/styles/portifa-docs/tokens.css', 'src/styles/portifa-docs/uaiui-docs.css', 'src/styles/portifa-docs/uaiui-docs-ds.css', 'src/styles/portifa-docs/fonts.css', 'src/styles/portifa-docs/base.css', 'src/layouts/DocsLayout.astro', 'src/components/portifa-docs/config/uaiui-nav.ts', 'src/pages/index.astro', 'src/pages/tokens.astro', 'src/pages/componentes/toast.astro', 'src/components/portifa-docs/Example.astro', 'src/components/portifa-docs/DocsTheme.astro', 'src/components/portifa-docs/tema.ts', 'src/styles/portifa-docs/uaiui-docs-tema.css']) {
    assert.ok(porArquivo.some(([g]) => g === f), `${f} sem marca`);
  }
});

test('o layout não importa tokens.css (DS só no wrapper .uaiui) e o skip link tem os tokens', () => {
  const layout = readFileSync('src/layouts/DocsLayout.astro', 'utf8');
  assert.match(layout, /import '\.\.\/styles\/tokens-wrapper\.css';/);
  assert.doesNotMatch(layout, /styles\/tokens\.css/);
  assert.match(layout, /<a class="skip uaiui uai-button"[^>]*href="#conteudo"/);
  assert.match(layout, /<main id="conteudo" tabindex="-1">\s*<div class="uaiui uaiui-docs">/);
});
