// Fixtures em arquivo: a sintética (genérica, sem nada do repositório) e o snapshot real, quando existir.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { Config } from '../src/lib/config.ts';
import { runExport, type Generator } from '../src/lib/pipeline.ts';
import { counts } from '../src/lib/report.ts';
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

// O snapshot real do arquivo do Figma entra como test/fixtures/real.snapshot.json.
const REAL = new URL('./fixtures/real.snapshot.json', import.meta.url);
test('snapshot real contra a main do repositório', { skip: !existsSync(REAL) && 'falta test/fixtures/real.snapshot.json' }, () => {
  const snapshot = JSON.parse(readFileSync(REAL, 'utf8')) as Snapshot;
  assert.deepEqual(checkSnapshot(snapshot), []);
  const config = repoConfig();
  const r = runExport({ snapshot, config, configPath: CONFIG_PATH, main: repoFiles(config), generator });
  const n = counts(r.changes);
  if (process.env.REPORT) console.log(r.report, '\n', JSON.stringify({ errors: r.errors, unresolved: r.unresolved }, null, 2));
  // Esperado: nenhum dos tokens atuais alterado ou removido, só adições.
  assert.deepEqual({ changed: n.changed, removed: n.removed }, { changed: 0, removed: 0 }, r.report);
});
