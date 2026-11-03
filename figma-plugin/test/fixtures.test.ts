// Fixtures em arquivo: a sintética (genérica, sem nada do repositório) e o snapshot real, quando existir.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { Config } from '../src/lib/config.ts';
import { runExport, type Generator } from '../src/lib/pipeline.ts';
import { counts } from '../src/lib/report.ts';
import { flatten } from '../src/lib/tree.ts';
import { checkSnapshot, type Snapshot } from '../src/lib/snapshot.ts';
import { CONFIG_PATH, generator, repoConfig, repoFiles } from './helpers.ts';

const load = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')) as Snapshot;

test('fixture sintética: outro repositório, outra config e outro gerador', () => {
  const snapshot = load('sintetico.snapshot.json');
  assert.deepEqual(checkSnapshot(snapshot), []);
  const config: Config = {
    version: 1, tokensDir: 'design/tokens', resolver: 'r.json', outputs: { css: 'out/vars.css' }, units: { dimension: 'rem', duration: 's' },
    collections: { Base: { file: 'base.json', modes: { 'Mode 1': null } }, Cores: { folder: 'cores', modifier: 'scheme', modes: { Light: 'light', Dark: 'dark' } } },
    types: { 'motion/fast': 'duration' },
  };
  const resolver = { version: '2025.10', sets: { base: { sources: [{ $ref: 'base.json' }] } },
    modifiers: { scheme: { contexts: { light: [{ $ref: 'cores/light.json' }], dark: [{ $ref: 'cores/dark.json' }] }, default: 'light' } } };
  const main = new Map([
    ['design/tokens/r.json', JSON.stringify(resolver)],
    ['design/tokens/base.json', '{\n  "space": {\n    "$type": "dimension",\n    "sm": {\n      "$value": { "value": 4, "unit": "rem" }\n    }\n  }\n}\n'],
  ]);
  const seen: string[] = [];
  const fake: Generator = {
    validate: (read, file) => { seen.push(file, ...['base.json', 'cores/light.json', 'cores/dark.json'].map((f) => (read(f) ? f : ''))); return { errors: [], model: 1 }; },
    toCss: () => ({ css: ':root{}\n' }),
  };
  const r = runExport({ snapshot, config, configPath: 'tokens.config.json', main, generator: fake });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(seen, ['r.json', 'base.json', 'cores/light.json', 'cores/dark.json']);
  assert.deepEqual(r.sources, { tabela: 1, escopo: 4, alias: 1, main: 0 }); // COLOR resolve pelo tipo antes do alias
  assert.equal(r.files.get('design/tokens/base.json'), [
    '{', '  "space": {', '    "$type": "dimension",',
    '    "sm": {', '      "$description": "Espaço pequeno.",', '      "$value": { "value": 8, "unit": "rem" }', '    },',
    '    "md": {', '      "$value": "{space.sm}"', '    }', '  },',
    '  "motion": {', '    "fast": {', '      "$type": "duration",', '      "$value": { "value": 120, "unit": "s" }', '    }', '  },',
    '  "font": {', '    "body": {', '      "$type": "fontFamily",', '      "$value": "Inter"', '    }', '  }', '}', '',
  ].join('\n'));
  assert.equal(r.files.get('design/tokens/cores/dark.json'), [
    '{', '  "bg": {',
    '    "page": {', '      "$type": "color",', '      "$value": { "colorSpace": "srgb", "components": [0.0706, 0.0706, 0.0706], "hex": "#121212" }', '    },',
    '    "overlay": {', '      "$type": "color",', '      "$value": "{bg.page}"', '    }', '  }', '}', '',
  ].join('\n'));
  assert.match(r.files.get('design/tokens/cores/light.json')!, /"\$value": \{ "colorSpace": "srgb", "components": \[0, 0, 0\], "alpha": 0, "hex": "#000000" \}/);
  assert.equal(r.files.get('out/vars.css'), ':root{}\n');
  assert.deepEqual(counts(r.changes), { added: 5, changed: 1, removed: 0 });
});

// O snapshot real do arquivo do Figma (test/fixtures/real.snapshot.json), exportado em 2026-11-03.
const REAL = new URL('./fixtures/real.snapshot.json', import.meta.url);
const skipReal = !existsSync(REAL) && 'falta test/fixtures/real.snapshot.json';
const realSnapshot = () => JSON.parse(readFileSync(REAL, 'utf8')) as Snapshot;
// Nome que é token e também grupo de outro token: o DTCG não deixa, e o export bloqueia.
const COLLISIONS: Array<[string, string]> = [
  ['checkbox/border', 'checkbox/border/error'], ['combobox/chevron', 'combobox/chevron/weight'],
  ['dropdown-menu/separator', 'dropdown-menu/separator/margin'], ['modal/scrim', 'modal/scrim/opacity'],
  ['radio/border', 'radio/border/error'], ['slider/tick', 'slider/tick/gap'],
];

test('snapshot real contra a main do repositório', { skip: skipReal }, () => {
  const snapshot = realSnapshot();
  assert.deepEqual(checkSnapshot(snapshot), []);
  assert.equal(snapshot.variables.length, 970);
  const config = repoConfig();
  const main = repoFiles(config);
  const r = runExport({ snapshot, config, configPath: CONFIG_PATH, main, generator });
  if (process.env.REPORT) console.log(r.report, '\n', JSON.stringify({ errors: r.errors, unresolved: r.unresolved }, null, 2));
  assert.deepEqual(r.errors, COLLISIONS.map(([token, child]) => `${token}: é token e também grupo de ${child}`));
  assert.deepEqual(r.unresolved, []);
  // 771 variables novas: 6 bloqueadas pela colisão, 765 adicionadas. Nenhum token da main sai.
  assert.deepEqual(counts(r.changes), { added: 765, changed: 18, removed: 0 }, r.report);
  // Os 18 alterados: o alias da main ({x.palette.*}) passa a apontar para {x.behavior.*}, que aponta para o mesmo palette.
  const changed = [...new Set(r.changes.filter((c) => c.kind === 'changed').map((c) => c.id))];
  assert.equal(changed.length, 18);
  for (const id of changed) assert.match(id, /^interface\.function\.(primary|secondary|error)\.(normal|action|active)\.(background|txtOn)$/);
  assert.deepEqual(r.sources, { tabela: 3, escopo: 959, alias: 0, main: 8 });
  assert.ok(r.warnings.some((w) => w.includes('os 195 valores do modo são iguais (#ffffff)')), r.warnings.join('\n'));
});

test('snapshot real: as 10 variables sem escopo ficam com o $type da main, sem bloquear', { skip: skipReal }, () => {
  const snapshot = realSnapshot();
  const config = repoConfig();
  const main = repoFiles(config);
  const empty = snapshot.variables.filter((v) => v.scopes.length === 0).map((v) => v.name);
  assert.deepEqual(empty, [
    'size/scale-none', 'size/scale-half', 'size/scale-base', 'size/scale-x2', 'size/scale-x3', 'size/scale-x4', 'size/scale-x6', 'size/scale-x11',
    'motion/duration/press', 'font/transform/label',
  ]);
  const r = runExport({ snapshot, config, configPath: CONFIG_PATH, main, generator });
  const after = (file: string) => flatten(JSON.parse(r.files.get(`tokens/${file}`)!));
  const before = (file: string) => flatten(JSON.parse(main.get(`tokens/${file}`)!));
  const id = (name: string) => name.split('/').join('.');
  for (const name of empty.slice(0, 8)) {
    assert.equal(after('escala.json').get(id(name))?.type, 'dimension', name);
    assert.equal(before('escala.json').get(id(name))?.type, 'dimension', name);
  }
  // As duas da tabela dão o mesmo tipo da main, e o token sai igual ao da main.
  assert.equal(config.types!['motion/duration/press'], 'duration');
  assert.equal(config.types!['font/transform/label'], 'string');
  for (const name of ['motion/duration/press', 'font/transform/label']) {
    const a = after('dimensoes.json').get(id(name))!, b = before('dimensoes.json').get(id(name))!;
    assert.equal(a.type, config.types![name], name);
    assert.equal(b.type, config.types![name], name);
    assert.deepEqual(a.node, b.node, name);
  }
  for (const name of empty) assert.ok(!r.errors.some((e) => e.startsWith(name)), name);
});

test('snapshot real sem as 6 variables em colisão: o validador passa e o CSS sai', { skip: skipReal }, () => {
  const snapshot = realSnapshot();
  const drop = new Set(snapshot.variables.filter((v) => COLLISIONS.some(([token]) => v.name === token)).map((v) => v.id));
  assert.equal(drop.size, 6);
  snapshot.variables = snapshot.variables.filter((v) => !drop.has(v.id));
  for (const c of snapshot.collections) c.variableIds = c.variableIds.filter((id) => !drop.has(id));
  const config = repoConfig();
  const r = runExport({ snapshot, config, configPath: CONFIG_PATH, main: repoFiles(config), generator });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(counts(r.changes), { added: 765, changed: 18, removed: 0 });
  assert.equal(r.files.size, 9 + Object.keys(config.outputs).length);
  assert.match(r.files.get(config.outputs.root)!, /--modal-scrim-opacity: 0\.6;/);
});
