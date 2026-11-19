// Testes do tema dos exemplos (D13 em docs/DOCS-PORTIFA.md; adição deste repositório, não cópia do Portifa).
// Rodar na raiz, depois de `npm run build`:
//   node --test "tests/portifa-docs/*.test.mjs"
// O comportamento no navegador (antes da pintura, combinações tema × densidade, teclado, contraste) foi medido
// no Chromium e está no relatório da PR; aqui fica o que dá para garantir lendo o código e o HTML gerado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const semComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const arquivos = (dir, ext) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? arquivos(p, ext) : p.endsWith(ext) ? [p] : []; });
const cssTema = 'src/styles/portifa-docs/uaiui-docs-tema.css';
const semBuild = !existsSync('dist') && 'rode npm run build antes';

test('CSS do tema: nenhuma propriedade nova (zero colisão com o wrapper do DS) e todo seletor começa por .uaiui-docs', () => {
  const css = semComentarios(readFileSync(cssTema, 'utf8'));
  assert.deepEqual([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]), [], 'o CSS do tema não declara custom properties');
  const seletores = [...css.matchAll(/([^{};]+)\{/g)].map((m) => m[1].trim()).filter((s) => !s.startsWith('@')).flatMap((s) => s.split(',').map((x) => x.trim()));
  assert.ok(seletores.length > 0);
  for (const s of seletores) assert.ok(s.startsWith('.uaiui-docs'), s);
  assert.match(readFileSync('src/layouts/DocsLayout.astro', 'utf8'), /import '\.\.\/styles\/portifa-docs\/uaiui-docs-tema\.css';/);
});

test('HTML gerado: cada exemplo tem palco .uaiui sem tema fixo, Densidade | Tema na mesma linha e Claro marcado', { skip: semBuild }, () => {
  let exemplos = 0;
  for (const p of arquivos('dist', '.html')) {
    const html = readFileSync(p, 'utf8');
    const n = (html.match(/data-example/g) ?? []).length;
    const palcos = [...html.matchAll(/<div class="([^"]*\buaiui-docs__stage\b[^"]*)"([^>]*)>/g)];
    assert.equal(palcos.length, n, `${p}: um palco por exemplo`);
    for (const [, classes, resto] of palcos) {
      assert.match(classes, /(^|\s)uaiui(\s|$)/, `${p}: palco sem a classe uaiui`);
      assert.doesNotMatch(resto, /data-uaiui-(theme|density)/, `${p}: palco com tema ou densidade fixos no HTML`);
    }
    const linhas = [...html.matchAll(/<div class="uaiui-docs__controls">\s*<fieldset class="uaiui-docs__density" data-density>[\s\S]*?<\/fieldset>\s*<fieldset class="uaiui-docs__density uaiui-docs__theme" data-theme>([\s\S]*?)<\/fieldset>\s*<\/div>/g)];
    assert.equal(linhas.length, n, `${p}: uma linha Densidade | Tema por exemplo, nesta ordem`);
    const nomes = [];
    for (const [, tema] of linhas) {
      assert.match(tema, /<legend class="uaiui-docs__density-legend">Tema<\/legend>/);
      const radios = [...tema.matchAll(/<input class="uaiui-docs__segment-input" type="radio" name="([^"]+)" value="(\w+)"( checked)?>\s*<span class="uaiui-docs__segment-text">([^<]+)<\/span>/g)];
      assert.deepEqual(radios.map((r) => [r[2], r[4], Boolean(r[3])]), [['light', 'Claro', true], ['dark', 'Escuro', false]]);
      assert.equal(radios[0][1], radios[1][1]);
      assert.match(radios[0][1], /^uaiui-ex-[\w-]+-tema$/);
      nomes.push(radios[0][1]);
    }
    assert.equal(new Set(nomes).size, nomes.length, `${p}: name de tema repetido entre exemplos`);
    exemplos += n;
  }
  console.log(`exemplos com controle de tema: ${exemplos}`);
  assert.ok(exemplos >= 8);
});

test('HTML gerado: a moldura e o bloco de código não recebem o tema', { skip: semBuild }, () => {
  for (const p of arquivos('dist', '.html')) {
    const html = readFileSync(p, 'utf8');
    // Fora de scripts, <pre> e <code> (texto e código de exemplo), data-uaiui-theme não aparece: nenhum elemento sai com o tema no HTML.
    const marcacao = html.replace(/<script[\s\S]*?<\/script>|<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>/g, '');
    assert.doesNotMatch(marcacao, /data-uaiui-theme/, `${p}: elemento com data-uaiui-theme no HTML`);
    for (const [, painel] of html.matchAll(/<div role="tabpanel" id="[^"]+-cp"[^>]*>([\s\S]*?<\/pre>)/g)) {
      assert.doesNotMatch(painel, /class="[^"]*\buaiui\b(?!-)/, `${p}: .uaiui dentro do painel Código`);
    }
  }
  const tema = readFileSync('src/components/portifa-docs/tema.ts', 'utf8');
  assert.doesNotMatch(tema, /root\.setAttribute\('data-uaiui-theme'/, 'tema.ts não põe o tema no wrapper');
});

test('script antes da pintura e tema.ts: chave uaiui-theme, só "dark" vale, cópia da densidade; chaves antigas ignoradas', { skip: semBuild }, () => {
  const layout = readFileSync('src/layouts/DocsLayout.astro', 'utf8');
  const inline = /<script is:inline>\s*\/\/ ADAPTAÇÃO UaiUI: tema dos exemplos \(D13[\s\S]*?<\/script>/.exec(layout)?.[0];
  assert.ok(inline, 'script inline do tema no layout');
  assert.ok(layout.indexOf(inline) < layout.indexOf('uaiui-docs__top'), 'o script do tema vem antes dos palcos (início do wrapper)');
  assert.ok(layout.indexOf("localStorage.getItem('uaiui-density')") < layout.indexOf(inline), 'e depois do script da densidade');
  assert.match(inline, /localStorage\.getItem\('uaiui-theme'\) === 'dark'/);
  assert.match(inline, /setAttribute\('data-uaiui-theme', 'dark'\)/);
  assert.match(inline, /setAttribute\('data-uaiui-density', density\)/);
  assert.match(inline, /new MutationObserver/);
  const tema = readFileSync('src/components/portifa-docs/tema.ts', 'utf8');
  assert.match(tema, /const KEY = 'uaiui-theme';/);
  assert.match(tema, /localStorage\.getItem\(KEY\) === 'dark'/);
  assert.match(tema, /localStorage\.removeItem\(KEY\)/, 'Claro apaga a chave');
  assert.match(tema, /attributeFilter: \['data-uaiui-density'\]/);
  assert.doesNotMatch(tema, /prefers-color-scheme/, 'não segue o tema do sistema');
  // Nada lê as chaves antigas do site anterior.
  const lidos = [...arquivos('dist', '.html'), ...arquivos('dist/_astro', '.js'), 'src/layouts/DocsLayout.astro', ...arquivos('src/components/portifa-docs', '.ts')];
  for (const f of lidos) assert.doesNotMatch(readFileSync(f, 'utf8'), /['"]uai-(theme|density)['"]/, f);
  // O tema.ts entra no bundle.
  assert.ok(arquivos('dist/_astro', '.js').some((f) => readFileSync(f, 'utf8').includes('uaiui-theme')), 'tema.ts no JS gerado');
});

test('frase "Use os controles de cada exemplo para ver." só na Introdução', () => {
  assert.match(readFileSync('src/pages/index.astro', 'utf8'), /mudam tamanhos\. Use os controles de cada exemplo para ver\.<\/li>/);
  assert.doesNotMatch(readFileSync('src/pages/tokens.astro', 'utf8'), /Use os controles/);
});
