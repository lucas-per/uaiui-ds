// Primeira sincronização real: o snapshot do Figma depois de renomear as 6 variables em colisão.
// A linha de base (a main antes da sincronização) está congelada neste arquivo, para os testes
// continuarem valendo depois que a sincronização entrar na main e o tokens/ mudar.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { test } from 'node:test';
import { runExport } from '../src/lib/pipeline.ts';
import { byteLength, counts, prBody } from '../src/lib/report.ts';
import { checkSnapshot, type Snapshot } from '../src/lib/snapshot.ts';
import { flatten } from '../src/lib/tree.ts';
import { CONFIG_PATH, generator, repoConfig } from './helpers.ts';

// Sem skip: se a fixture sumir, readFileSync lança e o teste falha.
const snapshot = (): Snapshot => JSON.parse(readFileSync(new URL('./fixtures/real-sem-colisoes.snapshot.json', import.meta.url), 'utf8'));

/**
 * tokens/*.json da origin/main em 39a38e2 (199 tokens, antes da sincronização), como { caminho: texto },
 * em JSON + gzip + base64. Para regerar: git show <commit>:<arquivo> de cada arquivo em tokens/.
 */
const BASELINE_GZ_B64 =
  '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';
const baseline = (): Map<string, string> => new Map(Object.entries(JSON.parse(gunzipSync(Buffer.from(BASELINE_GZ_B64, 'base64')).toString('utf8')) as Record<string, string>));

/** Os 18 alterados: token, alvo antigo (na main) e alvo novo (no Figma). */
const ALIASES: Array<[string, string, string]> = [
  ['interface.function.primary.normal.background', '{marca.palette.surface.100}', '{marca.behavior.normal.surface}'],
  ['interface.function.primary.normal.txtOn', '{marca.palette.txtOn.100}', '{marca.behavior.normal.txtOn}'],
  ['interface.function.primary.action.background', '{marca.palette.surface.120}', '{marca.behavior.action.surface}'],
  ['interface.function.primary.action.txtOn', '{marca.palette.txtOn.120}', '{marca.behavior.action.txtOn}'],
  ['interface.function.primary.active.background', '{marca.palette.surface.140}', '{marca.behavior.pressed.surface}'],
  ['interface.function.primary.active.txtOn', '{marca.palette.txtOn.140}', '{marca.behavior.pressed.txtOn}'],
  ['interface.function.secondary.normal.background', '{apoio.palette.surface.100}', '{apoio.behavior.normal.surface}'],
  ['interface.function.secondary.normal.txtOn', '{apoio.palette.txtOn.100}', '{apoio.behavior.normal.txtOn}'],
  ['interface.function.secondary.action.background', '{apoio.palette.surface.120}', '{apoio.behavior.action.surface}'],
  ['interface.function.secondary.action.txtOn', '{apoio.palette.txtOn.120}', '{apoio.behavior.action.txtOn}'],
  ['interface.function.secondary.active.background', '{apoio.palette.surface.140}', '{apoio.behavior.pressed.surface}'],
  ['interface.function.secondary.active.txtOn', '{apoio.palette.txtOn.140}', '{apoio.behavior.pressed.txtOn}'],
  ['interface.function.error.normal.background', '{error.palette.surface.100}', '{error.behavior.normal.surface}'],
  ['interface.function.error.normal.txtOn', '{error.palette.txtOn.100}', '{error.behavior.normal.txtOn}'],
  ['interface.function.error.action.background', '{error.palette.surface.120}', '{error.behavior.action.surface}'],
  ['interface.function.error.action.txtOn', '{error.palette.txtOn.120}', '{error.behavior.action.txtOn}'],
  ['interface.function.error.active.background', '{error.palette.surface.140}', '{error.behavior.pressed.surface}'],
  ['interface.function.error.active.txtOn', '{error.palette.txtOn.140}', '{error.behavior.pressed.txtOn}'],
];

const config = repoConfig();
const run = () => runExport({
  snapshot: snapshot(), config, configPath: CONFIG_PATH, main: baseline(), generator,
  base: { branch: 'main', sha: '39a38e22da6fa91a2606563ade19e7f956610b51' },
});

const NEGATIVA = 'Coleção "Semântica": o modo "Negativa" não foi exportado. No Figma, os 195 valores dele são placeholders (#ffffff). Foi exportado só o modo "Positiva".';

test('fixture: snapshot do Figma com 970 variables e a linha de base congelada com 199 tokens', () => {
  const s = snapshot();
  assert.equal(s.format, 'figma-variables-snapshot');
  assert.equal(s.fileName, 'UaiUI – Design Tokens');
  assert.equal(s.variables.length, 970);
  assert.deepEqual(checkSnapshot(s), []);
  const main = baseline();
  const tokens = [...main].filter(([p]) => p.endsWith('.json') && !p.endsWith('resolver.json'));
  assert.equal(tokens.length, 9);
  const ids = new Set(tokens.flatMap(([, text]) => [...flatten(JSON.parse(text)).keys()]));
  assert.equal(ids.size, 199);
});

test('0 colisões entre token e grupo: o export não bloqueia', () => {
  const names = new Set(snapshot().variables.map((v) => v.name));
  const colisoes = [...names].filter((n) => [...names].some((o) => o.startsWith(n + '/')));
  assert.deepEqual(colisoes, []);
  const r = run();
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.unresolved, []);
  assert.ok(![...r.errors, ...r.warnings, r.report].some((t) => t.includes('é token e também grupo')));
});

test('771 adicionados, 18 alterados (alias para behavior), 0 removidos, contra a linha de base congelada', () => {
  const r = run();
  assert.deepEqual(counts(r.changes), { added: 771, changed: 18, removed: 0 });
  const changed = r.changes.filter((c) => c.kind === 'changed');
  assert.deepEqual(changed.map((c) => c.id).sort(), ALIASES.map(([id]) => id).sort());
  const main = baseline();
  const before = new Map([...main].filter(([p]) => p.endsWith('semantica.json')).flatMap(([, t]) => [...flatten(JSON.parse(t))]));
  for (const [id, antigo, novo] of ALIASES) {
    const c = changed.find((x) => x.id === id)!;
    assert.deepEqual(c.fields, ['value'], id);
    assert.equal(c.before?.value, antigo, id);
    assert.equal(c.after?.value, novo, id);
    assert.equal(before.get(id)?.value, antigo, `${id} na linha de base`);
  }
});

test('0 diferenças de cor nos 18 aliases alterados, em Claro e em Escuro', () => {
  const r = run();
  const hex = (files: ReadonlyMap<string, string>, tema: string, id: string): string => {
    const order = [`tokens/primitivos/${tema}.json`, ...[...files.keys()].filter((p) => p.startsWith('tokens/') && !p.includes('/primitivos/') && !p.includes('/densidade/') && !p.endsWith('resolver.json'))];
    const flats = order.map((p) => flatten(JSON.parse(files.get(p)!)));
    const walk = (name: string, depth: number): string => {
      assert.ok(depth < 20, `ciclo em ${name}`);
      const t = flats.map((f) => f.get(name)).find(Boolean);
      assert.ok(t, `${name} não existe`);
      const v = t.value as unknown;
      if (typeof v === 'string') return walk(v.slice(1, -1), depth + 1);
      return (v as { hex: string }).hex;
    };
    return walk(id, 0);
  };
  const main = baseline();
  const depois = new Map([...r.files].filter(([p]) => p.startsWith('tokens/')));
  for (const tema of ['claro', 'escuro']) {
    for (const [id, antigo, novo] of ALIASES) {
      const antes = hex(main, tema, antigo.slice(1, -1));
      assert.match(antes, /^#[0-9a-f]{6}$/);
      assert.equal(hex(depois, tema, novo.slice(1, -1)), antes, `${id} (${tema})`);
      assert.equal(hex(depois, tema, id), antes, `${id} resolvido (${tema})`);
    }
  }
});

test('corpo da PR dentro de 60.000 bytes, sem aviso de colisão, só com o aviso da Negativa', () => {
  const r = run();
  assert.ok(byteLength(r.report) > 60000, `${byteLength(r.report)} bytes`);
  assert.deepEqual(r.warnings, [NEGATIVA]);
  const out = prBody(r.reportInput);
  assert.ok(out.ok);
  assert.ok(byteLength(out.body) <= 60000, `${byteLength(out.body)} bytes`);
  assert.ok(out.omitted > 0);
  assert.ok(out.body.includes(`### Avisos\n\n- ${NEGATIVA}\n`));
  assert.ok(!out.body.includes('é token e também grupo'));
  assert.ok(out.body.includes('### Alterados (18)'));
  assert.ok(out.body.includes('### Adicionados (771)'));
});
