// Colisão entre os tokens do chrome (Portifa) e os da UaiUI.
// Rodar na raiz: node --test "tests/portifa-chrome/*.test.mjs"
// Não faz parte do `npm run check` nem do CI (ver docs/CHROME-PORTIFA.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const props = (css) => [...css.matchAll(/^\s*(--[a-zA-Z0-9_-]+)\s*:/gm)].map((m) => m[1]);
const uaiui = new Set(props(readFileSync('src/styles/tokens.css', 'utf8')));
const chrome = readFileSync('src/styles/portifa-chrome/tokens.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// Separa o que está em :root do que está nos quatro contêineres.
const blocos = [...chrome.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ seletor: m[1].trim().replace(/\s+/g, ' '), props: props(m[2]) }));
const emRoot = blocos.filter((b) => /(^|,)\s*:root\b/.test(b.seletor)).flatMap((b) => b.props);
const CONTEINERES = '.site-header, .site-header-mobile, .site-footer, .site-footer-mobile';
const emConteineres = blocos.filter((b) => b.seletor === CONTEINERES).flatMap((b) => b.props);

test('colisão: propriedades do chrome x os nomes da UaiUI', () => {
  const intersecaoRoot = emRoot.filter((p) => uaiui.has(p));
  const intersecaoConteineres = [...new Set(emConteineres.filter((p) => uaiui.has(p)))];
  console.log(`nomes únicos da UaiUI (tokens.css): ${uaiui.size}`);
  console.log(`propriedades do chrome nos quatro contêineres: ${emConteineres.length}`);
  console.log(`propriedades do chrome em :root: ${emRoot.length}${emRoot.length ? ' (' + emRoot.join(', ') + ')' : ''}`);
  console.log(`interseção em :root: ${intersecaoRoot.length}`);
  console.log(`interseção nos contêineres: ${intersecaoConteineres.length}${intersecaoConteineres.length ? ' (' + intersecaoConteineres.join(', ') + ')' : ''}`);
  assert.equal(uaiui.size, 970);
  assert.equal(emRoot.length, 0, 'nada do chrome em :root (decisão 3)');
  assert.deepEqual(intersecaoRoot, []);
  assert.equal(new Set(emConteineres).size, emConteineres.length, 'nenhuma propriedade repetida nos contêineres');
  // Os dois nomes de família existem nos dois lados de propósito: no chrome valem só dentro dos contêineres
  // e apontam para as famílias "Portifa ..." (decisão 1).
  assert.deepEqual(intersecaoConteineres.sort(), ['--font-family-body', '--font-family-label']);
});

test('nenhum bloco do CSS de tokens do chrome fica fora dos quatro contêineres', () => {
  assert.deepEqual(blocos.map((b) => b.seletor), [CONTEINERES]);
});
