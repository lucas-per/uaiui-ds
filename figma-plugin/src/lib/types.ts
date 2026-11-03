// $type DTCG de cada variable. Ordem: tabela da config → escopos → alvo do alias → $type da main.
// Bloqueia quando o tipo derivado (tabela, escopo ou alias) diverge do da main, ou quando um token novo não resolve.

import { isAlias, type ResolvedType, type SnapshotVariable } from './snapshot.ts';

export const DTCG_TYPES = ['color', 'dimension', 'duration', 'fontFamily', 'fontWeight', 'number', 'string'] as const;
export type DtcgType = (typeof DTCG_TYPES)[number];
export type TypeSource = 'tabela' | 'escopo' | 'alias' | 'main';
export const SOURCES: TypeSource[] = ['tabela', 'escopo', 'alias', 'main'];

/** Tipos que cada tipo de variable do Figma pode virar. BOOLEAN não tem tipo no DTCG. */
export const ALLOWED: Record<ResolvedType, DtcgType[]> = {
  COLOR: ['color'],
  FLOAT: ['dimension', 'duration', 'fontWeight', 'number'],
  STRING: ['fontFamily', 'string'],
  BOOLEAN: [],
};

/** Escopos de FLOAT que são medida (viram dimension quando todos os escopos estão aqui). */
export const MEASURE_SCOPES = new Set(['CORNER_RADIUS', 'GAP', 'WIDTH_HEIGHT', 'STROKE_FLOAT', 'FONT_SIZE', 'LINE_HEIGHT',
  'LETTER_SPACING', 'PARAGRAPH_SPACING', 'PARAGRAPH_INDENT', 'EFFECT_FLOAT']);

/** Tipo pelos escopos; undefined quando eles não decidem (ALL_SCOPES, mistos, OPACITY, TEXT_CONTENT, BOOLEAN). */
export function typeFromScopes(resolvedType: ResolvedType, scopes: readonly string[]): DtcgType | undefined {
  if (resolvedType === 'COLOR') return 'color';
  if (resolvedType === 'FLOAT') {
    if (scopes.length === 1 && scopes[0] === 'FONT_WEIGHT') return 'fontWeight';
    if (scopes.length && scopes.every((s) => MEASURE_SCOPES.has(s))) return 'dimension';
  }
  if (resolvedType === 'STRING' && scopes.length === 1 && scopes[0] === 'FONT_FAMILY') return 'fontFamily';
  return undefined;
}

/** Sugestão para a lista de tipo manual (só ajuda a escolher, nunca decide sozinha). */
export function suggestType(v: Pick<SnapshotVariable, 'name' | 'resolvedType' | 'scopes'>): DtcgType | undefined {
  const n = v.name.toLowerCase();
  if (v.resolvedType === 'COLOR') return 'color';
  if (v.resolvedType === 'STRING') return /famil|font-?face|typeface/.test(n) ? 'fontFamily' : 'string';
  if (v.resolvedType !== 'FLOAT') return undefined;
  if (/duration|delay|tempo|ms$/.test(n)) return 'duration';
  if (/font/.test(n) && /weight/.test(n)) return 'fontWeight';
  if (/opacity|opacidade|ratio|scale-factor|z-?index|line-clamp|count/.test(n) || v.scopes.includes('OPACITY')) return 'number';
  return 'dimension';
}

export interface TypeResult {
  type?: DtcgType;
  source?: TypeSource;
  /** Erro que bloqueia (divergência com a main ou tipo incompatível com a variable). */
  error?: string;
}

/**
 * Resolve o tipo de todas as variables.
 * `modes(v)` são os modos exportados da variable; `mainType(v)` é o $type do token na main (se existir).
 */
export function resolveTypes(
  variables: SnapshotVariable[],
  opts: { table: Record<string, string>; modes: (v: SnapshotVariable) => string[]; mainType: (v: SnapshotVariable) => string | undefined },
): Map<string, TypeResult> {
  const byId = new Map(variables.map((v) => [v.id, v]));
  const out = new Map<string, TypeResult>();
  const visiting = new Set<string>();

  const viaAlias = (v: SnapshotVariable): DtcgType | undefined => {
    const values = opts.modes(v).map((m) => v.valuesByMode[m]);
    if (!values.length || !values.every(isAlias)) return undefined;
    const types = new Set<DtcgType | undefined>();
    for (const a of values) {
      const target = byId.get((a as { id: string }).id);
      types.add(target ? resolve(target).type : undefined);
    }
    const [only] = types;
    return types.size === 1 && only ? only : undefined;
  };

  const resolve = (v: SnapshotVariable): TypeResult => {
    const done = out.get(v.id);
    if (done) return done;
    if (visiting.has(v.id)) return {}; // alias em ciclo: o validador acusa depois
    visiting.add(v.id);
    const main = opts.mainType(v);
    let r: TypeResult = {};
    const table = opts.table[v.name];
    if (table) r = { type: table as DtcgType, source: 'tabela' };
    else {
      const scoped = typeFromScopes(v.resolvedType, v.scopes);
      if (scoped) r = { type: scoped, source: 'escopo' };
      else {
        const aliased = viaAlias(v);
        if (aliased) r = { type: aliased, source: 'alias' };
        else if (main) r = { type: main as DtcgType, source: 'main' };
      }
    }
    if (r.type && !ALLOWED[v.resolvedType].includes(r.type)) {
      r = { ...r, error: `${v.name}: tipo ${r.type} (${r.source}) não serve para variable ${v.resolvedType}; aceita ${ALLOWED[v.resolvedType].join(', ') || 'nenhum'}` };
    } else if (r.type && r.source !== 'main' && main && main !== r.type) {
      r = { ...r, error: `${v.name}: tipo ${r.type} (${r.source}) diverge do $type ${main} da main` };
    }
    visiting.delete(v.id);
    out.set(v.id, r);
    return r;
  };

  for (const v of variables) resolve(v);
  return out;
}
