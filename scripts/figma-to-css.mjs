// Converte tokens/figma-variables.txt em src/styles/tokens.css (site de docs, :root)
// e src/styles/tokens-wrapper.css (consumo por dependência, escopado em .uaiui)
import { readFileSync, writeFileSync } from 'node:fs';

const cssName = (n) => '--' + n.replace(/\//g, '-');
const rows = readFileSync(new URL('../tokens/figma-variables.txt', import.meta.url), 'utf8')
  .split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split('|'));

// Medidas saem em rem (px do Figma ÷ 16) para acompanharem o tamanho de texto do usuário.
// Forma, traço, sombra, foco e raio continuam em px, com o alias resolvido até o valor final.
// Alvos de toque nunca ficam abaixo de 44 px; quem aponta por alias para um deles herda o max().
const keepPx = (name) => /^(border\/width|shadow\/offset|focus\/ring|radius)\//.test(name) || /\/weight$/.test(name);
const TOUCH = ['button/min-height', 'icon-button/size', 'chip/min-height', 'chip-removable/min-height',
  'chip-removable/remove/size', 'combobox-option/min-height', 'menu-item/min-height'];
const isNum = (v) => /^-?\d+(\.\d+)?$/.test(v);
const rem = (v) => (v === '0' ? '0' : `${Number((Number(v) / 16).toFixed(4))}rem`);
const byName = new Map(rows.map((r) => [r[1], r]));
// i = coluna do modo (2 Desktop, 3 Mobile, 4 Compacto); fora de Densidade só existe a coluna 2.
const resolve = (name, i, seen = []) => {
  const row = byName.get(name);
  if (!row || seen.includes(name)) throw new Error(`alias sem fim ou inexistente: ${[...seen, name].join(' → ')}`);
  const v = row[0] === 'Densidade' ? row[i] : row[2];
  return v.startsWith('@') ? resolve(v.slice(1), i, [...seen, name]) : v;
};

const val = (name, v, i) => {
  if (keepPx(name)) {
    const f = resolve(name, i);
    if (!isNum(f)) throw new Error(`${name} deveria resolver para número, deu ${f}`);
    return f === '0' ? '0' : `${f}px`;
  }
  let out;
  if (v.startsWith('@')) out = `var(${cssName(v.slice(1))})`;
  else if (isNum(v) && name.startsWith('font/weight')) return v;
  else if (isNum(v)) out = name.includes('duration') ? `${v}ms` : rem(v);
  else return v;
  const inherits = v.startsWith('@') && TOUCH.includes(v.slice(1));
  return TOUCH.includes(name) && !inherits ? `max(44px, ${out})` : out;
};
const by = (c) => rows.filter((r) => r[0] === c);
const decl = (name, v, i = 2) => `  ${cssName(name)}: ${val(name, v, i)};`;
const block = (sel, lines) => `${sel} {\n${lines.join('\n')}\n}\n`;

const light = by('Primitivos').map((r) => decl(r[1], r[2]));
const dark = by('Primitivos').map((r) => decl(r[1], r[3]));
const fixed = ['Escala', 'Dimensões', 'Semântica', 'Componente'].flatMap((c) => by(c).map((r) => decl(r[1], r[2])));
const dens = (i) => by('Densidade').map((r) => decl(r[1], r[i], i));

const out = [
  '/* Gerado por scripts/figma-to-css.mjs a partir de tokens/figma-variables.txt. Não edite à mão. */\n',
  block(':root', [...light, ...fixed, ...dens(2)]),
  block(':root[data-theme="dark"]', dark),
  `@media (prefers-color-scheme: dark) {\n${block('  :root:not([data-theme="light"])', dark.map((l) => '  ' + l))}}\n`,
  block(':root[data-density="mobile"]', dens(3)),
  block(':root[data-density="compact"]', dens(4)),
].join('\n');
writeFileSync(new URL('../src/styles/tokens.css', import.meta.url), out);
console.log('tokens.css:', out.split('\n').length, 'linhas');

// Versão escopada: tudo no próprio .uaiui (aliases var() resolvem no wrapper e nada vaza).
// Tema só por data-uaiui-theme (sem atributo: claro, sem prefers-color-scheme).
const W = '.uaiui';
const wrapper = [
  '/* Gerado por scripts/figma-to-css.mjs a partir de tokens/figma-variables.txt. Não edite à mão. */',
  '/* Tokens escopados no wrapper .uaiui. Tema: data-uaiui-theme="dark" (padrão: claro). Densidade: data-uaiui-density="mobile|compact" (padrão: Desktop). */\n',
  block(W, [...light, ...fixed, ...dens(2)]),
  block(`${W}[data-uaiui-theme="dark"]`, dark),
  block(`${W}[data-uaiui-density="mobile"]`, dens(3)),
  block(`${W}[data-uaiui-density="compact"]`, dens(4)),
].join('\n');
writeFileSync(new URL('../src/styles/tokens-wrapper.css', import.meta.url), wrapper);
console.log('tokens-wrapper.css:', wrapper.split('\n').length, 'linhas');
