// Conversão, tipos, serialização, árvore, config e snapshot, com dados sintéticos.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkAgainstResolver, parseConfig, targets } from '../src/lib/config.ts';
import { colorValue, convertValue, round4 } from '../src/lib/convert.ts';
import { serialize } from '../src/lib/format.ts';
import { checkSnapshot, takeSnapshot, type SnapshotVariable } from '../src/lib/snapshot.ts';
import { buildTree, flatten } from '../src/lib/tree.ts';
import { resolveTypes, suggestType, typeFromScopes } from '../src/lib/types.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO, repoConfig } from './helpers.ts';

const units = { dimension: 'px', duration: 'ms' };

test('cor: srgb com components de 4 casas, hex do valor bruto, alpha só quando ≠ 1', () => {
  const f = (n: number) => Math.fround(n / 255);
  assert.deepEqual(colorValue({ r: f(252), g: f(254), b: 1, a: 1 }), { colorSpace: 'srgb', components: [0.9882, 0.9961, 1], hex: '#fcfeff' });
  const transparent = colorValue({ r: 0, g: 0, b: 0, a: 0 });
  assert.deepEqual(Object.keys(transparent), ['colorSpace', 'components', 'alpha', 'hex']);
  assert.equal(serialize({ $value: transparent }), '{\n  "$value": { "colorSpace": "srgb", "components": [0, 0, 0], "alpha": 0, "hex": "#000000" }\n}\n');
  assert.equal(colorValue({ r: 0, g: 0, b: 0, a: 0.5 }).alpha, 0.5);
});

test('float: 4 casas, unidade da config, -0 vira 0', () => {
  assert.equal(round4(Math.fround(0.1)), 0.1);
  assert.equal(round4(-0.00001), 0);
  assert.ok(!Object.is(round4(-0.00001), -0));
  assert.deepEqual(convertValue(Math.fround(16.000001), 'dimension', units), { value: { value: 16, unit: 'px' } });
  assert.deepEqual(convertValue(100, 'duration', units), { value: { value: 100, unit: 'ms' } });
  assert.deepEqual(convertValue(700, 'fontWeight', units), { value: 700 });
  assert.deepEqual(convertValue('DM Sans', 'fontFamily', units), { value: 'DM Sans' });
  assert.match(convertValue('16', 'dimension', units).error!, /esperava número/);
  assert.match(convertValue(1, 'color', units).error!, /esperava cor/);
});

test('tipo pelos escopos', () => {
  assert.equal(typeFromScopes('COLOR', ['ALL_SCOPES']), 'color');
  assert.equal(typeFromScopes('FLOAT', ['FONT_WEIGHT']), 'fontWeight');
  assert.equal(typeFromScopes('FLOAT', ['GAP', 'WIDTH_HEIGHT']), 'dimension');
  assert.equal(typeFromScopes('FLOAT', ['FONT_SIZE']), 'dimension');
  assert.equal(typeFromScopes('FLOAT', ['ALL_SCOPES']), undefined);
  assert.equal(typeFromScopes('FLOAT', ['GAP', 'OPACITY']), undefined);
  assert.equal(typeFromScopes('FLOAT', ['FONT_WEIGHT', 'GAP']), undefined);
  assert.equal(typeFromScopes('FLOAT', []), undefined);
  assert.equal(typeFromScopes('STRING', ['FONT_FAMILY']), 'fontFamily');
  assert.equal(typeFromScopes('STRING', ['TEXT_CONTENT']), undefined);
  assert.equal(typeFromScopes('BOOLEAN', ['ALL_SCOPES']), undefined);
});

const v = (id: string, name: string, resolvedType: SnapshotVariable['resolvedType'], scopes: string[], value: SnapshotVariable['valuesByMode'][string]): SnapshotVariable =>
  ({ id, name, collectionId: 'c', resolvedType, scopes, description: '', valuesByMode: { m: value } });

test('ordem das fontes de tipo: tabela → escopo → alias → main; divergência e tipo incompatível bloqueiam', () => {
  const vars = [
    v('1', 'size/a', 'FLOAT', ['GAP'], 4),
    v('2', 'alias/b', 'FLOAT', ['ALL_SCOPES'], { type: 'VARIABLE_ALIAS', id: '1' }),
    v('3', 'alias/c', 'FLOAT', ['ALL_SCOPES'], { type: 'VARIABLE_ALIAS', id: '2' }),
    v('4', 'motion/d', 'FLOAT', ['ALL_SCOPES'], 100),
    v('5', 'old/e', 'FLOAT', ['ALL_SCOPES'], 0),
    v('6', 'new/f', 'FLOAT', ['ALL_SCOPES'], 1),
    v('7', 'div/g', 'FLOAT', ['GAP'], 1),
    v('8', 'bad/h', 'STRING', ['ALL_SCOPES'], 'x'),
    v('9', 'flag/i', 'BOOLEAN', ['ALL_SCOPES'], true),
  ];
  const main: Record<string, string> = { 'old/e': 'dimension', 'div/g': 'duration', 'alias/b': 'dimension' };
  const r = resolveTypes(vars, { table: { 'motion/d': 'duration', 'bad/h': 'dimension' }, modes: () => ['m'], mainType: (x) => main[x.name] });
  const got = Object.fromEntries(vars.map((x) => [x.name, r.get(x.id)]));
  assert.deepEqual(got['size/a'], { type: 'dimension', source: 'escopo' });
  assert.deepEqual(got['alias/b'], { type: 'dimension', source: 'alias' });
  assert.deepEqual(got['alias/c'], { type: 'dimension', source: 'alias' });
  assert.deepEqual(got['motion/d'], { type: 'duration', source: 'tabela' });
  assert.deepEqual(got['old/e'], { type: 'dimension', source: 'main' });
  assert.deepEqual(got['new/f'], {});
  assert.match(got['div/g']!.error!, /dimension \(escopo\) diverge do \$type duration da main/);
  assert.match(got['bad/h']!.error!, /não serve para variable STRING/);
  assert.deepEqual(got['flag/i'], {});
});

test('alias em modos com alvos de tipos diferentes não resolve pelo alias', () => {
  const a = v('1', 'a', 'FLOAT', ['GAP'], 1);
  const b = v('2', 'b', 'FLOAT', ['FONT_WEIGHT'], 700);
  const c: SnapshotVariable = { ...v('3', 'c', 'FLOAT', ['ALL_SCOPES'], 0), valuesByMode: { m: { type: 'VARIABLE_ALIAS', id: '1' }, n: { type: 'VARIABLE_ALIAS', id: '2' } } };
  const r = resolveTypes([a, b, c], { table: {}, modes: () => ['m', 'n'], mainType: () => undefined });
  assert.deepEqual(r.get('3'), {});
  // alias em ciclo não trava
  const x = v('4', 'x', 'FLOAT', ['ALL_SCOPES'], { type: 'VARIABLE_ALIAS', id: '5' });
  const y = v('5', 'y', 'FLOAT', ['ALL_SCOPES'], { type: 'VARIABLE_ALIAS', id: '4' });
  const r2 = resolveTypes([x, y], { table: {}, modes: () => ['m'], mainType: () => undefined });
  assert.deepEqual(r2.get('4'), {});
});

test('sugestão de tipo para a lista manual', () => {
  assert.equal(suggestType({ name: 'motion/duration/fade', resolvedType: 'FLOAT', scopes: ['ALL_SCOPES'] }), 'duration');
  assert.equal(suggestType({ name: 'overlay/opacity', resolvedType: 'FLOAT', scopes: ['ALL_SCOPES'] }), 'number');
  assert.equal(suggestType({ name: 'font/weight/body', resolvedType: 'FLOAT', scopes: ['ALL_SCOPES'] }), 'fontWeight');
  assert.equal(suggestType({ name: 'text-field/input/font-size', resolvedType: 'FLOAT', scopes: ['ALL_SCOPES'] }), 'dimension');
  assert.equal(suggestType({ name: 'font/transform/title', resolvedType: 'STRING', scopes: ['ALL_SCOPES'] }), 'string');
  assert.equal(suggestType({ name: 'x', resolvedType: 'BOOLEAN', scopes: [] }), undefined);
});

test('serialize: JSON de 2 espaços, $value objeto em uma linha, listas fora de $value em bloco', () => {
  const tree = { $description: 'd', g: { t: { $value: { value: 0, unit: 'px' } }, s: { $value: 'a' }, f: { $value: ['A', 'B'] }, e: { $value: {} } }, l: [1, { a: 2 }], z: [], o: {} };
  assert.equal(serialize(tree), [
    '{',
    '  "$description": "d",',
    '  "g": {',
    '    "t": {',
    '      "$value": { "value": 0, "unit": "px" }',
    '    },',
    '    "s": {',
    '      "$value": "a"',
    '    },',
    '    "f": {',
    '      "$value": ["A", "B"]',
    '    },',
    '    "e": {',
    '      "$value": {}',
    '    }',
    '  },',
    '  "l": [',
    '    1,',
    '    {',
    '      "a": 2',
    '    }',
    '  ],',
    '  "z": [],',
    '  "o": {}',
    '}',
    '',
  ].join('\n'));
  // Fora de $value é igual ao JSON.stringify de 2 espaços.
  const plain = { a: [1, { b: [] }], c: {}, d: 'x' };
  assert.equal(serialize(plain), JSON.stringify(plain, null, 2) + '\n');
});

test('buildTree: ordem da main, novos no fim do grupo, $type só quando não herda, metadados de grupo preservados', () => {
  const main = {
    $description: 'arquivo', $type: 'dimension',
    a: { $type: 'color', x: { $value: '{c}' }, y: { $value: '{d}' } },
    b: { p: { $value: { value: 1, unit: 'px' } }, q: { $type: 'duration', $value: { value: 1, unit: 'ms' }, $extensions: { k: 1 } } },
  };
  const tok = (id: string, type: string, value: unknown, description = '') => ({ id, path: id.split('.'), type, value, description });
  const out = buildTree(main, [
    tok('b.new', 'dimension', { value: 9, unit: 'px' }),
    tok('a.y', 'color', '{e}', 'nova descrição'),
    tok('b.q', 'duration', { value: 2, unit: 'ms' }),
    tok('a.x', 'color', '{c}'),
    tok('b.p', 'dimension', { value: 1, unit: 'px' }),
    tok('c.fw', 'fontWeight', 700),
    { ...tok('a.s', 'string', 'uppercase'), newExtensions: { ns: { nonStandardType: true } } },
  ]);
  assert.equal(serialize(out), serialize({
    $description: 'arquivo', $type: 'dimension',
    a: { $type: 'color', x: { $value: '{c}' }, y: { $description: 'nova descrição', $value: '{e}' }, s: { $type: 'string', $value: 'uppercase', $extensions: { ns: { nonStandardType: true } } } },
    b: { p: { $value: { value: 1, unit: 'px' } }, q: { $type: 'duration', $value: { value: 2, unit: 'ms' }, $extensions: { k: 1 } }, new: { $value: { value: 9, unit: 'px' } } },
    c: { fw: { $type: 'fontWeight', $value: 700 } },
  }));
  // Removido some, e grupo vazio também.
  const removed = buildTree(main, [tok('a.x', 'color', '{c}')]);
  assert.deepEqual(Object.keys(removed), ['$description', '$type', 'a']);
  assert.deepEqual([...flatten(removed).keys()], ['a.x']);
});

test('config do repositório: forma válida, 9 arquivos, bate com o resolver da main', () => {
  const config = repoConfig();
  assert.equal(targets(config).length, 9);
  const resolver = JSON.parse(readFileSync(join(REPO, config.tokensDir, config.resolver), 'utf8'));
  assert.deepEqual(checkAgainstResolver(config, resolver), { errors: [], warnings: [] });
});

test('config: erros de forma e contra o resolver', () => {
  const base = JSON.parse(readFileSync(join(REPO, 'figma-plugin/figma.config.json'), 'utf8'));
  const bad = structuredClone(base);
  bad.types['x/y'] = 'boolean';
  bad.collections.Escala.modes = { A: null, B: null };
  bad.collections.Primitivos.modes = { Claro: 'claro', Escuro: 'claro' };
  delete bad.collections.Densidade.modifier;
  const { errors } = parseConfig(JSON.stringify(bad));
  assert.ok(errors.some((e) => /types\["x\/y"\]: "boolean"/.test(e)), errors.join('\n'));
  assert.ok(errors.some((e) => /Escala.*um modo só/.test(e)));
  assert.ok(errors.some((e) => /Primitivos.*mesmo contexto/.test(e)));
  assert.ok(errors.some((e) => /Densidade.*falta modifier/.test(e)));
  assert.match(parseConfig('{').errors[0], /JSON inválido/);

  const resolver = JSON.parse(readFileSync(join(REPO, 'tokens/uaiui.resolver.json'), 'utf8'));
  const c2 = structuredClone(base);
  c2.collections.Escala.file = 'outra.json';
  c2.collections.Densidade.modes = { comfortable: 'comfortable', compact: 'compact', extra: 'extra' };
  const r = checkAgainstResolver(c2, resolver);
  assert.ok(r.errors.some((e) => /outra\.json, que não está em nenhum set/.test(e)), r.errors.join('\n'));
  assert.ok(r.errors.some((e) => /não tem modo para os contextos standard/.test(e)));
  assert.ok(r.errors.some((e) => /contextos que o modifier "densidade" não tem: extra/.test(e)));
  assert.ok(r.warnings.some((w) => /escala\.json está no resolver e não vem de nenhuma coleção/.test(w)));
});

test('snapshot: forma conferida e takeSnapshot com uma API falsa', async () => {
  assert.deepEqual(checkSnapshot({ format: 'x' }).length > 0, true);
  const api = {
    getLocalVariableCollectionsAsync: async () => [{ id: 'C1', name: 'Cores', defaultModeId: 'm1', modes: [{ modeId: 'm1', name: 'Claro' }], variableIds: ['V2', 'V1'] }],
    getLocalVariablesAsync: async () => [
      { id: 'V1', name: 'a/b', variableCollectionId: 'C1', resolvedType: 'COLOR', scopes: ['ALL_SCOPES'], description: 'x', valuesByMode: { m1: { r: 1, g: 0, b: 0, a: 1 } } },
      { id: 'V2', name: 'a/c', variableCollectionId: 'C1', resolvedType: 'COLOR', scopes: ['ALL_FILLS'], description: '', valuesByMode: { m1: { type: 'VARIABLE_ALIAS', id: 'LIB:9' } } },
    ],
    getVariableByIdAsync: async (id: string) => (id === 'LIB:9' ? { id, name: 'brand/red', remote: true, variableCollectionId: 'LC' } : null),
    getVariableCollectionByIdAsync: async () => ({ name: 'Biblioteca' }),
  };
  const s = await takeSnapshot(api, 'Arquivo', new Date('2026-11-03T00:00:00Z'));
  assert.deepEqual(checkSnapshot(s), []);
  assert.deepEqual(s.variables.map((x) => x.name), ['a/c', 'a/b']);
  assert.deepEqual(s.external, [{ id: 'LIB:9', name: 'brand/red', collectionName: 'Biblioteca', remote: true }]);
  assert.equal(s.exportedAt, '2026-11-03T00:00:00.000Z');
});

test('a config versionada já está no formato do serialize: gravar um tipo escolhido só acrescenta a linha', () => {
  const text = readFileSync(join(REPO, 'figma-plugin/figma.config.json'), 'utf8');
  assert.equal(serialize(JSON.parse(text)), text);
});
