// Config do export: coleção do Figma → arquivo (ou pasta de um modifier) do resolver DTCG, modos, tabela de tipos e unidades.

import { DTCG_TYPES } from './types.ts';

export interface CollectionConfig {
  /** Coleção de modo único: um arquivo de um set do resolver (caminho relativo a tokensDir). */
  file?: string;
  /** Coleção com modos: uma pasta com um arquivo por contexto do modifier. */
  folder?: string;
  modifier?: string;
  /** Nome do modo no Figma → contexto do modifier (ou null na coleção de modo único). */
  modes: Record<string, string | null>;
  /** Modos que não são exportados, com o motivo (vira aviso). */
  ignoreModes?: Record<string, string>;
}

export interface Config {
  version: 1;
  /** Nome esperado do arquivo do Figma; outro nome só gera aviso. */
  figmaFile?: string;
  /** Pasta dos tokens no repositório. */
  tokensDir: string;
  /** Arquivo do resolver, relativo a tokensDir. */
  resolver: string;
  /** Saídas do gerador (nome devolvido pelo toCss → caminho no repositório). */
  outputs: Record<string, string>;
  units: { dimension: string; duration: string };
  collections: Record<string, CollectionConfig>;
  /** Nome da variable no Figma ("a/b/c") → $type. */
  types: Record<string, string>;
  /** $extensions acrescentadas a tokens novos, por $type (tokens que já existem mantêm as da main). */
  newTokenExtensions?: Record<string, Record<string, unknown>>;
}

/** Um arquivo de tokens gerado: coleção + modo do Figma → arquivo relativo a tokensDir. */
export interface Target {
  collection: string;
  mode: string;
  file: string;
  /** Contexto do modifier, ou null no set base. */
  context: string | null;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isRelPath = (p: unknown) => typeof p === 'string' && p.length > 0 && !p.startsWith('/') && !p.split('/').includes('..');

/** Lê e confere a forma da config. */
export function parseConfig(text: string, where = 'config'): { config?: Config; errors: string[] } {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch (e) { return { errors: [`${where}: JSON inválido (${(e as Error).message})`] }; }
  const errors: string[] = [];
  const fail = (m: string) => errors.push(`${where}: ${m}`);
  if (!isObj(raw)) return { errors: [`${where}: deveria ser um objeto`] };
  const c = raw as Partial<Config>;
  if (c.version !== 1) fail('version deveria ser 1');
  if (!isRelPath(c.tokensDir)) fail('tokensDir deveria ser um caminho relativo');
  if (!isRelPath(c.resolver)) fail('resolver deveria ser um caminho relativo a tokensDir');
  if (!isObj(c.outputs) || !Object.values(c.outputs).every(isRelPath)) fail('outputs deveria mapear nome → caminho relativo');
  if (!isObj(c.units) || typeof c.units.dimension !== 'string' || typeof c.units.duration !== 'string') fail('units precisa de dimension e duration');
  if (!isObj(c.types)) fail('types deveria ser um objeto (nome da variable → $type)');
  else for (const [name, t] of Object.entries(c.types)) if (!(DTCG_TYPES as readonly string[]).includes(t as string)) fail(`types["${name}"]: "${t}" não é um dos tipos ${DTCG_TYPES.join(', ')}`);
  if (c.newTokenExtensions !== undefined && !isObj(c.newTokenExtensions)) fail('newTokenExtensions deveria ser um objeto');
  if (!isObj(c.collections) || !Object.keys(c.collections).length) fail('collections deveria ter pelo menos uma coleção');
  else {
    for (const [name, col] of Object.entries(c.collections)) {
      const at = `collections["${name}"]`;
      if (!isObj(col) || !isObj(col.modes) || !Object.keys(col.modes).length) { fail(`${at}: precisa de modes`); continue; }
      const values = Object.values(col.modes);
      if (col.file !== undefined && col.folder !== undefined) fail(`${at}: use file ou folder, não os dois`);
      else if (col.file !== undefined) {
        if (!isRelPath(col.file)) fail(`${at}: file deveria ser um caminho relativo`);
        if (values.length !== 1 || values[0] !== null) fail(`${at}: com file, modes tem um modo só, com valor null`);
      } else if (col.folder !== undefined) {
        if (!isRelPath(col.folder)) fail(`${at}: folder deveria ser um caminho relativo`);
        if (typeof col.modifier !== 'string' || !col.modifier) fail(`${at}: com folder, falta modifier`);
        if (!values.every((v) => typeof v === 'string' && /^[^/\\]+$/.test(v))) fail(`${at}: com folder, cada modo aponta para um contexto`);
        if (new Set(values).size !== values.length) fail(`${at}: dois modos apontam para o mesmo contexto`);
      } else fail(`${at}: falta file ou folder`);
      if (col.ignoreModes !== undefined) {
        if (!isObj(col.ignoreModes)) fail(`${at}: ignoreModes deveria ser um objeto (modo → motivo)`);
        else for (const m of Object.keys(col.ignoreModes)) if (m in col.modes) fail(`${at}: modo "${m}" está em modes e em ignoreModes`);
      }
    }
  }
  return errors.length ? { errors } : { config: raw as unknown as Config, errors };
}

/** Os arquivos que o export gera, na ordem da config. */
export function targets(config: Config): Target[] {
  return Object.entries(config.collections).flatMap(([collection, col]) =>
    Object.entries(col.modes).map(([mode, context]) => ({
      collection, mode, context,
      file: col.file ?? `${col.folder}/${context}.json`,
    })));
}

type Ref = { $ref?: unknown };
const refs = (list: unknown): string[] => (Array.isArray(list) ? list.map((s: Ref) => s?.$ref).filter((r): r is string => typeof r === 'string') : []);

/** Confere a config contra o resolver da main. O plugin não altera o resolver. */
export function checkAgainstResolver(config: Config, resolver: unknown): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const r = (isObj(resolver) ? resolver : {}) as { sets?: Record<string, { sources?: unknown }>; modifiers?: Record<string, { contexts?: Record<string, unknown> }> };
  const setFiles = new Set(Object.values(r.sets ?? {}).flatMap((s) => refs(s?.sources)));
  const all = new Set(setFiles);
  for (const m of Object.values(r.modifiers ?? {})) for (const list of Object.values(m?.contexts ?? {})) for (const f of refs(list)) all.add(f);
  const generated = new Set<string>();
  for (const [name, col] of Object.entries(config.collections)) {
    if (col.file !== undefined) {
      generated.add(col.file);
      if (!setFiles.has(col.file)) errors.push(`config: coleção "${name}" gera ${col.file}, que não está em nenhum set do resolver`);
      continue;
    }
    const mod = r.modifiers?.[col.modifier!];
    if (!mod) { errors.push(`config: coleção "${name}" usa o modifier "${col.modifier}", que não existe no resolver`); continue; }
    const contexts = Object.keys(mod.contexts ?? {});
    const mapped = Object.values(col.modes) as string[];
    const missing = contexts.filter((c) => !mapped.includes(c));
    const extra = mapped.filter((c) => !contexts.includes(c));
    if (missing.length) errors.push(`config: coleção "${name}" não tem modo para os contextos ${missing.join(', ')} do modifier "${col.modifier}"`);
    if (extra.length) errors.push(`config: coleção "${name}" mapeia para contextos que o modifier "${col.modifier}" não tem: ${extra.join(', ')}`);
    for (const ctx of mapped.filter((c) => contexts.includes(c))) {
      const file = `${col.folder}/${ctx}.json`;
      generated.add(file);
      if (!refs(mod.contexts![ctx]).includes(file)) errors.push(`config: o contexto "${ctx}" do modifier "${col.modifier}" não lê ${file}`);
    }
  }
  for (const f of all) if (!generated.has(f)) warnings.push(`${f} está no resolver e não vem de nenhuma coleção: fica como está na main`);
  return { errors, warnings };
}
