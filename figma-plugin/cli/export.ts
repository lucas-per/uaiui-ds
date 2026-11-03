// CLI: a mesma exportação do plugin (runExport), a partir de um arquivo de snapshot, lendo e gravando o disco.
// Sem rede e sem token: não abre PR. Roda direto no Node 22.18+ ou 24 (type stripping):
//   node cli/export.ts <snapshot.json> [--write] [--pr-body <arquivo>] [--repo <pasta>] [--config <caminho>]
// Códigos de saída: 0 ok · 1 o export tem erros (nada é gravado) · 2 uso errado ou entrada inválida.

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as generator from '../../scripts/lib/tokens-core.mjs';
import { parseConfig } from '../src/lib/config.ts';
import { runExport } from '../src/lib/pipeline.ts';
import { counts, prBody } from '../src/lib/report.ts';
import { checkSnapshot, type Snapshot } from '../src/lib/snapshot.ts';
import { SOURCES } from '../src/lib/types.ts';

const HELP = `Uso: node cli/export.ts <snapshot.json> [opções]

Roda a exportação do plugin sobre um snapshot ("figma-variables-snapshot") contra os arquivos do
repositório no disco. Sem rede, sem token, sem abrir PR. Por padrão não grava nada.

  --write              grava os arquivos de tokens e o CSS que mudam
  --pr-body <arquivo>  grava o corpo da PR (até 60.000 bytes)
  --repo <pasta>       raiz do repositório (padrão: o repositório deste CLI)
  --config <caminho>   config dentro do repositório (padrão: figma-plugin/figma.config.json)
  --help               esta mensagem

Saída: 0 ok · 1 o export tem erros (nada é gravado) · 2 uso errado ou entrada inválida
`;

class UsageError extends Error {}

interface Options { snapshot: string; write: boolean; prBody?: string; repo: string; config: string }

function parseArgs(argv: string[]): Options | 'help' {
  const o: Options = { snapshot: '', write: false, repo: resolve(fileURLToPath(new URL('../../', import.meta.url))), config: 'figma-plugin/figma.config.json' };
  const value = (i: number, flag: string) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) throw new UsageError(`${flag} precisa de um valor`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') return 'help';
    else if (a === '--write') o.write = true;
    else if (a === '--pr-body') o.prBody = value(i++, a);
    else if (a === '--repo') o.repo = resolve(value(i++, a));
    else if (a === '--config') o.config = value(i++, a);
    else if (a.startsWith('--')) throw new UsageError(`opção desconhecida: ${a}`);
    else if (!o.snapshot) o.snapshot = a;
    else throw new UsageError(`argumento a mais: ${a}`);
  }
  if (!o.snapshot) throw new UsageError('falta o arquivo de snapshot');
  return o;
}

const readText = (path: string, what: string) => {
  try { return readFileSync(path, 'utf8'); } catch { throw new UsageError(`não consegui ler ${what}: ${path}`); }
};

/** Os arquivos do repositório como o plugin os lê da main: pasta de tokens, saídas do gerador e a config. */
function readRepo(repo: string, tokensDir: string, outputs: string[], configPath: string): Map<string, string> {
  const files = new Map<string, string>();
  const add = (abs: string) => files.set(relative(repo, abs).split('\\').join('/'), readFileSync(abs, 'utf8'));
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else if (name.endsWith('.json')) add(abs);
    }
  };
  const dir = join(repo, tokensDir);
  if (existsSync(dir)) walk(dir);
  for (const p of [...outputs, configPath]) if (existsSync(join(repo, p))) add(join(repo, p));
  return files;
}

/** Grava todos ou nenhum: escreve ao lado como .tmp e só renomeia depois que todos foram escritos. */
function writeAll(repo: string, files: Array<[string, string]>) {
  const tmp: Array<[string, string]> = [];
  try {
    for (const [path, text] of files) {
      const target = join(repo, path);
      mkdirSync(dirname(target), { recursive: true });
      const part = `${target}.tmp-${process.pid}`;
      writeFileSync(part, text);
      tmp.push([part, target]);
    }
    for (const [part, target] of tmp) renameSync(part, target);
  } catch (e) {
    for (const [part] of tmp) rmSync(part, { force: true });
    throw e;
  }
}

function run(argv: string[], out: (s: string) => void): number {
  const parsed = parseArgs(argv);
  if (parsed === 'help') { out(HELP.trimEnd()); return 0; }
  const o = parsed;

  const snapshot = (() => {
    try { return JSON.parse(readText(o.snapshot, 'o snapshot')) as Snapshot; } catch (e) {
      throw e instanceof UsageError ? e : new UsageError(`snapshot com JSON inválido: ${o.snapshot}`);
    }
  })();
  const snapErrors = checkSnapshot(snapshot);
  if (snapErrors.length) throw new UsageError(`snapshot inválido:\n  - ${snapErrors.join('\n  - ')}`);

  const { config, errors: configErrors } = parseConfig(readText(join(o.repo, o.config), 'a config'), o.config);
  if (!config) throw new UsageError(configErrors.join('\n'));

  const main = readRepo(o.repo, config.tokensDir, Object.values(config.outputs), o.config);
  const r = runExport({ snapshot, config, configPath: o.config, main, generator });
  const n = counts(r.changes);

  out(`Snapshot: ${o.snapshot} (${snapshot.fileName}, ${snapshot.variables.length} variables)`);
  out(`Repositório: ${o.repo}`);
  out(`Adicionados: ${n.added} · Alterados: ${n.changed} · Removidos: ${n.removed}`);
  out(`Tipo resolvido por: ${SOURCES.map((s) => `${s} ${r.sources[s]}`).join(' · ')}`);
  if (r.warnings.length) out(`\nAvisos (${r.warnings.length}):\n${r.warnings.map((w) => `  - ${w}`).join('\n')}`);
  if (r.errors.length) out(`\nErros (${r.errors.length}):\n${r.errors.map((e) => `  - ${e}`).join('\n')}`);
  if (r.unresolved.length) {
    out(`\nVariables novas sem tipo. Acrescente à tabela "types" de ${o.config}:`);
    for (const u of r.unresolved) out(`  "${u.name}": "${u.suggestion ?? '<' + u.allowed.join('|') + '>'}",${u.suggestion ? '' : `  // ${u.resolvedType}, escopos: ${u.scopes.join(', ') || 'nenhum'}`}`);
  }
  if (!r.errors.length) out(`\nArquivos que mudariam (${r.changedFiles.length}):\n${r.changedFiles.map((f) => `  - ${f}`).join('\n') || '  (nenhum)'}`);

  if (r.errors.length) {
    out(`\nNada foi gravado: o export tem ${r.errors.length} erro(s).`);
    return 1;
  }
  const body = o.prBody ? prBody(r.reportInput) : undefined;
  if (body && !body.ok) {
    out(`\nNada foi gravado: ${body.error}`);
    return 1;
  }
  if (!o.write && !o.prBody) {
    out('\nNada gravado (modo padrão). Use --write para gravar os arquivos.');
    return 0;
  }
  if (o.write) {
    writeAll(o.repo, r.changedFiles.map((p) => [p, r.files.get(p)!]));
    out(`\nGravados ${r.changedFiles.length} arquivo(s) em ${o.repo}.`);
  } else out('\nNenhum arquivo do repositório gravado (sem --write).');
  if (o.prBody && body?.ok) {
    writeFileSync(resolve(o.prBody), body.body);
    out(`Corpo da PR gravado em ${resolve(o.prBody)} (${Buffer.byteLength(body.body)} bytes${body.omitted ? `, ${body.omitted} itens omitidos das listas` : ''}).`);
  }
  return 0;
}

try {
  process.exitCode = run(process.argv.slice(2), (s) => console.log(s));
} catch (e) {
  if (e instanceof UsageError) {
    console.error(`Erro: ${e.message}\n\n${HELP.trimEnd()}`);
    process.exitCode = 2;
  } else throw e;
}
