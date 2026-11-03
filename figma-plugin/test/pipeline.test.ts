// Export completo sobre o snapshot da main com mudanças: erros que bloqueiam, avisos, diff e relatório.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runExport, type ExportInput } from '../src/lib/pipeline.ts';
import { counts } from '../src/lib/report.ts';
import type { Snapshot, SnapshotVariable } from '../src/lib/snapshot.ts';
import { CONFIG_PATH, collection, generator, modeOf, repoConfig, repoFiles, snapshotFromRepo, variable } from './helpers.ts';

const config = repoConfig();
const main = repoFiles(config);
const run = (snapshot: Snapshot, extra: Partial<ExportInput> = {}) =>
  runExport({ snapshot, config, configPath: CONFIG_PATH, main, generator, base: { branch: 'main', sha: '0123456789abcdef' }, ...extra });

const addVariable = (s: Snapshot, col: string, v: Omit<SnapshotVariable, 'id' | 'collectionId'>) => {
  const c = collection(s, col);
  const id = `VariableID:new:${s.variables.length}`;
  s.variables.push({ ...v, id, collectionId: c.id });
  c.variableIds.push(id);
  return id;
};
const allModes = (s: Snapshot, col: string, value: SnapshotVariable['valuesByMode'][string]) =>
  Object.fromEntries(collection(s, col).modes.map((m) => [m.modeId, value]));

test('adição em todos os modos de Densidade (16 px), sem alterar os 199', () => {
  const s = snapshotFromRepo(config, main);
  addVariable(s, 'Densidade', { name: 'text-field/input/font-size', resolvedType: 'FLOAT', scopes: ['FONT_SIZE'], description: 'Fonte do campo.', valuesByMode: allModes(s, 'Densidade', 16) });
  const r = run(s);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(counts(r.changes), { added: 1, changed: 0, removed: 0 });
  assert.deepEqual(r.changes.map((c) => c.mode), ['comfortable', 'standard', 'compact']);
  assert.deepEqual(r.changedFiles.sort(), [
    'src/styles/tokens-wrapper.css', 'src/styles/tokens.css',
    'tokens/densidade/comfortable.json', 'tokens/densidade/compact.json', 'tokens/densidade/standard.json',
  ]);
  const compact = r.files.get('tokens/densidade/compact.json')!;
  assert.ok(compact.endsWith('  "text-field": {\n    "input": {\n      "font-size": {\n        "$description": "Fonte do campo.",\n        "$value": { "value": 16, "unit": "px" }\n      }\n    }\n  }\n}\n'), compact.slice(-300));
  assert.match(r.files.get('src/styles/tokens.css')!, /--text-field-input-font-size: 1rem;/);
  assert.match(r.report, /\| Adicionados \| 1 \|/);
  assert.match(r.report, /`text-field\.input\.font-size` `dimension` \(comfortable: `16px` · standard: `16px` · compact: `16px`\)/);
  assert.match(r.report, /base: `main` em `0123456`/);
});

test('alteração e remoção aparecem por token e por modo, com antes → depois', () => {
  const s = snapshotFromRepo(config, main);
  const pad = variable(s, 'button/padding-x');
  pad.valuesByMode[modeOf(s, 'Densidade', 'compact')] = { type: 'VARIABLE_ALIAS', id: variable(s, 'size/scale-x3').id };
  const surface = variable(s, 'marca/neutrals/surface/10');
  surface.valuesByMode[modeOf(s, 'Primitivos', 'Escuro')] = { r: 1, g: 0, b: 0, a: 1 };
  const idx = s.variables.findIndex((v) => v.name === 'button/ghost/padding-x');
  collection(s, 'Dimensões').variableIds = collection(s, 'Dimensões').variableIds.filter((id) => id !== s.variables[idx].id);
  s.variables.splice(idx, 1);
  const r = run(s);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(counts(r.changes), { added: 0, changed: 2, removed: 1 });
  const changed = r.changes.filter((c) => c.kind === 'changed');
  assert.deepEqual(changed.map((c) => [c.id, c.mode, c.fields]).sort(), [
    ['button.padding-x', 'compact', ['value']],
    ['marca.neutrals.surface.10', 'Escuro', ['value']],
  ]);
  assert.match(r.report, /`button\.padding-x` compact: `\{size\.scale-x4\}` → `\{size\.scale-x3\}`/);
  assert.match(r.report, /`marca\.neutrals\.surface\.10` Escuro: `#[0-9a-f]{6}` → `#ff0000`/);
  assert.match(r.report, /### Removidos \(1\)\n\n- `button\.ghost\.padding-x` \(`0px`\)/);
  assert.ok(r.warnings.some((w) => /1 token\(s\) da main não existem mais no Figma/.test(w)));
});

test('modo da config que não existe: falha listando os modos reais', () => {
  const s = snapshotFromRepo(config, main);
  collection(s, 'Escala').modes[0].name = 'Mode 1';
  const r = run(s);
  assert.ok(r.errors.some((e) => e === 'O modo "Valor" da coleção "Escala" não existe no Figma. Modos encontrados: "Mode 1".'), r.errors.join('\n'));
  assert.ok(r.errors.some((e) => /"Escala" tem o modo "Mode 1", que não está em modes nem em ignoreModes/.test(e)));
  assert.equal(r.files.size, 0);
});

test('coleção da config que não existe: falha listando as coleções reais; coleção a mais só avisa', () => {
  const s = snapshotFromRepo(config, main);
  collection(s, 'Componente').name = 'Componentes';
  s.collections.push({ id: 'X', name: 'Rascunho', defaultModeId: 'x', modes: [{ modeId: 'x', name: 'Mode 1' }], variableIds: [] });
  const r = run(s);
  assert.ok(r.errors.some((e) => /A coleção "Componente" da config não existe no Figma\. Coleções encontradas: "Escala", .*"Componentes".*"Rascunho"/.test(e)), r.errors.join('\n'));
  assert.ok(r.warnings.some((w) => /"Componentes" não está na config/.test(w)));
});

test('variable nova sem tipo bloqueia, com sugestão; o tipo escolhido entra na config e destrava', () => {
  const s = snapshotFromRepo(config, main);
  addVariable(s, 'Dimensões', { name: 'motion/duration/fade', resolvedType: 'FLOAT', scopes: ['ALL_SCOPES'], description: '', valuesByMode: allModes(s, 'Dimensões', 200) });
  const r = run(s);
  assert.deepEqual(r.unresolved.map((u) => [u.name, u.suggestion, u.allowed]), [['motion/duration/fade', 'duration', ['dimension', 'duration', 'fontWeight', 'number']]]);
  assert.ok(r.errors.some((e) => /1 variable\(s\) nova\(s\) sem tipo/.test(e)));
  assert.equal(r.files.has('src/styles/tokens.css'), false);

  const r2 = run(s, { typeChoices: { 'motion/duration/fade': 'duration' } });
  assert.deepEqual(r2.errors, []);
  assert.equal(r2.sources.tabela, 3);
  const cfg = JSON.parse(r2.files.get(CONFIG_PATH)!);
  assert.equal(cfg.types['motion/duration/fade'], 'duration');
  assert.ok(r2.changedFiles.includes(CONFIG_PATH));
  assert.ok(!Object.keys(r2.zipFiles()).includes(CONFIG_PATH));
  assert.match(r2.files.get('tokens/dimensoes.json')!, /"fade": \{\n {8}"\$type": "duration",\n {8}"\$value": \{ "value": 200, "unit": "ms" \}/);
});

test('token existente com ALL_SCOPES usa o $type da main; tipo derivado divergente bloqueia', () => {
  const s = snapshotFromRepo(config, main);
  variable(s, 'size/scale-x4').scopes = ['ALL_SCOPES'];
  const r = run(s);
  assert.deepEqual(r.errors, []);
  assert.equal(r.sources.main, 2);

  variable(s, 'motion/duration/press').scopes = ['GAP'];
  const r2 = run(s, { config: { ...config, types: { 'font/transform/label': 'string' } } });
  assert.ok(r2.errors.some((e) => e === 'motion/duration/press: tipo dimension (escopo) diverge do $type duration da main'), r2.errors.join('\n'));
});

test('string nova recebe as $extensions da config; a existente mantém as da main', () => {
  const s = snapshotFromRepo(config, main);
  addVariable(s, 'Dimensões', { name: 'font/transform/title', resolvedType: 'STRING', scopes: ['ALL_SCOPES'], description: '', valuesByMode: allModes(s, 'Dimensões', 'uppercase') });
  const r = run(s, { typeChoices: { 'font/transform/title': 'string' } });
  assert.deepEqual(r.errors, []);
  const dims = JSON.parse(r.files.get('tokens/dimensoes.json')!);
  assert.deepEqual(dims.font.transform.title.$extensions, { 'me.lpereira.uaiui': { nonStandardType: true } });
  assert.equal(dims.font.transform.label.$extensions['me.lpereira.uaiui'].cssProperty, 'text-transform');
});

test('alias quebrado, alias para fora da config e alias remoto bloqueiam', () => {
  const s = snapshotFromRepo(config, main);
  const m = modeOf(s, 'Componente', 'Valor');
  variable(s, 'button/border').valuesByMode[m] = { type: 'VARIABLE_ALIAS', id: 'VariableID:sumiu' };
  s.collections.push({ id: 'X', name: 'Rascunho', defaultModeId: 'x', modes: [{ modeId: 'x', name: 'Mode 1' }], variableIds: ['VX'] });
  s.variables.push({ id: 'VX', name: 'rascunho/cor', collectionId: 'X', resolvedType: 'COLOR', scopes: [], description: '', valuesByMode: { x: { r: 0, g: 0, b: 0, a: 1 } } });
  variable(s, 'accordion/border').valuesByMode[m] = { type: 'VARIABLE_ALIAS', id: 'VX' };
  s.external.push({ id: 'LIB:1', name: 'brand/red', collectionName: 'Marca', remote: true });
  variable(s, 'toast/txtOn').valuesByMode[m] = { type: 'VARIABLE_ALIAS', id: 'LIB:1' };
  const r = run(s);
  assert.ok(r.errors.includes('button/border: alias quebrado (VariableID:sumiu não existe)'), r.errors.join('\n'));
  assert.ok(r.errors.includes('accordion/border: alias para rascunho/cor, de uma coleção que não está na config'));
  assert.ok(r.errors.includes('toast/txtOn: alias para brand/red (coleção "Marca"), que não é variable local (vem de biblioteca)'));
  // Os tokens com erro não aparecem como removidos.
  assert.equal(r.changes.filter((c) => c.kind === 'removed').length, 0);
});

test('colisões de nome bloqueiam: ".", mesmo nome em duas coleções, token que também é grupo', () => {
  const s = snapshotFromRepo(config, main);
  variable(s, 'size/scale-x2').name = 'size/scale.x2';
  addVariable(s, 'Componente', { name: 'size/scale-x3', resolvedType: 'COLOR', scopes: ['ALL_FILLS'], description: '', valuesByMode: allModes(s, 'Componente', { r: 0, g: 0, b: 0, a: 1 }) });
  addVariable(s, 'Componente', { name: 'toast/txtOn/extra', resolvedType: 'COLOR', scopes: ['ALL_FILLS'], description: '', valuesByMode: allModes(s, 'Componente', { r: 0, g: 0, b: 0, a: 1 }) });
  const r = run(s);
  assert.ok(r.errors.some((e) => /^size\/scale\.x2: parte do nome/.test(e)), r.errors.join('\n'));
  assert.ok(r.errors.includes('size/scale-x3: o mesmo nome existe nas coleções "Escala" e "Componente"'));
  assert.ok(r.errors.includes('toast/txtOn: é token e também grupo de toast/txtOn/extra'));
});

test('erros do validador do repositório entram como bloqueio (alpha entre 0 e 1)', () => {
  const s = snapshotFromRepo(config, main);
  variable(s, 'marca/neutrals/surface/10').valuesByMode[modeOf(s, 'Primitivos', 'Claro')] = { r: 0, g: 0, b: 0, a: 0.5 };
  const r = run(s);
  assert.ok(r.errors.some((e) => /^validador: primitivos\/claro\.json: marca\.neutrals\.surface\.10: \$value .* não é color válido/.test(e)), r.errors.join('\n'));
  assert.equal(r.files.has('src/styles/tokens.css'), false);
});

test('modo ignorado com valores diferentes avisa a contagem; arquivo do Figma com outro nome avisa', () => {
  const s = snapshotFromRepo(config, main, 'Cópia de tokens');
  const neg = modeOf(s, 'Semântica', 'Negativa');
  const sem = s.variables.filter((v) => v.collectionId === collection(s, 'Semântica').id);
  sem[0].valuesByMode[neg] = { r: 1, g: 1, b: 1, a: 1 };
  sem[1].valuesByMode[neg] = { r: 1, g: 1, b: 1, a: 1 };
  const r = run(s);
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.includes(`Coleção "Semântica": o modo "Negativa" não foi exportado. Motivo na config: "Não exportado: no Figma o modo Negativa só tem placeholders (#ffffff); Semântica fica no set base com o modo Positiva". No Figma, 2 dos ${sem.length} valores dele diferem do modo "Positiva". Foi exportado só o modo "Positiva".`), r.warnings.join('\n'));
  assert.ok(r.warnings.includes('O arquivo aberto é "Cópia de tokens", e a config espera "UaiUI – Design Tokens".'));
});

test('descrição da variable vira $description e aparece como alteração', () => {
  const s = snapshotFromRepo(config, main);
  variable(s, 'size/scale-x4').description = 'Base 16.';
  const r = run(s);
  assert.deepEqual(r.errors, []);
  const c = r.changes.find((x) => x.kind === 'changed')!;
  assert.deepEqual([c.id, c.mode, c.fields], ['size.scale-x4', null, ['description']]);
  assert.match(r.files.get('tokens/escala.json')!, /"scale-x4": \{\n {6}"\$description": "Base 16\.",\n {6}"\$value"/);
  assert.match(r.report, /`size\.scale-x4` \$description `—` → `Base 16\.`/);
});

test('number (escopo OPACITY) passa pelo validador e sai sem unidade no CSS', () => {
  const s = snapshotFromRepo(config, main);
  addVariable(s, 'Componente', { name: 'modal/scrim/opacity', resolvedType: 'FLOAT', scopes: ['OPACITY'], description: '', valuesByMode: allModes(s, 'Componente', Math.fround(0.6)) });
  // Sem a linha na tabela, cai nos tipos manuais com sugestão number.
  const { ['modal/scrim/opacity']: _, ...types } = config.types;
  const r = run(s, { config: { ...config, types } });
  assert.deepEqual(r.unresolved.map((u) => [u.name, u.suggestion]), [['modal/scrim/opacity', 'number']]);
  // Com a config do repositório, resolve pela tabela.
  const r2 = run(s);
  assert.deepEqual(r2.errors, []);
  assert.equal(r2.sources.tabela, 3);
  assert.match(r2.files.get('tokens/componente.json')!, /"opacity": \{\n {8}"\$type": "number",\n {8}"\$value": 0\.6\n/);
  assert.match(r2.files.get('src/styles/tokens.css')!, /\n {2}--modal-scrim-opacity: 0\.6;\n/);
  assert.match(r2.files.get('src/styles/tokens-wrapper.css')!, /\n {2}--modal-scrim-opacity: 0\.6;\n/);
});

test('modo ignorado só com placeholder: o aviso diz que os valores são placeholders, sem o motivo da config', () => {
  const s = snapshotFromRepo(config, main);
  const neg = modeOf(s, 'Semântica', 'Negativa');
  const sem = s.variables.filter((v) => v.collectionId === collection(s, 'Semântica').id);
  for (const v of sem) v.valuesByMode[neg] = { r: 1, g: 1, b: 1, a: 1 };
  const r = run(s);
  assert.deepEqual(r.errors, []);
  const w = r.warnings.find((x) => x.startsWith('Coleção "Semântica"'))!;
  assert.equal(w, `Coleção "Semântica": o modo "Negativa" não foi exportado. No Figma, os ${sem.length} valores dele são placeholders (#ffffff). Foi exportado só o modo "Positiva".`);
});

test('modo ignorado numa coleção com 3 modos: lista os modos exportados e usa o singular quando 1 valor difere', () => {
  const modes = [{ modeId: 'm1', name: 'Confortável' }, { modeId: 'm2', name: 'Padrão' }, { modeId: 'm3', name: 'Compacto' }];
  const v = (id: string, name: string, values: number[]): SnapshotVariable => ({
    id, name, collectionId: 'c1', resolvedType: 'FLOAT', scopes: ['GAP'], description: '',
    valuesByMode: Object.fromEntries(modes.map((m, i) => [m.modeId, values[i]])),
  });
  const snapshot: Snapshot = {
    format: 'figma-variables-snapshot', version: 1, fileName: 'F', exportedAt: '2026-11-03T00:00:00.000Z',
    collections: [{ id: 'c1', name: 'Densidade', defaultModeId: 'm1', modes, variableIds: ['v1', 'v2', 'v3'] }],
    variables: [v('v1', 'gap/sm', [8, 6, 8]), v('v2', 'gap/md', [16, 12, 16]), v('v3', 'gap/lg', [24, 20, 30])],
    external: [],
  };
  const cfg = {
    version: 1, tokensDir: 't', resolver: 'r.json', outputs: { css: 'o.css' }, units: { dimension: 'px', duration: 'ms' },
    collections: { Densidade: { folder: 'd', modifier: 'densidade', modes: { 'Confortável': 'confortavel', 'Padrão': 'padrao' }, ignoreModes: { Compacto: 'Ainda em revisão' } } },
  } as unknown as typeof config;
  const resolver = { version: '2025.10', modifiers: { densidade: { contexts: { confortavel: [{ $ref: 'd/confortavel.json' }], padrao: [{ $ref: 'd/padrao.json' }] }, default: 'confortavel' } } };
  const fake = { validate: () => ({ errors: [], model: 1 }), toCss: () => ({ css: '' }) };
  const r = runExport({ snapshot, config: cfg, configPath: 'c.json', main: new Map([['t/r.json', JSON.stringify(resolver)]]), generator: fake });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, ['Coleção "Densidade": o modo "Compacto" não foi exportado. Motivo na config: "Ainda em revisão". No Figma, 1 dos 3 valores dele difere do modo "Confortável". Foram exportados os modos "Confortável" e "Padrão".']);
  // Com 2 valores diferentes do principal, o plural.
  snapshot.variables[1].valuesByMode.m3 = 10;
  const r2 = runExport({ snapshot, config: cfg, configPath: 'c.json', main: new Map([['t/r.json', JSON.stringify(resolver)]]), generator: fake });
  assert.deepEqual(r2.warnings, ['Coleção "Densidade": o modo "Compacto" não foi exportado. Motivo na config: "Ainda em revisão". No Figma, 2 dos 3 valores dele diferem do modo "Confortável". Foram exportados os modos "Confortável" e "Padrão".']);
});
