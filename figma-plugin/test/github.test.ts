// Cliente do GitHub com fetch falso: chamadas esperadas, recusa de ref fora do prefixo e token fora dos erros.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { branchName, createGitHub } from '../src/lib/github.ts';
import { readMain } from '../src/lib/main.ts';
import { fitBody } from '../src/lib/report.ts';
import { CONFIG_PATH, repoFiles } from './helpers.ts';

const TOKEN = 'github_pat_TESTE123segredo';
type Call = { method: string; url: string; headers: Record<string, string>; body?: unknown };

function fakeFetch(routes: Record<string, (call: Call) => { status?: number; json?: unknown; text?: string }>) {
  const calls: Call[] = [];
  const fetch = (async (url: string, init: RequestInit) => {
    const call: Call = { method: init.method!, url, headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(init.body as string) : undefined };
    calls.push(call);
    const key = `${call.method} ${url.replace('https://api.github.com', '')}`;
    const route = Object.entries(routes).find(([k]) => key === k || (k.endsWith('*') && key.startsWith(k.slice(0, -1))));
    const r = route ? route[1](call) : { status: 404, json: { message: 'Not Found' } };
    const status = r.status ?? 200;
    return new Response(r.text ?? JSON.stringify(r.json ?? {}), { status, statusText: status === 200 ? 'OK' : 'Erro' });
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

test('branchName: tokens/figma-AAAAMMDD-HHMM no horário local', () => {
  assert.equal(branchName(new Date(2026, 10, 3, 9, 5)), 'tokens/figma-20261103-0905');
});

test('readMain lê ref, commit, árvore, config, tokens e CSS do mesmo SHA, sem token', async () => {
  const files = repoFiles();
  const paths = [...files.keys(), 'README.md', 'src/styles/components/button.css'];
  const { fetch, calls } = fakeFetch({
    'GET /repos/dono/repo/git/ref/heads/main': () => ({ json: { object: { sha: 'abc123' } } }),
    'GET /repos/dono/repo/git/commits/abc123': () => ({ json: { tree: { sha: 'tree1' } } }),
    'GET /repos/dono/repo/git/trees/tree1?recursive=1': () => ({ json: { truncated: false, tree: paths.map((path) => ({ path, type: 'blob' })) } }),
    'GET /repos/dono/repo/contents/*': (c) => {
      const path = decodeURIComponent(c.url.split('/contents/')[1].split('?')[0]);
      assert.ok(c.url.endsWith('?ref=abc123'));
      assert.equal(c.headers.Accept, 'application/vnd.github.raw+json');
      return { text: files.get(path)! };
    },
  });
  const gh = createGitHub({ owner: 'dono', repo: 'repo', fetch });
  const { state, errors } = await readMain(gh, 'main', CONFIG_PATH);
  assert.deepEqual(errors, []);
  assert.equal(state!.sha, 'abc123');
  assert.deepEqual([...state!.files.keys()].sort(), [...files.keys()].sort());
  assert.ok(calls.every((c) => c.method === 'GET' && !('Authorization' in c.headers)));
  assert.equal(calls.length, 3 + files.size);
});

test('openPullRequest: árvore, commit, ref tokens/figma-… e PR, nessa ordem, com token', async () => {
  const { fetch, calls } = fakeFetch({
    'POST /repos/dono/repo/git/trees': () => ({ status: 201, json: { sha: 'tree2' } }),
    'POST /repos/dono/repo/git/commits': () => ({ status: 201, json: { sha: 'commit2' } }),
    'POST /repos/dono/repo/git/refs': () => ({ status: 201, json: {} }),
    'POST /repos/dono/repo/pulls': () => ({ status: 201, json: { html_url: 'https://github.com/dono/repo/pull/7', number: 7 } }),
  });
  const gh = createGitHub({ owner: 'dono', repo: 'repo', token: TOKEN, fetch });
  const pr = await gh.openPullRequest({
    base: 'main', sha: 'abc123', treeSha: 'tree1', branch: 'tokens/figma-20261103-0905',
    files: { 'tokens/a.json': '{}\n', 'src/styles/tokens.css': 'x' }, message: 'Tokens do Figma', title: 'Tokens do Figma', body: 'relatório',
  });
  assert.deepEqual(pr, { url: 'https://github.com/dono/repo/pull/7', number: 7, commit: 'commit2' });
  assert.deepEqual(calls.map((c) => `${c.method} ${c.url.replace('https://api.github.com', '')}`), [
    'POST /repos/dono/repo/git/trees', 'POST /repos/dono/repo/git/commits', 'POST /repos/dono/repo/git/refs', 'POST /repos/dono/repo/pulls',
  ]);
  assert.deepEqual(calls[0].body, { base_tree: 'tree1', tree: [
    { path: 'tokens/a.json', mode: '100644', type: 'blob', content: '{}\n' },
    { path: 'src/styles/tokens.css', mode: '100644', type: 'blob', content: 'x' },
  ] });
  assert.deepEqual(calls[1].body, { message: 'Tokens do Figma', tree: 'tree2', parents: ['abc123'] });
  assert.deepEqual(calls[2].body, { ref: 'refs/heads/tokens/figma-20261103-0905', sha: 'commit2' });
  assert.deepEqual(calls[3].body, { title: 'Tokens do Figma', head: 'tokens/figma-20261103-0905', base: 'main', body: 'relatório' });
  assert.ok(calls.every((c) => c.headers.Authorization === `Bearer ${TOKEN}`));
  assert.ok(!calls.some((c) => c.method === 'PATCH' || c.method === 'PUT' || /merge/.test(c.url)));
});

test('recusa branch fora de tokens/figma-, branch igual à base e PR sem token, sem chamar a API', async () => {
  const { fetch, calls } = fakeFetch({});
  const gh = createGitHub({ owner: 'dono', repo: 'repo', token: TOKEN, fetch });
  const p = { base: 'main', sha: 'a', treeSha: 't', files: { a: 'b' }, message: 'm', title: 't', body: 'b' };
  for (const branch of ['main', 'refs/heads/main', 'tokens/figma-../main', 'feat/x', 'tokens/figmax']) {
    await assert.rejects(gh.openPullRequest({ ...p, branch }), /só cria branches tokens\/figma-/, branch);
  }
  await assert.rejects(gh.openPullRequest({ ...p, branch: 'tokens/figma-1', base: 'tokens/figma-1' }), /não pode ser a branch base/);
  await assert.rejects(gh.openPullRequest({ ...p, branch: 'tokens/figma-1', files: {} }), /nenhum arquivo mudou/);
  const anon = createGitHub({ owner: 'dono', repo: 'repo', fetch });
  await assert.rejects(anon.openPullRequest({ ...p, branch: 'tokens/figma-1' }), /falta o token/);
  assert.equal(calls.length, 0);
  assert.throws(() => createGitHub({ owner: 'dono/../x', repo: 'repo', fetch }), /owner ou repositório inválido/);
});

test('o token nunca aparece nas mensagens de erro, nem quando a resposta o repete', async () => {
  const { fetch } = fakeFetch({
    'POST /repos/dono/repo/git/trees': () => ({ status: 422, json: { message: `Bad credentials ${TOKEN}` } }),
    'GET /repos/dono/repo/git/ref/heads/main': () => ({ status: 401, json: { message: 'Bad credentials' } }),
  });
  const gh = createGitHub({ owner: 'dono', repo: 'repo', token: TOKEN, fetch });
  const e1 = await gh.openPullRequest({ base: 'main', sha: 'a', treeSha: 't', branch: 'tokens/figma-1', files: { a: 'b' }, message: 'm', title: 't', body: 'b' }).catch((e) => e);
  assert.equal(e1.status, 422);
  assert.ok(!String(e1.message).includes(TOKEN) && String(e1.message).includes('***'), e1.message);
  const e2 = await gh.readBase('main').catch((e) => e);
  assert.match(e2.message, /^GitHub 401 em GET \/repos\/dono\/repo\/git\/ref\/heads\/main: Bad credentials \(token inválido ou expirado\)$/);
  const boom = createGitHub({ owner: 'dono', repo: 'repo', token: TOKEN, fetch: (async () => { throw new Error(`rede caiu ${TOKEN}`); }) as typeof globalThis.fetch });
  const e3 = await boom.readBase('main').catch((e) => e);
  assert.ok(!e3.message.includes(TOKEN), e3.message);
});

test('branch que já existe (422) vira erro, sem tentar outra coisa', async () => {
  const { fetch, calls } = fakeFetch({
    'POST /repos/dono/repo/git/trees': () => ({ status: 201, json: { sha: 'tree2' } }),
    'POST /repos/dono/repo/git/commits': () => ({ status: 201, json: { sha: 'commit2' } }),
    'POST /repos/dono/repo/git/refs': () => ({ status: 422, json: { message: 'Reference already exists' } }),
  });
  const gh = createGitHub({ owner: 'dono', repo: 'repo', token: TOKEN, fetch });
  await assert.rejects(gh.openPullRequest({ base: 'main', sha: 'a', treeSha: 't', branch: 'tokens/figma-1', files: { a: 'b' }, message: 'm', title: 't', body: 'b' }), /422 .*Reference already exists/);
  assert.equal(calls.length, 3);
});

test('corpo da PR cabe no limite do GitHub', () => {
  const body = Array.from({ length: 5000 }, (_, i) => `- \`token.${i}\` adicionado com um valor razoavelmente comprido`).join('\n');
  const out = fitBody(body);
  assert.ok(out.length <= 60000);
  assert.match(out, /relatório cortado: \d+ linhas omitidas/);
  assert.equal(fitBody('curto'), 'curto');
});
