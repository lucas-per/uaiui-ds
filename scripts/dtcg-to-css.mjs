// Lê tokens/uaiui.resolver.json (Design Tokens 2025.10: formato, cor e resolver) e gera
// src/styles/tokens.css (site de docs, :root) e src/styles/tokens-wrapper.css (consumo por dependência, escopado em .uaiui).
// --check: não escreve nada; valida os tokens, roda o autoteste e falha se os dois CSS do repositório não baterem com o gerado.
import { readFileSync, writeFileSync } from 'node:fs';
import { validate, toCss } from './lib/tokens-core.mjs';

/** Valida e monta os dois CSS. `read(arquivo)` devolve o texto de um arquivo de tokens/. */
export function build(read, resolverFile = 'uaiui.resolver.json') {
  const { errors, model } = validate(read, resolverFile);
  return errors.length ? { errors } : { errors, ...toCss(model) };
}

/** Autoteste do validador: cada caso estraga um token e tem de falhar com a mensagem certa. */
function selfTest() {
  const px = (value) => ({ value, unit: 'px' });
  const files = () => ({
    'r.json': { version: '2025.10',
      sets: { base: { sources: [{ $ref: 'base.json' }] } },
      modifiers: {
        tema: { contexts: { claro: [{ $ref: 'claro.json' }], escuro: [{ $ref: 'escuro.json' }] }, default: 'claro' },
        densidade: { contexts: { comfortable: [{ $ref: 'd.json' }], standard: [{ $ref: 'd.json' }], compact: [{ $ref: 'd.json' }] }, default: 'comfortable' },
      },
      resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/modifiers/tema' }, { $ref: '#/modifiers/densidade' }] },
    'base.json': { size: { $type: 'dimension', x4: { $value: px(16) } }, ui: { fg: { $type: 'color', $value: '{cor.a}' } } },
    'claro.json': { $type: 'color', cor: { a: { $value: { colorSpace: 'srgb', components: [1, 1, 1], hex: '#ffffff' } } } },
    'escuro.json': { $type: 'color', cor: { a: { $value: { colorSpace: 'srgb', components: [0, 0, 0], hex: '#000000' } } } },
    'd.json': { $type: 'dimension', button: { 'padding-x': { $value: '{size.x4}' } } },
  });
  const cases = [
    ['válido', () => {}, null],
    ['alias inexistente', (f) => { f['d.json'].button['padding-x'].$value = '{size.x9}'; }, /alias inexistente/],
    ['alias em ciclo', (f) => { f['base.json'].size.x4.$value = '{button.padding-x}'; }, /alias em ciclo/],
    ['sem $type', (f) => { delete f['base.json'].size.$type; }, /sem \$type/],
    ['alias para outro tipo', (f) => { f['base.json'].ui.fg.$value = '{size.x4}'; }, /é color e aponta para size\.x4, que é dimension/],
    ['string sem extensão', (f) => { f['base.json'].t = { $type: 'string', $value: 'uppercase' }; }, /só vale com \$extensions/],
    ['valor fora do tipo', (f) => { f['base.json'].size.x4.$value = 16; }, /não é dimension válido/],
    ['hex diferente dos components', (f) => { f['claro.json'].cor.a.$value.hex = '#fefefe'; }, /não é color válido/],
    ['number válido', (f) => { f['base.json'].ui.opacity = { $type: 'number', $value: 0.6 }; }, null],
    ['number com unidade', (f) => { f['base.json'].ui.opacity = { $type: 'number', $value: { value: 0.6, unit: 'px' } }; }, /não é number válido/],
    ['contexto sem um token', (f) => { f['escuro.json'].cor.b = { $value: { colorSpace: 'srgb', components: [0, 0, 0], hex: '#000000' } }; }, /cor\.b existe em escuro e falta em claro/],
    ['token em duas camadas', (f) => { f['claro.json'].size = { x4: { $type: 'dimension', $value: px(4) } }; }, /size\.x4: definido em/],
  ];
  const failures = [];
  for (const [name, mutate, expected] of cases) {
    const f = files();
    mutate(f);
    const { errors } = build((file) => JSON.stringify(f[file]), 'r.json');
    if (expected ? !errors.some((e) => expected.test(e)) : errors.length) failures.push(`${name}: veio ${JSON.stringify(errors)}`);
  }
  // number sai sem unidade, e um alias para ele vira var().
  const f = files();
  f['base.json'].ui.opacity = { $type: 'number', $value: 0.6 };
  f['base.json'].ui.scrim = { $type: 'number', $value: '{ui.opacity}' };
  const out = build((file) => JSON.stringify(f[file]), 'r.json');
  if (!/  --ui-opacity: 0\.6;\n  --ui-scrim: var\(--ui-opacity\);/.test(out.root ?? '')) failures.push(`number no CSS: veio ${JSON.stringify(out.errors.length ? out.errors : out.root)}`);
  if (failures.length) {
    console.error('autoteste do validador falhou:\n- ' + failures.join('\n- '));
    process.exit(1);
  }
  return cases.length + 1;
}

const tokensDir = new URL('../tokens/', import.meta.url);
const { errors, root, wrapper, count } = build((file) => readFileSync(new URL(file, tokensDir), 'utf8'));
if (errors.length) {
  console.error('tokens inválidos:\n- ' + errors.join('\n- '));
  process.exit(1);
}
const outputs = [['tokens.css', root], ['tokens-wrapper.css', wrapper]].map(([f, css]) => [new URL(`../src/styles/${f}`, import.meta.url), f, css]);
if (process.argv.includes('--check')) {
  const cases = selfTest();
  const stale = outputs.filter(([url, , css]) => { try { return readFileSync(url, 'utf8') !== css; } catch { return true; } }).map(([, f]) => f);
  if (stale.length) {
    console.error(`desatualizado em relação a tokens/: ${stale.join(', ')}. Rode npm run tokens.`);
    process.exit(1);
  }
  console.log(`tokens: ok, ${count} tokens válidos, aliases resolvidos em todos os modos, CSS em dia (autoteste: ${cases} casos)`);
} else {
  for (const [url, f, css] of outputs) {
    writeFileSync(url, css);
    console.log(`${f}:`, css.split('\n').length, 'linhas');
  }
}
