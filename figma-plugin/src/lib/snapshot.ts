// Snapshot: o JSON bruto das coleções, modos e variables locais do arquivo, no formato da API de plugins do Figma.
// É a entrada do export e também o caso de teste (botão "Baixar snapshot" e test/fixtures/).

export type ResolvedType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
export interface RGBA { r: number; g: number; b: number; a: number }
export interface Alias { type: 'VARIABLE_ALIAS'; id: string }
export type SnapshotValue = number | string | boolean | RGBA | Alias;

export interface SnapshotMode { modeId: string; name: string }
export interface SnapshotCollection {
  id: string;
  name: string;
  defaultModeId: string;
  modes: SnapshotMode[];
  /** Ordem do painel de variables do Figma. */
  variableIds: string[];
}
export interface SnapshotVariable {
  id: string;
  name: string;
  collectionId: string;
  resolvedType: ResolvedType;
  scopes: string[];
  description: string;
  valuesByMode: Record<string, SnapshotValue>;
}
/** Alvo de alias que não é variable local (biblioteca ou variable apagada). */
export interface ExternalVariable { id: string; name: string | null; collectionName: string | null; remote: boolean }

export interface Snapshot {
  format: 'figma-variables-snapshot';
  version: 1;
  fileName: string;
  exportedAt: string;
  collections: SnapshotCollection[];
  variables: SnapshotVariable[];
  external: ExternalVariable[];
}

export const isAlias = (v: unknown): v is Alias =>
  typeof v === 'object' && v !== null && (v as Alias).type === 'VARIABLE_ALIAS' && typeof (v as Alias).id === 'string';
export const isRGBA = (v: unknown): v is RGBA =>
  typeof v === 'object' && v !== null && ['r', 'g', 'b', 'a'].every((k) => typeof (v as Record<string, unknown>)[k] === 'number');

/** Confere a forma de um snapshot lido de arquivo. Devolve a lista de problemas (vazia se ok). */
export function checkSnapshot(x: unknown): string[] {
  const errors: string[] = [];
  const s = x as Partial<Snapshot>;
  if (typeof x !== 'object' || x === null) return ['snapshot: não é um objeto JSON'];
  if (s.format !== 'figma-variables-snapshot') errors.push('snapshot: format deveria ser "figma-variables-snapshot"');
  if (s.version !== 1) errors.push('snapshot: version deveria ser 1');
  if (!Array.isArray(s.collections)) errors.push('snapshot: collections deveria ser uma lista');
  if (!Array.isArray(s.variables)) errors.push('snapshot: variables deveria ser uma lista');
  if (errors.length) return errors;
  for (const c of s.collections!) {
    if (typeof c.id !== 'string' || typeof c.name !== 'string' || !Array.isArray(c.modes) || !Array.isArray(c.variableIds)) {
      errors.push(`snapshot: coleção ${JSON.stringify(c.name ?? c.id)} incompleta (id, name, modes, variableIds)`);
    }
  }
  for (const v of s.variables!) {
    if (typeof v.id !== 'string' || typeof v.name !== 'string' || typeof v.collectionId !== 'string'
      || !['COLOR', 'FLOAT', 'STRING', 'BOOLEAN'].includes(v.resolvedType) || !Array.isArray(v.scopes)
      || typeof v.valuesByMode !== 'object' || v.valuesByMode === null) {
      errors.push(`snapshot: variable ${JSON.stringify(v.name ?? v.id)} incompleta`);
    }
  }
  return errors;
}

/** O pedaço de figma.variables que o snapshot usa (assim dá para testar com um falso). */
export interface VariablesApi {
  getLocalVariableCollectionsAsync(): Promise<Array<{ id: string; name: string; defaultModeId: string; modes: ReadonlyArray<{ modeId: string; name: string }>; variableIds: ReadonlyArray<string> }>>;
  getLocalVariablesAsync(): Promise<Array<{ id: string; name: string; variableCollectionId: string; resolvedType: string; scopes: ReadonlyArray<string>; description: string; valuesByMode: Record<string, unknown> }>>;
  getVariableByIdAsync(id: string): Promise<{ id: string; name: string; remote: boolean; variableCollectionId: string } | null>;
  getVariableCollectionByIdAsync(id: string): Promise<{ name: string } | null>;
}

const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/** Lê as coleções e variables locais. Variables saem na ordem das coleções e, dentro delas, na ordem do painel. */
export async function takeSnapshot(api: VariablesApi, fileName: string, now = new Date()): Promise<Snapshot> {
  const collections = await api.getLocalVariableCollectionsAsync();
  const locals = new Map((await api.getLocalVariablesAsync()).map((v) => [v.id, v]));
  const variables: SnapshotVariable[] = [];
  for (const c of collections) {
    for (const id of c.variableIds) {
      const v = locals.get(id);
      if (!v) continue;
      variables.push({
        id: v.id,
        name: v.name,
        collectionId: v.variableCollectionId,
        resolvedType: v.resolvedType as ResolvedType,
        scopes: [...v.scopes],
        description: v.description ?? '',
        valuesByMode: plain(v.valuesByMode) as Record<string, SnapshotValue>,
      });
    }
  }
  const external: ExternalVariable[] = [];
  const seen = new Set<string>();
  for (const v of variables) {
    for (const value of Object.values(v.valuesByMode)) {
      if (!isAlias(value) || locals.has(value.id) || seen.has(value.id)) continue;
      seen.add(value.id);
      let ext: ExternalVariable = { id: value.id, name: null, collectionName: null, remote: true };
      try {
        const target = await api.getVariableByIdAsync(value.id);
        if (target) {
          const col = await api.getVariableCollectionByIdAsync(target.variableCollectionId).catch(() => null);
          ext = { id: target.id, name: target.name, collectionName: col?.name ?? null, remote: target.remote };
        }
      } catch { /* alvo inacessível: fica só o id */ }
      external.push(ext);
    }
  }
  return {
    format: 'figma-variables-snapshot',
    version: 1,
    fileName,
    exportedAt: now.toISOString(),
    collections: collections.map((c) => ({
      id: c.id, name: c.name, defaultModeId: c.defaultModeId,
      modes: c.modes.map((m) => ({ modeId: m.modeId, name: m.name })),
      variableIds: [...c.variableIds],
    })),
    variables,
    external,
  };
}
