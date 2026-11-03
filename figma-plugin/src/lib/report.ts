// Relatório em markdown: corpo da PR e resumo do export.

import { show, type Change } from './diff.ts';
import { SOURCES, type TypeSource } from './types.ts';

export interface ReportInput {
  fileName: string;
  base: { branch: string; sha: string } | null;
  changes: Change[];
  sources: Record<TypeSource, number>;
  warnings: string[];
  changedFiles: string[];
}

/** Agrupa as mudanças por token, mantendo a ordem em que aparecem. */
export function byToken(changes: Change[]): Map<string, Change[]> {
  const out = new Map<string, Change[]>();
  for (const c of changes) {
    const key = `${c.kind}\u0000${c.id}`;
    if (!out.has(key)) out.set(key, []);
    out.get(key)!.push(c);
  }
  return out;
}

export function counts(changes: Change[]) {
  const ids = (k: Change['kind']) => new Set(changes.filter((c) => c.kind === k).map((c) => c.id)).size;
  return { added: ids('added'), changed: ids('changed'), removed: ids('removed') };
}

const code = (s: string) => '`' + s.replace(/`/g, 'ˋ') + '`';
const label = (c: Change) => (c.mode === null ? '' : `${c.mode}: `);
const what = (c: Change) => {
  const parts: string[] = [];
  for (const f of c.fields ?? []) {
    if (f === 'value') parts.push(`${code(show(c.before))} → ${code(show(c.after))}`);
    if (f === 'type') parts.push(`$type ${code(String(c.before?.type))} → ${code(String(c.after?.type))}`);
    if (f === 'description') parts.push(`$description ${code(c.before?.description ?? '—')} → ${code(c.after?.description ?? '—')}`);
    if (f === 'extensions') parts.push('$extensions');
  }
  return parts.join('; ');
};

export function report(input: ReportInput): string {
  const n = counts(input.changes);
  const groups = [...byToken(input.changes).values()];
  const section = (kind: Change['kind'], title: string, line: (cs: Change[]) => string) => {
    const list = groups.filter((cs) => cs[0].kind === kind);
    return list.length ? [`### ${title} (${list.length})`, '', ...list.map((cs) => `- ${code(cs[0].id)} ${line(cs)}`), ''] : [];
  };
  const lines = [
    '## Tokens exportados do Figma',
    '',
    `Arquivo do Figma: **${input.fileName}**${input.base ? ` · base: ${code(input.base.branch)} em ${code(input.base.sha.slice(0, 7))}` : ''}`,
    '',
    '| Tokens | Quantidade |',
    '|---|---:|',
    `| Adicionados | ${n.added} |`,
    `| Alterados | ${n.changed} |`,
    `| Removidos | ${n.removed} |`,
    '',
    `Tipo resolvido por: ${SOURCES.map((s) => `${s} ${input.sources[s] ?? 0}`).join(' · ')}`,
    '',
    ...section('changed', 'Alterados', (cs) => cs.map((c) => `${label(c)}${what(c)}`).join(' · ')),
    ...section('removed', 'Removidos', (cs) => `(${cs.map((c) => `${label(c)}${code(show(c.before))}`).join(' · ')})`),
    ...section('added', 'Adicionados', (cs) => `${code(String(cs[0].after?.type))} (${cs.map((c) => `${label(c)}${code(show(c.after))}`).join(' · ')})`),
    ...(input.warnings.length ? ['### Avisos', '', ...input.warnings.map((w) => `- ${w}`), ''] : []),
    ...(input.changedFiles.length ? ['### Arquivos', '', ...input.changedFiles.map((f) => `- ${code(f)}`), ''] : []),
  ];
  return lines.join('\n');
}

/** O corpo de PR do GitHub aceita até 65 536 caracteres. */
export function fitBody(body: string, max = 60000): string {
  if (body.length <= max) return body;
  const lines = body.split('\n');
  let out = '';
  let i = 0;
  for (; i < lines.length && out.length + lines[i].length + 1 < max - 200; i++) out += lines[i] + '\n';
  return `${out}\n… relatório cortado: ${lines.length - i} linhas omitidas por causa do limite do GitHub. O plugin mostra o diff inteiro.\n`;
}
