// Testes do chrome (cabeçalho e rodapé do Portifa). Rodar na raiz, depois de `npm run build`:
//   node --test "tests/portifa-chrome/*.test.mjs"
// Não fazem parte do `npm run check` nem do CI (ver docs/CHROME-PORTIFA.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const arquivos = (dir, ext) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? arquivos(p, ext) : ext.some((e) => p.endsWith(e)) ? [p] : []; });
const fontes = [...arquivos('src/components/portifa-chrome', ['.astro', '.ts']), ...arquivos('src/styles/portifa-chrome', ['.css'])];
const tokens = readFileSync('src/styles/portifa-chrome/tokens.css', 'utf8');
const definidas = new Set([...tokens.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/^\s*(--[a-zA-Z0-9_-]+)\s*:/gm)].map((m) => m[1]));

test('todo var() usado no chrome tem definição nos tokens do chrome', () => {
  const faltam = [];
  let usos = 0;
  const distintos = new Set();
  for (const f of fontes) {
    const txt = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of txt.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)/g)) { usos++; distintos.add(m[1]); if (!definidas.has(m[1])) faltam.push(`${f}: ${m[1]}`); }
  }
  console.log(`var() no chrome: ${usos} usos, ${distintos.size} distintos, ${definidas.size} definidos`);
  assert.deepEqual(faltam, []);
});

// Regiões do chrome no HTML gerado (os quatro são filhos diretos do <body>, sem aninhar <header>/<footer>).
const regioes = (html) => [...html.matchAll(/<(header|footer) class="(site-header-mobile|site-footer-mobile|site-header|site-footer)(?=[ "])[^"]*"[\s\S]*?<\/\1>/g)].map((m) => ({ classe: m[2], html: m[0] }));
// Rotas da documentação desde a PR no padrão do Portifa (/, /tokens/, /componentes/<nome>/); o /docs/ saiu.
const paginas = ['dist/index.html', 'dist/tokens/index.html', 'dist/componentes/button/index.html', 'dist/componentes/accordion/index.html', 'dist/componentes/toast/index.html'];

test('links do chrome: absolutos (ou mailto), exceto "UaiUI DS"; nenhum caminho com /uaiui', { skip: !existsSync('dist') && 'rode npm run build antes' }, () => {
  let total = 0; const ruins = [];
  for (const p of paginas) {
    const r = regioes(readFileSync(p, 'utf8'));
    assert.deepEqual(r.map((x) => x.classe).sort(), ['site-footer', 'site-footer-mobile', 'site-header', 'site-header-mobile'], `${p}: as quatro peças`);
    for (const { classe, html } of r) {
      for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
        const href = /\shref="([^"]*)"/.exec(m[1])?.[1]; const texto = m[2].replace(/<[^>]*>/g, '').trim();
        total++;
        const absoluto = /^(https:\/\/|mailto:)/.test(href);
        const uaiui = href === '/' && texto.startsWith('UaiUI DS');
        if (!absoluto && !uaiui) ruins.push(`${p} ${classe}: href="${href}" (${texto})`);
        if (/(^|[\/"'])\/uaiui(\/|$)|lpereira\.me\/uaiui/.test(href ?? '')) ruins.push(`${p} ${classe}: caminho /uaiui em ${href}`);
      }
    }
  }
  console.log(`links verificados nas ${paginas.length} páginas: ${total}`);
  assert.deepEqual(ruins, []);
});

test('fontes copiadas: sha256 iguais aos do commit a0e8583 do Portifa', () => {
  const esperado = { 'dm-sans-variable.woff2': '9fea608a947e67020c33cad9a6fe3d60c54119dfb8cff87768a8117a15ed7543', 'jetbrains-mono-700.woff2': 'd0d4e818808f2a0ba39b2b09d1989366f63494e295f003c7ef436697378507e8' };
  for (const [nome, hash] of Object.entries(esperado)) {
    const h = createHash('sha256').update(readFileSync(`src/assets/fonts/${nome}`)).digest('hex');
    console.log(`${h}  ${nome}`);
    assert.equal(h, hash);
  }
  for (const f of ['OFL-DM-Sans.txt', 'OFL-JetBrains-Mono.txt']) assert.ok(existsSync(`src/assets/fonts/${f}`), `${f} (licença)`);
});

test('fontes copiadas: iguais às do repositório do Portifa (se a pasta irmã existir)', { skip: !existsSync(join(process.env.HOME ?? '', 'Projetos/portifa/.git')) && 'repositório do Portifa não encontrado' }, () => {
  for (const nome of ['dm-sans-variable.woff2', 'jetbrains-mono-700.woff2']) {
    const orig = execFileSync('git', ['-C', join(process.env.HOME, 'Projetos/portifa'), 'show', `a0e8583:src/assets/fonts/${nome}`], { maxBuffer: 1 << 24 });
    assert.equal(createHash('sha256').update(orig).digest('hex'), createHash('sha256').update(readFileSync(`src/assets/fonts/${nome}`)).digest('hex'), nome);
  }
});

test('cada adaptação A1 a A9 tem ao menos um comentário "ADAPTAÇÃO UaiUI"', () => {
  const linhas = [...fontes, 'src/layouts/DocsLayout.astro', 'src/styles/portifa-docs/base.css'].flatMap((f) => readFileSync(f, 'utf8').split('\n').filter((l) => l.includes('ADAPTAÇÃO UaiUI')));
  for (let n = 1; n <= 9; n++) assert.ok(linhas.some((l) => new RegExp(`\\bA${n}\\b`).test(l)), `A${n} sem marcador`);
});

// A decisão 3 (cabeçalho mobile sem sticky) foi revertida pela decisão 11 da PR da documentação:
// o teste agora exige o sticky do Portifa e a altura nos contêineres, não em :root.
test('o chrome não declara nada em :root e o cabeçalho mobile é sticky, como no Portifa (decisão 11)', () => {
  const semComentarios = tokens.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/(^|,)\s*:root\b/m.test(semComentarios));
  assert.match(semComentarios, /--header-mobile-height:\s*calc\(var\(--scale-x4\) \* 2 \+ var\(--header-mobile-core\) \+ var\(--header-mobile-divider\)\);/);
  const hm = readFileSync('src/components/portifa-chrome/layout/HeaderMobile.astro', 'utf8');
  assert.match(hm, /\.site-header-mobile \{[^}]*position: sticky;\s*top: 0;\s*z-index: 10;/);
});
