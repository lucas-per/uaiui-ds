// Primeira sincronização real: o snapshot do Figma depois de renomear as 6 variables em colisão.
// A linha de base (a main antes da sincronização) está congelada em test/fixtures, para os testes
// continuarem valendo depois que a sincronização entrar na main e o tokens/ mudar.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runExport } from '../src/lib/pipeline.ts';
import { byteLength, counts, prBody } from '../src/lib/report.ts';
import { checkSnapshot, type Snapshot } from '../src/lib/snapshot.ts';
import { flatten } from '../src/lib/tree.ts';
import { BASELINE_SHA256, CONFIG_PATH, baselineFiles, generator, repoConfig } from './helpers.ts';

// Sem skip: se a fixture sumir, readFileSync lança e o teste falha.
const snapshot = (): Snapshot => JSON.parse(readFileSync(new URL('./fixtures/real-sem-colisoes.snapshot.json', import.meta.url), 'utf8'));

// Linha de base: baselineFiles() (test/helpers.ts), a main em 39a38e2, antes da primeira sincronização.
const baseline = baselineFiles;

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
  const tokens = [...main].filter(([p]) => p.startsWith('tokens/') && p.endsWith('.json') && !p.endsWith('resolver.json'));
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

test('integridade da linha de base congelada: arquivo, 12 arquivos de referência e os dois CSS', () => {
  const sha = (t: string | Buffer) => createHash('sha256').update(t).digest('hex');
  const aviso = 'A linha de base congelada mudou. Leia o comentário "LINHA DE BASE CONGELADA" em test/helpers.ts antes de atualizar os hashes.';
  assert.equal(sha(readFileSync(new URL('./fixtures/baseline-main-39a38e2.json', import.meta.url))), BASELINE_SHA256, aviso);
  const main = baseline();
  assert.deepEqual([...main.keys()].filter((p) => p !== CONFIG_PATH).sort(), [
    'src/styles/tokens-wrapper.css', 'src/styles/tokens.css',
    'tokens/componente.json', 'tokens/densidade/comfortable.json', 'tokens/densidade/compact.json', 'tokens/densidade/standard.json',
    'tokens/dimensoes.json', 'tokens/escala.json', 'tokens/primitivos/claro.json', 'tokens/primitivos/escuro.json',
    'tokens/semantica.json', 'tokens/uaiui.resolver.json',
  ], aviso);
  assert.equal(sha(main.get('src/styles/tokens.css')!), 'f593605edb8b9c257ee1765e96c095ce8411038871eebf1acff9d00a1bb87126', aviso);
  assert.equal(sha(main.get('src/styles/tokens-wrapper.css')!), '1dd5b24809bab65f69b951f5c9ee0d90a18c20d9bd30e5ff6f307dc338000bc6', aviso);
});
