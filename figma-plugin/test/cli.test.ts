// CLI (cli/export.ts): roda como processo filho, sempre com --repo numa pasta temporária.
// Nenhum teste grava no repositório real.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { runExport } from '../src/lib/pipeline.ts';
import { byteLength, prBody } from '../src/lib/report.ts';
import type { Snapshot } from '../src/lib/snapshot.ts';
import { CONFIG_PATH, baselineFiles, generator, repoConfig } from './helpers.ts';

const CLI = fileURLToPath(new URL('../cli/export.ts', import.meta.url));
const FIX = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const SEM_COLISOES = FIX('real-sem-colisoes.snapshot.json');
const COM_COLISOES = FIX('real.snapshot.json');

/** Repositório temporário com a linha de base congelada (tokens/, resolver, CSS) e a config. */
function tempRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'cli-export-'));
  for (const [path, text] of baselineFiles()) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}
const cli = (...args: string[]) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
const listFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? listFiles(p) : [p]; }).sort();
/** caminho → sha256 de todos os arquivos da pasta. */
const hashes = (dir: string) => Object.fromEntries(listFiles(dir).map((p) => [relative(dir, p), createHash('sha256').update(readFileSync(p)).digest('hex')]));
const mtimes = (dir: string) => Object.fromEntries(listFiles(dir).map((p) => [relative(dir, p), statSync(p).mtimeMs]));
const expected = () => {
  const config = repoConfig();
  const snapshot = JSON.parse(readFileSync(SEM_COLISOES, 'utf8')) as Snapshot;
  return runExport({ snapshot, config, configPath: CONFIG_PATH, main: baselineFiles(), generator });
};

test('(a) --write grava tokens/ e os dois CSS idênticos ao que o runExport devolve', () => {
  const repo = tempRepo();
  const before = hashes(repo);
  const r = cli(SEM_COLISOES, '--repo', repo, '--write');
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /Adicionados: 771 · Alterados: 18 · Removidos: 0/);
  assert.match(r.stdout, /Gravados 9 arquivo\(s\)/);
  const want = expected();
  assert.deepEqual(want.errors, []);
  assert.equal(want.changedFiles.length, 9);
  for (const [path, text] of want.files) assert.equal(readFileSync(join(repo, path), 'utf8'), text, path);
  // O que não mudou (resolver, config) ficou como estava, e nada além dos 9 mudou nem foi criado.
  const after = hashes(repo);
  assert.deepEqual(Object.keys(after).sort(), Object.keys(before).sort());
  assert.deepEqual(Object.keys(after).filter((p) => after[p] !== before[p]).sort(), [...want.changedFiles].sort());
  assert.ok(!Object.keys(after).some((p) => p.includes('.tmp-')));
});

test('(b) sem --write nada é gravado', () => {
  const repo = tempRepo();
  const before = hashes(repo);
  const r = cli(SEM_COLISOES, '--repo', repo);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.deepEqual(hashes(repo), before);
  assert.match(r.stdout, /Adicionados: 771 · Alterados: 18 · Removidos: 0/);
  assert.match(r.stdout, /Avisos \(1\):\n {2}- Coleção "Semântica": o modo "Negativa" não foi exportado\./);
  assert.match(r.stdout, /Arquivos que mudariam \(9\):/);
  assert.match(r.stdout, /Nada gravado \(modo padrão\)\./);
  // Sem detalhe por variable: o detalhe fica no corpo da PR.
  assert.ok(!r.stdout.includes('interface.function'));
});

test('(c) com o real.snapshot.json (6 colisões) sai com código 1 e não grava nada', () => {
  for (const extra of [[], ['--write'], ['--write', '--pr-body', 'corpo.md']]) {
    const repo = tempRepo();
    const before = hashes(repo);
    const body = join(repo, '..', `corpo-${process.pid}-${extra.length}.md`);
    const args = extra.map((a) => (a === 'corpo.md' ? body : a));
    const r = cli(COM_COLISOES, '--repo', repo, ...args);
    assert.equal(r.status, 1, r.stdout);
    assert.deepEqual(hashes(repo), before);
    assert.ok(!existsSync(body));
    assert.match(r.stdout, /Erros \(6\):/);
    for (const [t, g] of [['checkbox/border', 'checkbox/border/error'], ['modal/scrim', 'modal/scrim/opacity'], ['slider/tick', 'slider/tick/gap']])
      assert.ok(r.stdout.includes(`${t}: é token e também grupo de ${g}`), r.stdout);
    assert.match(r.stdout, /Nada foi gravado: o export tem 6 erro\(s\)\./);
    assert.ok(!r.stdout.includes('Arquivos que mudariam'));
  }
});

test('(d) rodar duas vezes com --write é idempotente: a segunda não grava nem toca em nada', () => {
  const repo = tempRepo();
  assert.equal(cli(SEM_COLISOES, '--repo', repo, '--write').status, 0);
  const h1 = hashes(repo), t1 = mtimes(repo);
  const second = cli(SEM_COLISOES, '--repo', repo, '--write');
  assert.equal(second.status, 0, second.stderr + second.stdout);
  assert.match(second.stdout, /Adicionados: 0 · Alterados: 0 · Removidos: 0/);
  assert.match(second.stdout, /Arquivos que mudariam \(0\):/);
  assert.match(second.stdout, /Gravados 0 arquivo\(s\)/);
  assert.deepEqual(hashes(repo), h1);
  assert.deepEqual(mtimes(repo), t1);
});

test('(e) --pr-body grava o corpo da PR dentro de 60.000 bytes, igual ao prBody', () => {
  const repo = tempRepo();
  const before = hashes(repo);
  const body = join(mkdtempSync(join(tmpdir(), 'cli-body-')), 'corpo.md');
  const r = cli(SEM_COLISOES, '--repo', repo, '--pr-body', body);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.deepEqual(hashes(repo), before); // --pr-body sozinho não grava o repositório
  const text = readFileSync(body, 'utf8');
  assert.ok(byteLength(text) <= 60000, `${byteLength(text)} bytes`);
  const want = prBody(expected().reportInput);
  assert.ok(want.ok);
  assert.equal(text, want.body);
  assert.ok(want.omitted > 0 && text.includes('### Avisos') && text.includes('### Arquivos') && text.includes('### Alterados (18)'));
  assert.match(r.stdout, new RegExp(`Corpo da PR gravado em .*corpo\\.md \\(${byteLength(text)} bytes, ${want.omitted} itens omitidos das listas\\)`));
});

test('variable nova sem tipo: erro com a linha sugerida para a tabela types, sem gravar', () => {
  const repo = tempRepo();
  const configFile = join(repo, CONFIG_PATH);
  const config = JSON.parse(readFileSync(configFile, 'utf8'));
  delete config.types['modal/scrim/opacity'];
  writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n');
  const before = hashes(repo);
  const r = cli(SEM_COLISOES, '--repo', repo, '--write');
  assert.equal(r.status, 1, r.stdout);
  assert.deepEqual(hashes(repo), before);
  assert.ok(r.stdout.includes(`Acrescente à tabela "types" de ${CONFIG_PATH}:\n  "modal/scrim/opacity": "number",`), r.stdout);
});

test('uso errado ou entrada inválida: código 2, sem gravar', () => {
  const repo = tempRepo();
  const before = hashes(repo);
  const ruim = join(repo, '..', `ruim-${process.pid}.json`);
  writeFileSync(ruim, '{"format":"x"}');
  const casos: Array<[string[], RegExp]> = [
    [[], /falta o arquivo de snapshot/],
    [[SEM_COLISOES, '--nada'], /opção desconhecida: --nada/],
    [[SEM_COLISOES, '--pr-body'], /--pr-body precisa de um valor/],
    [[SEM_COLISOES, 'outro.json'], /argumento a mais: outro\.json/],
    [['nao-existe.json', '--repo', repo], /não consegui ler o snapshot/],
    [[ruim, '--repo', repo], /snapshot inválido/],
    [[SEM_COLISOES, '--repo', repo, '--config', 'nao/existe.json'], /não consegui ler a config/],
  ];
  for (const [args, re] of casos) {
    const r = cli(...args);
    assert.equal(r.status, 2, args.join(' '));
    assert.match(r.stderr, re, args.join(' '));
    assert.equal(r.stdout, '');
  }
  assert.deepEqual(hashes(repo), before);
  const help = cli('--help');
  assert.equal(help.status, 0);
  assert.match(help.stdout, /^Uso: node cli\/export\.ts/);
});

test('o CLI não usa rede nem token: não importa o cliente do GitHub', () => {
  const src = readFileSync(CLI, 'utf8');
  assert.ok(!/github|fetch\(|XMLHttpRequest|node:(http|https|net|dns|tls)|process\.env|Authorization/i.test(src.replace(/\/\/.*$/gm, '')));
});
