// Diff por token e por modo entre o arquivo da main e o gerado.

import { flatten, type FlatToken } from './tree.ts';

export type ChangeKind = 'added' | 'changed' | 'removed';
export interface TokenState { type?: string; value: unknown; description?: string; extensions?: unknown }
export interface Change {
  id: string;
  collection: string;
  /** Nome do modo no Figma, ou null em coleção de modo único. */
  mode: string | null;
  file: string;
  kind: ChangeKind;
  before?: TokenState;
  after?: TokenState;
  /** No alterado: quais partes mudaram. */
  fields?: Array<'type' | 'value' | 'description' | 'extensions'>;
}

const state = (t: FlatToken): TokenState => ({ type: t.type, value: t.value, description: t.description, extensions: t.extensions });
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function diffTrees(
  where: { collection: string; mode: string | null; file: string },
  before: unknown,
  after: unknown,
  skip: ReadonlySet<string> = new Set(),
): Change[] {
  const a = flatten(before);
  const b = flatten(after);
  const out: Change[] = [];
  for (const [id, t] of b) {
    const old = a.get(id);
    if (!old) { out.push({ ...where, id, kind: 'added', after: state(t) }); continue; }
    const fields = (['type', 'value', 'description', 'extensions'] as const).filter((f) => !same(state(old)[f], state(t)[f]));
    if (fields.length) out.push({ ...where, id, kind: 'changed', before: state(old), after: state(t), fields: [...fields] });
  }
  for (const [id, t] of a) if (!b.has(id) && !skip.has(id)) out.push({ ...where, id, kind: 'removed', before: state(t) });
  return out;
}

/** Valor legível: alias como está, cor em hex, medida com unidade. */
export function show(s: TokenState | undefined): string {
  if (!s) return '—';
  const v = s.value as Record<string, unknown> | string | number;
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && typeof v.hex === 'string') return v.alpha !== undefined ? `${v.hex} (alpha ${v.alpha})` : v.hex;
  if (v && typeof v === 'object' && 'value' in v && 'unit' in v) return `${v.value}${v.unit}`;
  return JSON.stringify(v);
}
