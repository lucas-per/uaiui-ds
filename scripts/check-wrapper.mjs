// Falha se tokens-wrapper.css tiver seletor fora de .uaiui, :root, html, body ou prefers-color-scheme.
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/tokens-wrapper.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const errors = [];
if (/:root|prefers-color-scheme|@media/.test(css)) errors.push('contém :root, @media ou prefers-color-scheme');
if (/(^|[\s,{}>+~])(html|body)\b/.test(css)) errors.push('contém seletor html ou body');
for (const m of css.matchAll(/([^{}]+)\{/g)) {
  for (const sel of m[1].split(',').map((s) => s.trim())) {
    if (!/^\.uaiui(\[data-uaiui-(theme|density)="[a-z]+"\])*$/.test(sel)) errors.push(`seletor fora de .uaiui: "${sel}"`);
  }
}
if (errors.length) {
  console.error('tokens-wrapper.css vaza do wrapper:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log('tokens-wrapper.css: ok, tudo escopado em .uaiui');
