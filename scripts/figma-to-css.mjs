// Converte tokens/figma-variables.txt em src/styles/tokens.css
import { readFileSync, writeFileSync } from 'node:fs';

const cssName = (n) => '--' + n.replace(/\//g, '-');
const rows = readFileSync(new URL('../tokens/figma-variables.txt', import.meta.url), 'utf8')
  .split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split('|'));

const val = (name, v) => {
  if (v.startsWith('@')) return `var(${cssName(v.slice(1))})`;
  if (/^-?\d+(\.\d+)?$/.test(v)) return name.includes('duration') ? `${v}ms` : v === '0' ? '0' : `${v}px`;
  return v;
};
const by = (c) => rows.filter((r) => r[0] === c);
const decl = (name, v) => `  ${cssName(name)}: ${val(name, v)};`;
const block = (sel, lines) => `${sel} {\n${lines.join('\n')}\n}\n`;

const light = by('Primitivos').map((r) => decl(r[1], r[2]));
const dark = by('Primitivos').map((r) => decl(r[1], r[3]));
const fixed = ['Escala', 'Dimensões', 'Semântica', 'Componente'].flatMap((c) => by(c).map((r) => decl(r[1], r[2])));
const dens = (i) => by('Densidade').map((r) => decl(r[1], r[i]));

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
