// Gera dist/code.js (thread do Figma) e dist/ui.html (interface com o JS embutido).
// O gerador de CSS do repositório entra pelo alias "tokens-generator":
//   node build.mjs [--watch] [--generator=../scripts/lib/tokens-core.mjs]
import * as esbuild from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const option = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const watch = process.argv.includes('--watch');
const generator = here(option('generator', '../scripts/lib/tokens-core.mjs'));

mkdirSync(here('dist'), { recursive: true });

const writeHtml = (js) => {
  const safe = js.replace(/<\/script/gi, '<\\/script');
  // Função como substituto: o JS pode ter "$&" ou "$'", que o replace com string interpretaria.
  const html = readFileSync(here('src/ui.html'), 'utf8').replace('<!--SCRIPT-->', () => `<script>${safe}</script>`);
  writeFileSync(here('dist/ui.html'), html);
};

const code = {
  entryPoints: [here('src/code.ts')], bundle: true, outfile: here('dist/code.js'),
  format: 'iife', target: 'es2017', logLevel: 'info',
};
const ui = {
  entryPoints: [here('src/ui.ts')], bundle: true, write: false, outfile: here('dist/ui.js'),
  format: 'iife', target: 'es2020', minify: !watch, alias: { 'tokens-generator': generator }, logLevel: 'info',
  plugins: [{ name: 'inline-html', setup(b) { b.onEnd((r) => { if (!r.errors.length) writeHtml(r.outputFiles[0].text); }); } }],
};

if (watch) {
  await (await esbuild.context(code)).watch();
  await (await esbuild.context(ui)).watch();
  console.log('observando src/ e o gerador…');
} else {
  await esbuild.build(code);
  await esbuild.build(ui);
  console.log(`dist/ui.html com o gerador ${generator}`);
}
