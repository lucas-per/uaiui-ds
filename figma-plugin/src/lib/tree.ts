// Árvore DTCG: achatar (com $type herdado dos grupos) e remontar a partir da main,
// mantendo a ordem dos filhos e os metadados de arquivo e de grupo ($description, $type…).

type Tree = Record<string, unknown>;
const isObj = (v: unknown): v is Tree => typeof v === 'object' && v !== null && !Array.isArray(v);

export interface FlatToken {
  id: string;
  path: string[];
  type?: string;
  value: unknown;
  description?: string;
  extensions?: unknown;
  node: Tree;
}

export function flatten(tree: unknown): Map<string, FlatToken> {
  const out = new Map<string, FlatToken>();
  const walk = (node: Tree, path: string[], type?: string) => {
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$') || !isObj(child)) continue;
      const t = (child.$type as string | undefined) ?? type;
      const p = [...path, key];
      if ('$value' in child) {
        out.set(p.join('.'), { id: p.join('.'), path: p, type: t, value: child.$value, description: child.$description as string | undefined, extensions: child.$extensions, node: child });
      } else walk(child, p, t);
    }
  };
  if (isObj(tree)) walk(tree, [], tree.$type as string | undefined);
  return out;
}

export interface NewToken {
  id: string;
  path: string[];
  type: string;
  value: unknown;
  description: string;
  /** $extensions para o token se ele for novo (os que existem mantêm as da main). */
  newExtensions?: Record<string, unknown>;
}

const meta = (node: unknown): Tree => (isObj(node) ? Object.fromEntries(Object.entries(node).filter(([k]) => k.startsWith('$'))) : {});

/**
 * Remonta um arquivo. Tokens que já existem ficam na ordem da main; os novos entram no fim do grupo,
 * na ordem do Figma. Tokens da main que não vieram do Figma saem; grupos vazios também.
 */
export function buildTree(main: unknown, tokens: NewToken[]): Tree {
  const mainFlat = flatten(main);
  const byId = new Map(tokens.map((t) => [t.id, t]));
  const order = [...[...mainFlat.keys()].filter((id) => byId.has(id)), ...tokens.filter((t) => !mainFlat.has(t.id)).map((t) => t.id)];
  const root: Tree = meta(main);
  for (const id of order) {
    const t = byId.get(id)!;
    let node = root;
    let mainNode: unknown = main;
    let inherited = root.$type as string | undefined;
    for (const seg of t.path.slice(0, -1)) {
      mainNode = isObj(mainNode) && isObj(mainNode[seg]) && !('$value' in mainNode[seg]) ? mainNode[seg] : undefined;
      if (!isObj(node[seg])) node[seg] = meta(mainNode);
      node = node[seg] as Tree;
      inherited = (node.$type as string | undefined) ?? inherited;
    }
    node[t.path[t.path.length - 1]] = tokenNode(t, mainFlat.get(id)?.node, inherited);
  }
  return root;
}

function tokenNode(t: NewToken, mainNode: Tree | undefined, inherited: string | undefined): Tree {
  const out: Tree = {};
  if (!mainNode) {
    if (t.description) out.$description = t.description;
    if (inherited !== t.type) out.$type = t.type;
    out.$value = t.value;
    if (t.newExtensions) out.$extensions = t.newExtensions;
    return out;
  }
  if (t.description && !('$description' in mainNode)) out.$description = t.description;
  if (!('$type' in mainNode) && inherited !== t.type) out.$type = t.type;
  for (const [k, v] of Object.entries(mainNode)) {
    if (k === '$value') out.$value = t.value;
    else if (k === '$description') { if (t.description) out.$description = t.description; }
    else if (k === '$type') out.$type = t.type;
    else out[k] = v;
  }
  return out;
}
