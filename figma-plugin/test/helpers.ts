// Apoio aos testes: lê o repositório e monta, a partir dos tokens da main, um snapshot no formato do Figma.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseConfig, targets, type Config } from '../src/lib/config.ts';
import type { Snapshot, SnapshotValue, SnapshotVariable } from '../src/lib/snapshot.ts';
import { flatten, type FlatToken } from '../src/lib/tree.ts';
import * as generator from '../../scripts/lib/tokens-core.mjs';

export { generator };
export const REPO = fileURLToPath(new URL('../../', import.meta.url));
export const CONFIG_PATH = 'figma-plugin/figma.config.json';

export function repoConfig(): Config {
  const { config, errors } = parseConfig(readFileSync(join(REPO, CONFIG_PATH), 'utf8'));
  if (!config) throw new Error(errors.join('\n'));
  return config;
}

/** Arquivos da "main" como o plugin os lê: config, pasta de tokens e saídas do gerador. */
export function repoFiles(config = repoConfig()): Map<string, string> {
  const files = new Map<string, string>();
  const add = (abs: string) => files.set(relative(REPO, abs), readFileSync(abs, 'utf8'));
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else if (name.endsWith('.json')) add(abs);
    }
  };
  walk(join(REPO, config.tokensDir));
  for (const p of Object.values(config.outputs)) add(join(REPO, p));
  add(join(REPO, CONFIG_PATH));
  return files;
}

/**
 * LINHA DE BASE CONGELADA: arquivo de referência test/fixtures/baseline-main-39a38e2.json, com os
 * tokens/*.json, o resolver e os dois CSS (src/styles/tokens.css e tokens-wrapper.css) do commit 39a38e2,
 * a main antes da primeira sincronização com o Figma. Os testes que precisam de uma "main" usam esta linha
 * de base, e não o tokens/ do working tree, para continuarem valendo depois que o tokens/ mudar.
 *
 * Para regerar (só de propósito), a partir de um commit <c> escolhido:
 *   node -e 'const {execSync:x}=require("child_process"); const o={};
 *     for (const f of x("git ls-tree -r --name-only <c> tokens src/styles/tokens.css src/styles/tokens-wrapper.css",{encoding:"utf8"}).trim().split("\n").sort())
 *       o[f]=x("git show <c>:"+f,{encoding:"utf8"});
 *     require("fs").writeFileSync("figma-plugin/test/fixtures/baseline-main-39a38e2.json",JSON.stringify(o,null,1)+"\n")'
 * e depois atualize, conscientemente, BASELINE_SHA256 e os dois hashes de CSS no teste de integridade
 * (test/real-sem-colisoes.test.ts). Mudar o gerador de CSS de propósito também exige regerar a baseline:
 * o CSS dela é a saída do gerador daquele commit.
 */
export const BASELINE_SHA256 = 'cbab683cfa3edf8a85323e80cd4e49b7a34e7a784cb767e6848154a1f795a147';
export function baselineFiles(): Map<string, string> {
  const files = new Map(Object.entries(JSON.parse(readFileSync(new URL('./fixtures/baseline-main-39a38e2.json', import.meta.url), 'utf8')) as Record<string, string>));
  files.set(CONFIG_PATH, readFileSync(join(REPO, CONFIG_PATH), 'utf8'));
  return files;
}

/** Hex → componente como o Figma guarda (float32 de byte/255). */
const channel = (hex: string, i: number) => Math.fround(parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255);

/**
 * Escopos que um arquivo do Figma bem configurado teria, escolhidos para exercitar as quatro fontes de tipo:
 * aliases com ALL_SCOPES (tipo vem do alvo), medidas com escopo (tipo vem do escopo), duração e string pela tabela,
 * e uma medida com ALL_SCOPES (tipo vem da main).
 */
function scopesFor(t: FlatToken): string[] {
  const name = t.path.join('/');
  if (typeof t.value === 'string' && t.value.startsWith('{')) return ['ALL_SCOPES'];
  if (name === 'button/ghost/padding-x') return ['ALL_SCOPES'];
  switch (t.type) {
    case 'color': return ['ALL_FILLS', 'STROKE_COLOR'];
    case 'fontWeight': return ['FONT_WEIGHT'];
    case 'fontFamily': return ['FONT_FAMILY'];
    case 'dimension':
      if (/font-size$/.test(name)) return ['FONT_SIZE'];
      if (/line-height$/.test(name)) return ['LINE_HEIGHT'];
      if (/weight$/.test(name)) return ['STROKE_FLOAT'];
      if (/(size|width|height)$/.test(name)) return ['WIDTH_HEIGHT'];
      return ['GAP', 'WIDTH_HEIGHT', 'CORNER_RADIUS'];
    default: return ['ALL_SCOPES'];
  }
}

const RESOLVED: Record<string, SnapshotVariable['resolvedType']> = {
  color: 'COLOR', dimension: 'FLOAT', duration: 'FLOAT', fontWeight: 'FLOAT', number: 'FLOAT', fontFamily: 'STRING', string: 'STRING',
};

function figmaValue(t: FlatToken): SnapshotValue | { alias: string } {
  const v = t.value as Record<string, unknown>;
  if (typeof t.value === 'string' && t.value.startsWith('{')) return { alias: t.value.slice(1, -1) };
  if (t.type === 'color') return { r: channel(v.hex as string, 0), g: channel(v.hex as string, 1), b: channel(v.hex as string, 2), a: (v.alpha as number | undefined) ?? 1 };
  if (t.type === 'dimension' || t.type === 'duration') return Math.fround(v.value as number);
  return t.value as SnapshotValue;
}

/** Snapshot equivalente aos tokens da main, com o ruído de float32 que o Figma tem. */
export function snapshotFromRepo(config = repoConfig(), files = repoFiles(config), fileName = config.figmaFile ?? 'Tokens'): Snapshot {
  const dir = config.tokensDir;
  const snapshot: Snapshot = { format: 'figma-variables-snapshot', version: 1, fileName, exportedAt: '2026-11-03T12:00:00.000Z', collections: [], variables: [], external: [] };
  const pending: Array<[SnapshotVariable, string, string]> = [];
  let n = 0;
  for (const [name, col] of Object.entries(config.collections)) {
    const cid = `VariableCollectionId:${++n}:0`;
    const modeNames = [...Object.keys(col.modes), ...Object.keys(col.ignoreModes ?? {})];
    const modes = modeNames.map((m, i) => ({ modeId: `${n}:${i}`, name: m }));
    const tgs = targets(config).filter((t) => t.collection === name);
    const flats = tgs.map((t) => flatten(JSON.parse(files.get(`${dir}/${t.file}`)!)));
    const collection = { id: cid, name, defaultModeId: modes[0].modeId, modes, variableIds: [] as string[] };
    snapshot.collections.push(collection);
    for (const [id, first] of flats[0]) {
      const v: SnapshotVariable = {
        id: `VariableID:${n}:${collection.variableIds.length}`,
        name: first.path.join('/'),
        collectionId: cid,
        resolvedType: RESOLVED[first.type!],
        scopes: scopesFor(first),
        description: first.description ?? '',
        valuesByMode: {},
      };
      tgs.forEach((t, i) => {
        const value = figmaValue(flats[i].get(id)!);
        const modeId = modes.find((m) => m.name === t.mode)!.modeId;
        if (typeof value === 'object' && 'alias' in value) pending.push([v, modeId, value.alias]);
        else v.valuesByMode[modeId] = value;
      });
      collection.variableIds.push(v.id);
      snapshot.variables.push(v);
    }
  }
  const byName = new Map(snapshot.variables.map((v) => [v.name.split('/').join('.'), v.id]));
  for (const [v, modeId, target] of pending) v.valuesByMode[modeId] = { type: 'VARIABLE_ALIAS', id: byName.get(target) ?? `missing:${target}` };
  // Modos ignorados: cópia do modo principal (o Figma copia os valores ao criar um modo).
  for (const [name, col] of Object.entries(config.collections)) {
    const c = snapshot.collections.find((x) => x.name === name)!;
    const principal = c.modes.find((m) => m.name === Object.keys(col.modes)[0])!.modeId;
    for (const m of Object.keys(col.ignoreModes ?? {})) {
      const id = c.modes.find((x) => x.name === m)!.modeId;
      for (const v of snapshot.variables.filter((x) => x.collectionId === c.id)) v.valuesByMode[id] = v.valuesByMode[principal];
    }
  }
  return snapshot;
}

export const variable = (s: Snapshot, name: string) => {
  const v = s.variables.find((x) => x.name === name);
  if (!v) throw new Error(`sem variable ${name}`);
  return v;
};
export const collection = (s: Snapshot, name: string) => s.collections.find((c) => c.name === name)!;
export const modeOf = (s: Snapshot, col: string, mode: string) => collection(s, col).modes.find((m) => m.name === mode)!.modeId;
