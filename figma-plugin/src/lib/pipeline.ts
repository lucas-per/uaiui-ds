// Export: snapshot do Figma + config + arquivos da main → arquivos novos, erros, avisos e diff.
// Nada aqui toca o Figma nem a rede; o gerador de CSS do repositório entra por parâmetro.

import { checkAgainstResolver, targets, type Config, type Target } from './config.ts';
import { colorValue, convertValue } from './convert.ts';
import { diffTrees, type Change } from './diff.ts';
import { serialize } from './format.ts';
import { report } from './report.ts';
import { isAlias, isRGBA, type Snapshot, type SnapshotCollection, type SnapshotVariable } from './snapshot.ts';
import { buildTree, flatten, type NewToken } from './tree.ts';
import { ALLOWED, resolveTypes, suggestType, type DtcgType, type TypeSource } from './types.ts';

/** O gerador do repositório: as funções puras de validação e de CSS. */
export interface Generator {
  validate(read: (file: string) => string, resolverFile: string): { errors: string[]; model?: unknown };
  toCss(model: unknown): Record<string, unknown>;
}

export interface ExportInput {
  snapshot: Snapshot;
  config: Config;
  /** Caminho da config no repositório (para gravar os tipos escolhidos). */
  configPath: string;
  /** Arquivos da main: caminho no repositório → texto. */
  main: ReadonlyMap<string, string>;
  generator: Generator;
  /** Tipos escolhidos na interface (nome da variable → $type); entram na tabela da config. */
  typeChoices?: Record<string, string>;
  base?: { branch: string; sha: string } | null;
}

export interface Unresolved {
  name: string;
  collection: string;
  resolvedType: SnapshotVariable['resolvedType'];
  scopes: string[];
  allowed: DtcgType[];
  suggestion?: DtcgType;
}

export interface ExportResult {
  errors: string[];
  warnings: string[];
  unresolved: Unresolved[];
  /** Tudo que o export produz: arquivos de tokens, CSS e, se houver tipo escolhido, a config. */
  files: Map<string, string>;
  /** Caminhos de `files` cujo conteúdo difere da main. */
  changedFiles: string[];
  changes: Change[];
  sources: Record<TypeSource, number>;
  variables: number;
  report: string;
  /** Conteúdo do .zip: a pasta de tokens inteira (main + gerados) e as saídas do gerador. */
  zipFiles(): Record<string, string>;
}

const describe = (v: unknown): string => (isRGBA(v) ? colorValue(v).hex! + (v.a !== 1 ? ` alpha ${v.a}` : '') : isAlias(v) ? `alias ${v.id}` : JSON.stringify(v));
const SEG_OK = (s: string) => s.length > 0 && !/[.{}]/.test(s) && !s.startsWith('$');

export function runExport(input: ExportInput): ExportResult {
  const { snapshot, main, generator } = input;
  const errors: string[] = [];
  const warnings: string[] = [];
  const unresolved: Unresolved[] = [];
  const files = new Map<string, string>();
  const changes: Change[] = [];
  const sources: Record<TypeSource, number> = { tabela: 0, escopo: 0, alias: 0, main: 0 };
  const choices = Object.fromEntries(Object.entries(input.typeChoices ?? {}).filter(([, t]) => t));
  const config: Config = { ...input.config, types: { ...input.config.types, ...choices } };
  const dir = config.tokensDir.replace(/\/+$/, '');
  const repoPath = (file: string) => `${dir}/${file}`;
  const parse = (path: string): unknown => {
    const text = main.get(path);
    if (text === undefined) return undefined;
    try { return JSON.parse(text); } catch (e) { errors.push(`${path} na main: JSON inválido (${(e as Error).message})`); return undefined; }
  };
  let variableCount = 0;

  const finish = (): ExportResult => {
    const changedFiles = [...files].filter(([p, text]) => main.get(p) !== text).map(([p]) => p);
    const result: ExportResult = {
      errors, warnings, unresolved, files, changedFiles, changes, sources, variables: variableCount, report: '',
      zipFiles: () => {
        const out: Record<string, string> = {};
        for (const [p, text] of main) if (p.startsWith(dir + '/')) out[p] = text;
        for (const [p, text] of files) if (p.startsWith(dir + '/') || Object.values(config.outputs).includes(p)) out[p] = text;
        return out;
      },
    };
    result.report = report({ fileName: snapshot.fileName, base: input.base ?? null, changes, sources, warnings, changedFiles });
    return result;
  };

  // 1. Arquivo, coleções e modos.
  if (config.figmaFile && snapshot.fileName !== config.figmaFile) warnings.push(`O arquivo aberto é "${snapshot.fileName}", e a config espera "${config.figmaFile}".`);
  const resolverPath = repoPath(config.resolver);
  const resolver = parse(resolverPath);
  if (resolver === undefined && !main.has(resolverPath)) errors.push(`${resolverPath} não existe na main`);
  else {
    const r = checkAgainstResolver(config, resolver);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }
  const byName = new Map(snapshot.collections.map((c) => [c.name, c]));
  const realNames = snapshot.collections.map((c) => `"${c.name}"`).join(', ') || 'nenhuma';
  const cols = new Map<string, SnapshotCollection>();
  for (const [name, col] of Object.entries(config.collections)) {
    const c = byName.get(name);
    if (!c) { errors.push(`A coleção "${name}" da config não existe no Figma. Coleções encontradas: ${realNames}.`); continue; }
    cols.set(name, c);
    const real = c.modes.map((m) => m.name);
    const list = real.map((m) => `"${m}"`).join(', ');
    for (const m of [...Object.keys(col.modes), ...Object.keys(col.ignoreModes ?? {})]) {
      if (!real.includes(m)) errors.push(`O modo "${m}" da coleção "${name}" não existe no Figma. Modos encontrados: ${list}.`);
    }
    for (const m of real) {
      if (!(m in col.modes) && !(m in (col.ignoreModes ?? {}))) errors.push(`A coleção "${name}" tem o modo "${m}", que não está em modes nem em ignoreModes da config.`);
    }
  }
  for (const c of snapshot.collections) {
    if (!(c.name in config.collections)) warnings.push(`A coleção "${c.name}" não está na config e fica de fora (${c.variableIds.length} variables).`);
  }
  if (errors.length) return finish();

  // 2. Variables das coleções configuradas, nomes e colisões.
  const collectionOf = new Map<string, string>(); // collectionId → nome
  for (const [name, c] of cols) collectionOf.set(c.id, name);
  const vars = snapshot.variables.filter((v) => collectionOf.has(v.collectionId));
  variableCount = vars.length;
  const varById = new Map(vars.map((v) => [v.id, v]));
  const allById = new Map(snapshot.variables.map((v) => [v.id, v]));
  const tokenId = (v: SnapshotVariable) => v.name.split('/').join('.');
  const skip = new Set<string>();
  const owner = new Map<string, string>();
  for (const v of vars) {
    const segs = v.name.split('/');
    const bad = segs.filter((s) => !SEG_OK(s));
    if (bad.length) { errors.push(`${v.name}: parte do nome vazia, começando com $ ou com ".", "{" ou "}" (${bad.map((s) => JSON.stringify(s)).join(', ')})`); skip.add(tokenId(v)); continue; }
    const id = tokenId(v);
    const col = collectionOf.get(v.collectionId)!;
    if (owner.has(id)) { errors.push(`${v.name}: o mesmo nome existe nas coleções "${owner.get(id)}" e "${col}"`); skip.add(id); continue; }
    owner.set(id, col);
  }
  const ids = [...owner.keys()].sort();
  for (let i = 0; i + 1 < ids.length; i++) {
    if (ids[i + 1].startsWith(ids[i] + '.')) {
      errors.push(`${ids[i].split('.').join('/')}: é token e também grupo de ${ids[i + 1].split('.').join('/')}`);
      skip.add(ids[i]);
    }
  }

  // 3. Tipos.
  const tgs = targets(config);
  const tgsOf = (col: string) => tgs.filter((t) => t.collection === col);
  const mainTrees = new Map<string, unknown>(tgs.map((t) => [t.file, parse(repoPath(t.file))]));
  const mainFlats = new Map([...mainTrees].map(([f, tree]) => [f, flatten(tree)]));
  const modeId = (col: string, mode: string) => cols.get(col)!.modes.find((m) => m.name === mode)!.modeId;
  const exportedModes = (v: SnapshotVariable) => tgsOf(collectionOf.get(v.collectionId)!).map((t) => modeId(t.collection, t.mode));
  const mainType = (v: SnapshotVariable) => {
    for (const t of tgsOf(collectionOf.get(v.collectionId)!)) {
      const type = mainFlats.get(t.file)?.get(tokenId(v))?.type;
      if (type) return type;
    }
    return undefined;
  };
  const types = resolveTypes(vars, { table: config.types, modes: exportedModes, mainType });
  for (const v of vars) {
    const r = types.get(v.id)!;
    if (r.error) { errors.push(r.error); skip.add(tokenId(v)); continue; }
    if (!r.type) {
      unresolved.push({ name: v.name, collection: collectionOf.get(v.collectionId)!, resolvedType: v.resolvedType, scopes: v.scopes, allowed: ALLOWED[v.resolvedType], suggestion: suggestType(v) });
      skip.add(tokenId(v));
      continue;
    }
    sources[r.source!]++;
  }
  if (unresolved.length) errors.push(`${unresolved.length} variable(s) nova(s) sem tipo: escolha o tipo na lista de tipos manuais.`);

  // 4. Valores por modo.
  const tokensByFile = new Map<string, NewToken[]>(tgs.map((t) => [t.file, []]));
  for (const v of vars) {
    const id = tokenId(v);
    if (skip.has(id)) continue;
    const type = types.get(v.id)!.type!;
    const perFile: Array<[Target, unknown]> = [];
    let ok = true;
    for (const t of tgsOf(collectionOf.get(v.collectionId)!)) {
      const value = v.valuesByMode[modeId(t.collection, t.mode)];
      const at = `${v.name}${t.context ? ` (${t.mode})` : ''}`;
      if (value === undefined) { errors.push(`${at}: sem valor no modo`); ok = false; continue; }
      if (isAlias(value)) {
        const target = varById.get(value.id);
        if (!target) {
          const other = allById.get(value.id);
          const ext = snapshot.external?.find((e) => e.id === value.id);
          if (other) errors.push(`${at}: alias para ${other.name}, de uma coleção que não está na config`);
          else if (ext) errors.push(`${at}: alias para ${ext.name ?? value.id}${ext.collectionName ? ` (coleção "${ext.collectionName}")` : ''}, que não é variable local${ext.remote ? ' (vem de biblioteca)' : ''}`);
          else errors.push(`${at}: alias quebrado (${value.id} não existe)`);
          ok = false;
          continue;
        }
        if (skip.has(tokenId(target)) && !owner.has(tokenId(target))) { errors.push(`${at}: alias para ${target.name}, que tem nome inválido`); ok = false; continue; }
        perFile.push([t, `{${tokenId(target)}}`]);
        continue;
      }
      const c = convertValue(value, type, config.units);
      if (c.error) { errors.push(`${at}: ${c.error} (tipo ${type})`); ok = false; continue; }
      perFile.push([t, c.value]);
    }
    if (!ok) { skip.add(id); continue; }
    for (const [t, value] of perFile) {
      tokensByFile.get(t.file)!.push({ id, path: id.split('.'), type, value, description: v.description ?? '', newExtensions: config.newTokenExtensions?.[type] as Record<string, unknown> | undefined });
    }
  }

  // 5. Arquivos e diff.
  for (const t of tgs) {
    const tree = buildTree(mainTrees.get(t.file), tokensByFile.get(t.file)!);
    files.set(repoPath(t.file), serialize(tree));
    const single = Object.keys(config.collections[t.collection].modes).length === 1 && t.context === null;
    changes.push(...diffTrees({ collection: t.collection, mode: single ? null : t.mode, file: repoPath(t.file) }, mainTrees.get(t.file), tree, skip));
  }

  // 6. Modos ignorados.
  for (const [name, col] of Object.entries(config.collections)) {
    const c = cols.get(name)!;
    const principal = Object.keys(col.modes)[0];
    for (const [mode, why] of Object.entries(col.ignoreModes ?? {})) {
      const a = modeId(name, principal), b = modeId(name, mode);
      const inCol = vars.filter((v) => v.collectionId === c.id);
      const diff = inCol.filter((v) => JSON.stringify(v.valuesByMode[a]) !== JSON.stringify(v.valuesByMode[b])).length;
      const distinct = new Set(inCol.map((v) => JSON.stringify(v.valuesByMode[b])));
      // Todos os valores iguais (ex.: tudo #ffffff) costuma ser placeholder, não um modo de verdade.
      const same = inCol.length > 1 && distinct.size === 1 ? `; os ${inCol.length} valores do modo são iguais (${describe(inCol[0].valuesByMode[b])})` : '';
      const reason = why.replace(/[.\s]+$/, '');
      warnings.push(`Coleção "${name}": modo "${mode}" ignorado (${reason}).${diff ? ` Atenção: ${diff} valor(es) diferente(s) do modo "${principal}"${same}.` : ''}`);
    }
  }
  const removed = new Set(changes.filter((c) => c.kind === 'removed').map((c) => c.id)).size;
  if (removed) warnings.push(`${removed} token(s) da main não existem mais no Figma e saem (ver Removidos).`);

  // 7. Config com os tipos escolhidos.
  if (Object.keys(choices).length) files.set(input.configPath, serialize(config));

  // 8. Validador e CSS do repositório, rodados no conjunto novo.
  if (!errors.length) {
    const read = (file: string) => {
      const text = files.get(repoPath(file)) ?? main.get(repoPath(file));
      if (text === undefined) throw new Error('arquivo não encontrado');
      return text;
    };
    try {
      const v = generator.validate(read, config.resolver);
      if (v.errors.length) errors.push(...v.errors.map((e) => `validador: ${e}`));
      else {
        const css = generator.toCss(v.model);
        for (const [name, path] of Object.entries(config.outputs)) {
          if (typeof css[name] !== 'string') errors.push(`gerador: não devolveu a saída "${name}"`);
          else files.set(path, css[name] as string);
        }
      }
    } catch (e) {
      errors.push(`gerador: ${(e as Error).message}`);
    }
  }
  return finish();
}
