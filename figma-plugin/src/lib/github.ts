// Cliente mínimo da API do GitHub (só api.github.com). Lê a branch base e abre a PR com um commit.
// Só cria refs com o prefixo tokens/figma-: nunca atualiza ref, nunca faz merge, nunca escreve na branch base.

export const BRANCH_PREFIX = 'tokens/figma-';
const API = 'https://api.github.com';

export class GitHubError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
  }
}

export interface GitHubOptions {
  owner: string;
  repo: string;
  token?: string;
  fetch: typeof fetch;
}

/** tokens/figma-AAAAMMDD-HHMM, no horário local. */
export function branchName(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${BRANCH_PREFIX}${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

const NAME = /^[A-Za-z0-9_.-]+$/;
const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/');

export function createGitHub(opts: GitHubOptions) {
  if (!NAME.test(opts.owner) || !NAME.test(opts.repo)) throw new GitHubError('owner ou repositório inválido', 0);
  const repoUrl = `/repos/${opts.owner}/${opts.repo}`;
  // O token nunca entra em mensagem de erro, mesmo que a resposta o repita.
  const scrub = (s: string) => (opts.token ? s.split(opts.token).join('***') : s);

  async function request<T>(method: string, path: string, body?: unknown, accept = 'application/vnd.github+json'): Promise<T> {
    const headers: Record<string, string> = { Accept: accept };
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let res: Response;
    try {
      res = await opts.fetch(API + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (e) {
      throw new GitHubError(scrub(`sem resposta do GitHub em ${method} ${path.split('?')[0]}: ${(e as Error).message}`), 0);
    }
    if (!res.ok) {
      let message = res.statusText;
      try { const j = await res.json() as { message?: string }; if (j?.message) message = j.message; } catch { /* corpo não é JSON */ }
      const hint = res.status === 401 ? ' (token inválido ou expirado)'
        : res.status === 403 || res.status === 429 ? ' (sem permissão ou limite de requisições; um token resolve o limite)'
          : res.status === 404 ? ' (não encontrado ou sem acesso)' : '';
      throw new GitHubError(scrub(`GitHub ${res.status} em ${method} ${path.split('?')[0]}: ${message}${hint}`), res.status);
    }
    return (accept.includes('raw') ? await res.text() : await res.json()) as T;
  }

  return {
    /** SHA do último commit da branch, árvore dele e a lista de arquivos. */
    async readBase(branch: string) {
      const ref = await request<{ object: { sha: string } }>('GET', `${repoUrl}/git/ref/heads/${encodePath(branch)}`);
      const sha = ref.object.sha;
      const commit = await request<{ tree: { sha: string } }>('GET', `${repoUrl}/git/commits/${sha}`);
      const tree = await request<{ tree: Array<{ path: string; type: string }>; truncated: boolean }>('GET', `${repoUrl}/git/trees/${commit.tree.sha}?recursive=1`);
      if (tree.truncated) throw new GitHubError('a árvore do repositório veio cortada pela API; o plugin não lê repositórios desse tamanho', 0);
      return { sha, treeSha: commit.tree.sha, paths: tree.tree.filter((e) => e.type === 'blob').map((e) => e.path) };
    },

    /** Texto de um arquivo naquele commit. */
    readFile(path: string, sha: string) {
      return request<string>('GET', `${repoUrl}/contents/${encodePath(path)}?ref=${sha}`, undefined, 'application/vnd.github.raw+json');
    },

    /** Uma branch nova a partir de `sha`, um commit com `files` e a PR para `base`. */
    async openPullRequest(p: { base: string; sha: string; treeSha: string; branch: string; files: Record<string, string>; message: string; title: string; body: string }) {
      if (!opts.token) throw new GitHubError('falta o token do GitHub para abrir a PR', 0);
      if (!p.branch.startsWith(BRANCH_PREFIX) || p.branch.includes('..') || !/^[A-Za-z0-9/_.-]+$/.test(p.branch)) {
        throw new GitHubError(`o plugin só cria branches ${BRANCH_PREFIX}…, e veio "${p.branch}"`, 0);
      }
      if (p.branch === p.base) throw new GitHubError('a branch nova não pode ser a branch base', 0);
      if (!Object.keys(p.files).length) throw new GitHubError('nenhum arquivo mudou; não há PR para abrir', 0);
      const tree = await request<{ sha: string }>('POST', `${repoUrl}/git/trees`, {
        base_tree: p.treeSha,
        tree: Object.entries(p.files).map(([path, content]) => ({ path, mode: '100644', type: 'blob', content })),
      });
      const commit = await request<{ sha: string }>('POST', `${repoUrl}/git/commits`, { message: p.message, tree: tree.sha, parents: [p.sha] });
      await request('POST', `${repoUrl}/git/refs`, { ref: `refs/heads/${p.branch}`, sha: commit.sha });
      const pr = await request<{ html_url: string; number: number }>('POST', `${repoUrl}/pulls`, { title: p.title, head: p.branch, base: p.base, body: p.body });
      return { url: pr.html_url, number: pr.number, commit: commit.sha };
    },
  };
}

export type GitHub = ReturnType<typeof createGitHub>;
