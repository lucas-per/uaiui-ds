// Requisito 4: export sem mudança no Figma = diff vazio, arquivos idênticos byte a byte, CSS idêntico ao da main.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { targets } from '../src/lib/config.ts';
import { serialize } from '../src/lib/format.ts';
import { runExport } from '../src/lib/pipeline.ts';
import { CONFIG_PATH, generator, repoConfig, repoFiles, snapshotFromRepo } from './helpers.ts';

const config = repoConfig();
const main = repoFiles(config);

test('serialize(parse(arquivo)) devolve o arquivo nos 9 arquivos de tokens', () => {
  const files = targets(config).map((t) => `${config.tokensDir}/${t.file}`);
  assert.equal(files.length, 9);
  for (const f of files) assert.equal(serialize(JSON.parse(main.get(f)!)), main.get(f), f);
});

test('snapshot equivalente à main exporta os mesmos 9 arquivos e o mesmo CSS, sem diff', () => {
  const snapshot = snapshotFromRepo(config, main);
  const r = runExport({ snapshot, config, configPath: CONFIG_PATH, main, generator });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.unresolved, []);
  assert.deepEqual(r.changes, []);
  assert.deepEqual(r.changedFiles, []);
  assert.equal(r.variables, snapshot.variables.length);
  for (const [path, text] of r.files) assert.equal(text, main.get(path), path);
  for (const p of Object.values(config.outputs)) assert.ok(r.files.has(p), `${p} gerado`);
  assert.equal(r.files.size, 9 + Object.keys(config.outputs).length);
  // As quatro fontes de tipo são exercitadas.
  for (const s of ['tabela', 'escopo', 'alias', 'main'] as const) assert.ok(r.sources[s] > 0, `fonte ${s}: ${r.sources[s]}`);
  assert.equal(r.sources.tabela, 2);
  assert.equal(r.sources.main, 1);
});

test('o snapshot cobre os 199 tokens (uma variable por token de cada coleção)', () => {
  const snapshot = snapshotFromRepo(config, main);
  // 199 tokens resolvidos = base + um contexto de cada modifier.
  const perCollection = Object.fromEntries(snapshot.collections.map((c) => [c.name, c.variableIds.length]));
  const total = snapshot.variables.length;
  assert.equal(total, 199, JSON.stringify(perCollection));
});

test('aviso do modo ignorado sem valores diferentes', () => {
  const r = runExport({ snapshot: snapshotFromRepo(config, main), config, configPath: CONFIG_PATH, main, generator });
  assert.ok(r.warnings.some((w) => /modo "Negativa" ignorado \(Modo vazio; Semântica fica no set base\.\)\.$/.test(w)), r.warnings.join('\n'));
});

test('zip: pasta de tokens inteira (9 JSON + resolver) e os dois CSS, sem a config', () => {
  const r = runExport({ snapshot: snapshotFromRepo(config, main), config, configPath: CONFIG_PATH, main, generator });
  const names = Object.keys(r.zipFiles()).sort();
  assert.deepEqual(names, [
    'src/styles/tokens-wrapper.css', 'src/styles/tokens.css',
    'tokens/componente.json', 'tokens/densidade/comfortable.json', 'tokens/densidade/compact.json', 'tokens/densidade/standard.json',
    'tokens/dimensoes.json', 'tokens/escala.json', 'tokens/primitivos/claro.json', 'tokens/primitivos/escuro.json',
    'tokens/semantica.json', 'tokens/uaiui.resolver.json',
  ]);
});
