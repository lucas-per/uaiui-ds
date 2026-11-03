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

interface ReportList { title: string; items: string[] }

/** Partes do relatório: o bloco fixo (resumo, Avisos, Arquivos) e as listas por token, na ordem em que saem. */
function reportParts(input: ReportInput): { head: string[]; lists: ReportList[] } {
  const n = counts(input.changes);
  const groups = [...byToken(input.changes).values()];
  const list = (kind: Change['kind'], title: string, line: (cs: Change[]) => string): ReportList =>
    ({ title, items: groups.filter((cs) => cs[0].kind === kind).map((cs) => `- ${code(cs[0].id)} ${line(cs)}`) });
  const head = [
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
    ...(input.warnings.length ? ['### Avisos', '', ...input.warnings.map((w) => `- ${w}`), ''] : []),
    ...(input.changedFiles.length ? ['### Arquivos', '', ...input.changedFiles.map((f) => `- ${code(f)}`), ''] : []),
  ];
  const lists = [
    list('changed', 'Alterados', (cs) => cs.map((c) => `${label(c)}${what(c)}`).join(' · ')),
    list('removed', 'Removidos', (cs) => `(${cs.map((c) => `${label(c)}${code(show(c.before))}`).join(' · ')})`),
    list('added', 'Adicionados', (cs) => `${code(String(cs[0].after?.type))} (${cs.map((c) => `${label(c)}${code(show(c.after))}`).join(' · ')})`),
  ];
  return { head, lists };
}

const cutLine = (omitted: number) =>
  `Corpo cortado pelo limite do GitHub (${omitted} ${omitted === 1 ? 'item omitido' : 'itens omitidos'}). A lista completa está nos arquivos da PR e na tela do plugin.`;

/** Monta o texto mostrando os `shown[i]` primeiros itens de cada lista; lista cortada termina com "- … +N". */
function render(head: string[], lists: ReportList[], shown: number[]): string {
  const lines = [...head];
  let omitted = 0;
  lists.forEach((l, i) => {
    if (!l.items.length) return;
    lines.push(`### ${l.title} (${l.items.length})`, '', ...l.items.slice(0, shown[i]));
    if (shown[i] < l.items.length) lines.push(`- … +${l.items.length - shown[i]}`);
    lines.push('');
    omitted += l.items.length - shown[i];
  });
  if (omitted) lines.push(cutLine(omitted), '');
  return lines.join('\n');
}

/** Relatório completo, na ordem resumo e contagens → Avisos → Arquivos → Alterados → Removidos → Adicionados. */
export function report(input: ReportInput): string {
  const { head, lists } = reportParts(input);
  return render(head, lists, lists.map((l) => l.items.length));
}

/**
 * Limite do corpo da PR. O GitHub aceita até 65.536 caracteres; medimos em bytes UTF-8 por segurança
 * (o relatório tem muitos caracteres de 2 e 3 bytes, como "ã", "·" e "→"), com folga abaixo desse número.
 */
export const PR_BODY_MAX_BYTES = 60000;

const utf8 = new TextEncoder();
export const byteLength = (s: string) => utf8.encode(s).length;
const thousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export type PrBody = { ok: true; body: string; omitted: number } | { ok: false; error: string };

/**
 * Corpo da PR: o relatório inteiro, se couber. Se não couber, o resumo, os Avisos e os Arquivos ficam inteiros
 * e só as listas são cortadas. Se nem o bloco fixo couber, recusa (a PR não deve abrir sem os avisos).
 */
export function prBody(input: ReportInput, max = PR_BODY_MAX_BYTES): PrBody {
  const { head, lists } = reportParts(input);
  const full = render(head, lists, lists.map((l) => l.items.length));
  if (byteLength(full) <= max) return { ok: true, body: full, omitted: 0 };
  // Pior caso do esqueleto: todos os títulos, um "- … +N" por lista e a linha de corte com a contagem total.
  const skeleton = render(head, lists, lists.map(() => 0));
  if (byteLength(skeleton) > max) {
    const fixed = byteLength(head.join('\n'));
    return { ok: false, error: `Não dá para abrir a PR: o resumo, os avisos e a lista de arquivos ocupam ${thousands(fixed)} bytes, e o corpo da PR tem limite de ${thousands(max)} bytes. Esse bloco não é cortado, para a PR não sair sem os avisos. Use "Baixar .zip" ou reduza os avisos.` };
  }
  let budget = max - byteLength(skeleton);
  const shown = lists.map(() => 0);
  fill: for (const [i, l] of lists.entries()) {
    for (const item of l.items) {
      const cost = byteLength(item) + 1;
      if (cost > budget) break fill;
      budget -= cost;
      shown[i]++;
    }
  }
  const body = render(head, lists, shown);
  const omitted = lists.reduce((n, l, i) => n + l.items.length - shown[i], 0);
  return { ok: true, body, omitted };
}
