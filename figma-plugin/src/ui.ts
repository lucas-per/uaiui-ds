// Interface: lê o snapshot (thread do Figma) e a branch base (GitHub), mostra erros, avisos e diff,
// e só então deixa abrir a PR ou baixar o .zip. O token só vive em memória aqui e no clientStorage.

import { strToU8, zipSync } from 'fflate';
import * as generator from 'tokens-generator';
import { show } from './lib/diff.ts';
import { branchName, createGitHub } from './lib/github.ts';
import { readMain, type MainState } from './lib/main.ts';
import { runExport, type ExportResult } from './lib/pipeline.ts';
import { byToken, counts, prBody } from './lib/report.ts';
import type { Snapshot } from './lib/snapshot.ts';
import { SOURCES } from './lib/types.ts';
import { DEFAULT_SETTINGS, type Settings, type ToCode, type ToUi } from './messages.ts';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => $<HTMLInputElement>(id);
const post = (msg: ToCode) => parent.postMessage({ pluginMessage: msg }, '*');

let token = '';
let snapshot: Snapshot | null = null;
let main: MainState | null = null;
/** Repositório e config da última leitura: a PR vai para eles, mesmo que os campos mudem depois. */
let readWith: Settings | null = null;
let result: ExportResult | null = null;
let choices: Record<string, string> = {};
let busy = false;

// Pedido → resposta com a thread do Figma.
let nextId = 1;
const pending = new Map<number, { resolve: (s: Snapshot) => void; reject: (e: Error) => void }>();
function requestSnapshot(): Promise<Snapshot> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    post({ type: 'snapshot', id });
  });
}

window.onmessage = (event: MessageEvent) => {
  const msg = event.data?.pluginMessage as ToUi | undefined;
  if (!msg) return;
  if (msg.type === 'init') {
    const s: Settings = { ...DEFAULT_SETTINGS, ...(msg.settings ?? {}) };
    for (const k of Object.keys(DEFAULT_SETTINGS) as Array<keyof Settings>) input(k).value = s[k];
    token = msg.token;
    $('file').textContent = `Arquivo aberto: ${msg.fileName}`;
    $<HTMLDetailsElement>('settings').open = !s.owner || !s.repo;
    renderToken();
  } else if (msg.type === 'snapshot') {
    pending.get(msg.id)?.resolve(msg.snapshot);
    pending.delete(msg.id);
  } else if (msg.type === 'error') {
    if (msg.id !== undefined && pending.has(msg.id)) { pending.get(msg.id)!.reject(new Error(msg.message)); pending.delete(msg.id); }
    else setStatus(`Erro: ${msg.message}`);
  }
};

function settings(): Settings {
  return {
    owner: input('owner').value.trim(),
    repo: input('repo').value.trim(),
    base: input('base').value.trim() || DEFAULT_SETTINGS.base,
    configPath: input('configPath').value.trim().replace(/^\/+/, '') || DEFAULT_SETTINGS.configPath,
  };
}

function renderToken() {
  $('tokenStatus').textContent = token ? 'Token salvo neste computador.' : 'Nenhum token salvo.';
  input('token').placeholder = token ? '•••••••• (digite outro para trocar)' : 'github_pat_…';
  $<HTMLButtonElement>('clearToken').disabled = !token;
  updateButtons();
}

$('saveToken').onclick = () => {
  const value = input('token').value.trim();
  if (!value) return;
  token = value;
  input('token').value = '';
  post({ type: 'save-token', token: value });
  renderToken();
};
$('clearToken').onclick = () => {
  token = '';
  post({ type: 'clear-token' });
  renderToken();
};

const setStatus = (text: string) => { $('status').textContent = text; };
const stamp = () => branchName().slice('tokens/figma-'.length);

function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$('snapshot').onclick = async () => {
  try {
    setStatus('Lendo as variables…');
    const s = await requestSnapshot();
    download(`snapshot-${stamp()}.json`, JSON.stringify(s, null, 2) + '\n', 'application/json');
    setStatus(`Snapshot baixado: ${s.collections.length} coleções, ${s.variables.length} variables.`);
  } catch (e) {
    setStatus(`Erro ao ler as variables: ${(e as Error).message}`);
  }
};

$('read').onclick = async () => {
  const s = settings();
  post({ type: 'save-settings', settings: s });
  if (!s.owner || !s.repo) { $<HTMLDetailsElement>('settings').open = true; setStatus('Preencha owner e repositório.'); return; }
  busy = true;
  updateButtons();
  result = null;
  main = null;
  readWith = null;
  choices = {};
  render();
  try {
    setStatus('Lendo as variables…');
    snapshot = await requestSnapshot();
    setStatus(`Lendo ${s.owner}/${s.repo}@${s.base}…`);
    const gh = createGitHub({ owner: s.owner, repo: s.repo, token: token || undefined, fetch: window.fetch.bind(window) });
    const read = await readMain(gh, s.base, s.configPath);
    if (!read.state) { showErrors(read.errors); setStatus('Não deu para ler a config.'); return; }
    main = read.state;
    readWith = s;
    rerun();
    setStatus(`Lido: ${snapshot.variables.length} variables do Figma e ${s.base} em ${main.sha.slice(0, 7)}.`);
  } catch (e) {
    showErrors([(e as Error).message]);
    setStatus('Falhou.');
  } finally {
    busy = false;
    updateButtons();
  }
};

function rerun() {
  if (!snapshot || !main) return;
  result = runExport({
    snapshot, config: main.config, configPath: readWith!.configPath, main: main.files, generator,
    typeChoices: choices, base: { branch: main.branch, sha: main.sha },
  });
  render();
}

function list(id: string, items: string[]) {
  const box = $(id);
  const ul = box.querySelector('ul')!;
  ul.replaceChildren(...items.map((t) => Object.assign(document.createElement('li'), { textContent: t })));
  box.hidden = !items.length;
}
const showErrors = (errors: string[]) => list('errors', errors);

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...children: Array<Node | string>) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function render() {
  const r = result;
  list('errors', r?.errors ?? []);
  list('warnings', r?.warnings ?? []);

  // Tipos manuais
  const types = $('types');
  const tbody = types.querySelector('tbody')!;
  tbody.replaceChildren(...(r?.unresolved ?? []).map((u) => {
    const select = el('select');
    select.append(el('option', { value: '', textContent: 'escolher…' }));
    for (const t of u.allowed) select.append(el('option', { value: t, textContent: t === u.suggestion ? `${t} (sugerido)` : t }));
    select.value = choices[u.name] ?? '';
    select.disabled = !u.allowed.length;
    select.onchange = () => { choices[u.name] = select.value; rerun(); };
    return el('tr', {}, el('td', {}, el('code', { textContent: u.name }), el('div', { className: 'hint', textContent: u.collection })),
      el('td', { textContent: `${u.resolvedType} · ${u.scopes.join(', ') || 'sem escopo'}` }), el('td', {}, select));
  }));
  // Escolhas já feitas continuam editáveis mesmo depois de resolvidas.
  for (const [name, t] of Object.entries(choices)) {
    if (!t || r?.unresolved.some((u) => u.name === name)) continue;
    const select = el('select');
    for (const opt of ['', 'color', 'dimension', 'duration', 'fontFamily', 'fontWeight', 'number', 'string']) select.append(el('option', { value: opt, textContent: opt || 'escolher…' }));
    select.value = t;
    select.onchange = () => { choices[name] = select.value; rerun(); };
    tbody.append(el('tr', {}, el('td', {}, el('code', { textContent: name })), el('td', { className: 'hint', textContent: 'escolhido' }), el('td', {}, select)));
  }
  types.hidden = !tbody.children.length;

  // Resumo
  const summary = $('summary');
  summary.replaceChildren();
  summary.hidden = !r;
  if (r) {
    const n = counts(r.changes);
    summary.append(
      el('h2', { textContent: 'Resumo' }),
      el('p', {}, `${r.variables} variables · `, el('span', { className: 'tag added', textContent: `+${n.added}` }),
        el('span', { className: 'tag changed', textContent: `~${n.changed}` }), el('span', { className: 'tag removed', textContent: `−${n.removed}` }),
        ` tokens · tipo por ${SOURCES.map((s) => `${s} ${r.sources[s]}`).join(', ')}`),
      el('p', { className: 'hint', textContent: r.changedFiles.length ? `Arquivos que mudam: ${r.changedFiles.join(', ')}` : 'Nenhum arquivo muda.' }),
    );
  }

  // Diff por token e por modo
  const diff = $('diff');
  diff.replaceChildren();
  const groups = r ? [...byToken(r.changes).values()] : [];
  diff.hidden = !groups.length;
  if (groups.length) {
    const order = { changed: 0, removed: 1, added: 2 };
    groups.sort((a, b) => order[a[0].kind] - order[b[0].kind]);
    const label = { added: 'novo', changed: 'alterado', removed: 'removido' };
    const rows = groups.map((cs) => el('tr', {},
      el('td', {}, el('span', { className: `tag ${cs[0].kind}`, textContent: label[cs[0].kind] })),
      el('td', {}, el('code', { textContent: cs[0].id })),
      el('td', {}, ...cs.map((c) => el('div', {},
        c.mode ? el('span', { className: 'hint', textContent: `${c.mode}: ` }) : '',
        el('code', { textContent: c.kind === 'added' ? show(c.after) : c.kind === 'removed' ? show(c.before) : (c.fields ?? []).map((f) => f === 'value' ? `${show(c.before)} → ${show(c.after)}` : f === 'type' ? `$type ${c.before?.type} → ${c.after?.type}` : f === 'description' ? `$description: ${c.after?.description ?? '—'}` : '$extensions').join('; ') }),
      )))));
    diff.append(el('h2', { textContent: 'Diff contra a branch base' }), el('table', {}, el('tbody', {}, ...rows)));
  }
  updateButtons();
}

function updateButtons() {
  const r = result;
  const ok = !!r && !busy && !r.errors.length;
  const changed = !!r && r.changedFiles.length > 0;
  const body = r && ok && changed ? prBody(r.reportInput) : null;
  $<HTMLButtonElement>('pr').disabled = !(ok && changed && token && body?.ok);
  $<HTMLButtonElement>('zip').disabled = !ok;
  $<HTMLButtonElement>('read').disabled = busy;
  $('footerHint').textContent = !r ? 'Leia o Figma e a branch base para ver o diff.'
    : r.errors.length ? `${r.errors.length} erro(s): os botões ficam desativados.`
      : !changed ? 'Sem mudança em relação à branch base.'
        : body && !body.ok ? body.error
          : !token ? 'Salve um token para abrir a PR.' : `${r.changedFiles.length} arquivo(s) no commit.`;
}

$('zip').onclick = () => {
  if (!result || result.errors.length) return;
  const files = Object.fromEntries(Object.entries(result.zipFiles()).map(([p, text]) => [p, strToU8(text)]));
  download(`tokens-${stamp()}.zip`, zipSync(files, { level: 6 }) as Uint8Array<ArrayBuffer>, 'application/zip');
  setStatus(`.zip baixado com ${Object.keys(files).length} arquivos.`);
};

$('pr').onclick = async () => {
  const r = result;
  const s = readWith;
  if (!r || r.errors.length || !main || !s || !token || !snapshot) return;
  const typed = settings();
  if (typed.owner !== s.owner || typed.repo !== s.repo || typed.base !== s.base || typed.configPath !== s.configPath) {
    setStatus(`Os campos mudaram desde a leitura (${s.owner}/${s.repo}@${s.base}). Leia de novo antes de abrir a PR.`);
    return;
  }
  const body = prBody(r.reportInput);
  if (!body.ok) {
    setStatus(body.error);
    return;
  }
  busy = true;
  updateButtons();
  try {
    const gh = createGitHub({ owner: s.owner, repo: s.repo, token, fetch: window.fetch.bind(window) });
    setStatus('Conferindo se a branch base não mudou…');
    const now = await gh.readBase(main.branch);
    if (now.sha !== main.sha) throw new Error(`${main.branch} mudou desde a leitura (${main.sha.slice(0, 7)} → ${now.sha.slice(0, 7)}). Leia de novo antes de abrir a PR.`);
    const branch = branchName();
    const n = counts(r.changes);
    const summary = `Adicionados: ${n.added} · Alterados: ${n.changed} · Removidos: ${n.removed}`;
    setStatus(`Criando ${branch} e a PR…`);
    const pr = await gh.openPullRequest({
      base: main.branch, sha: main.sha, treeSha: main.treeSha, branch,
      files: Object.fromEntries(r.changedFiles.map((p) => [p, r.files.get(p)!])),
      message: `Tokens exportados do Figma\n\nArquivo: ${snapshot.fileName}\n${summary}`,
      title: `Tokens do Figma (${branch.slice('tokens/figma-'.length)})`,
      body: body.body,
    });
    setStatus('');
    $('status').append('PR aberta: ', el('a', { href: pr.url, textContent: pr.url, onclick: (e: Event) => { e.preventDefault(); post({ type: 'open', url: pr.url }); } }));
    post({ type: 'notify', text: `PR #${pr.number} aberta.` });
  } catch (e) {
    setStatus(`Erro ao abrir a PR: ${(e as Error).message}`);
    post({ type: 'notify', text: 'A PR não foi aberta.', error: true });
  } finally {
    busy = false;
    updateButtons();
  }
};

post({ type: 'init' });
