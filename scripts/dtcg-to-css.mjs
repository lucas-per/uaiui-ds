// Lê tokens/uaiui.resolver.json (Design Tokens 2025.10: formato, cor e resolver) e gera
// src/styles/tokens.css (site de docs, :root) e src/styles/tokens-wrapper.css (consumo por dependência, escopado em .uaiui).
// --check: não escreve nada; valida os tokens, roda o autoteste e falha se os dois CSS do repositório não baterem com o gerado.
import { readFileSync, writeFileSync } from 'node:fs';

// Contexto do resolver → valor do atributo no HTML (data-theme / data-uaiui-theme, data-density / data-uaiui-density).
// O contexto padrão não gera bloco: vale sem atributo e também com o atributo explícito, porque nenhuma regra casa.
const ATTRS = {
  tema: { attr: 'theme', values: { claro: 'light', escuro: 'dark' } },
  densidade: { attr: 'density', values: { comfortable: 'comfortable', standard: 'mobile', compact: 'compact' } },
};

// Medidas saem em rem (px ÷ 16) para acompanharem o tamanho de texto do usuário.
// Forma, traço, sombra, foco e raio continuam em px, com o alias resolvido até o valor final.
// Alvos de toque nunca ficam abaixo de 44 px; quem aponta por alias para um deles herda o max().
const keepPx = (name) => /^(border\/width|shadow\/offset|focus\/ring|radius)\//.test(name) || /\/weight$/.test(name);
const TOUCH = ['button/min-height', 'icon-button/size', 'chip/min-height', 'chip-removable/min-height',
  'chip-removable/remove/size', 'combobox-option/min-height', 'menu-item/min-height'];

// Extensão UaiUI: "string" não é tipo do DTCG; só vale com esta marca em $extensions e com palavra-chave CSS.
const NS = 'me.lpereira.uaiui';
const TYPES = ['color', 'dimension', 'duration', 'fontFamily', 'fontWeight', 'string'];
const WEIGHTS = { thin: 100, hairline: 100, 'extra-light': 200, 'ultra-light': 200, light: 300, normal: 400, regular: 400, book: 400,
  medium: 500, 'semi-bold': 600, 'demi-bold': 600, bold: 700, 'extra-bold': 800, 'ultra-bold': 800, black: 900, heavy: 900, 'extra-black': 950, 'ultra-black': 950 };
const GENERIC_FONTS = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'math', 'emoji', 'fangsong'];

const ALIAS = /^\{([^{}]+)\}$/;
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Valida e monta os dois CSS. `read(arquivo)` devolve o texto de um arquivo de tokens/. */
export function build(read, resolverFile = 'uaiui.resolver.json') {
  const errors = [];
  const fail = (m) => { if (!errors.includes(m)) errors.push(m); };
  const json = (file) => {
    try { return JSON.parse(read(file)); } catch (e) { fail(`${file}: ${e.message}`); return {}; }
  };
  const resolver = json(resolverFile);
  if (resolver.version !== '2025.10') fail(`${resolverFile}: version deveria ser "2025.10"`);

  // Achata uma árvore de tokens em Map("a.b.c" → token). $type de grupo vale para os tokens de dentro.
  const flatten = (tree, file, out, path = [], groupType) => {
    for (const [key, node] of Object.entries(tree)) {
      if (key.startsWith('$')) continue;
      const at = `${file}: ${[...path, key].join('.')}`;
      if (/[{}.]/.test(key)) { fail(`${at}: nome com {, } ou .`); continue; }
      if (!isObj(node)) { fail(`${at}: não é token nem grupo`); continue; }
      const type = node.$type ?? groupType;
      if ('$value' in node) {
        const id = [...path, key].join('.');
        if (out.has(id)) fail(`${at}: token repetido (também em ${out.get(id).file})`);
        out.set(id, { id, path: [...path, key], type, value: node.$value, ext: node.$extensions, file });
        if (Object.keys(node).some((k) => !k.startsWith('$'))) fail(`${at}: token com filhos`);
      } else flatten(node, file, out, [...path, key], type);
    }
    return out;
  };
  const sources = (list, where) => {
    const out = new Map();
    if (!Array.isArray(list)) { fail(`${where}: sources deveria ser uma lista`); return out; }
    for (const s of list) {
      if (typeof s.$ref === 'string' && !s.$ref.startsWith('#')) { const tree = json(s.$ref); flatten(tree, s.$ref, out, [], tree.$type); }
      else if (s.$ref === undefined) flatten(s, `${where} (inline)`, out, [], s.$type);
      else fail(`${where}: $ref "${s.$ref}" não suportado em sources`);
    }
    return out;
  };

  // Camadas na ordem de resolução: sets (um mapa) e modifiers (um mapa por contexto).
  const layers = [];
  for (const ref of resolver.resolutionOrder ?? []) {
    const m = /^#\/(sets|modifiers)\/([^/]+)$/.exec(ref.$ref ?? '');
    if (!m) { fail(`resolutionOrder: $ref "${ref.$ref}" não suportado`); continue; }
    const def = resolver[m[1]]?.[m[2]];
    if (!def) { fail(`resolutionOrder: ${ref.$ref} não existe`); continue; }
    if (m[1] === 'sets') { layers.push({ name: m[2], tokens: sources(def.sources, `sets.${m[2]}`) }); continue; }
    const names = Object.keys(def.contexts ?? {});
    if (names.length < 2) fail(`modifiers.${m[2]}: precisa de pelo menos dois contextos`);
    if (!names.includes(def.default)) fail(`modifiers.${m[2]}: default "${def.default}" não é um dos contextos`);
    const table = ATTRS[m[2]];
    if (!table) fail(`modifiers.${m[2]}: falta na tabela ATTRS do gerador`);
    else if (JSON.stringify(Object.keys(table.values).sort()) !== JSON.stringify([...names].sort())) fail(`modifiers.${m[2]}: contextos (${names}) diferentes da tabela ATTRS (${Object.keys(table.values)})`);
    const contexts = Object.fromEntries(names.map((c) => [c, sources(def.contexts[c], `modifiers.${m[2]}.${c}`)]));
    const [first, ...rest] = names;
    for (const c of rest) {
      const a = [...contexts[first].keys()], b = [...contexts[c].keys()];
      for (const id of a.filter((x) => !contexts[c].has(x))) fail(`modifiers.${m[2]}: ${id} existe em ${first} e falta em ${c}`);
      for (const id of b.filter((x) => !contexts[first].has(x))) fail(`modifiers.${m[2]}: ${id} existe em ${c} e falta em ${first}`);
      for (const id of a.filter((x) => contexts[c].has(x))) {
        if (contexts[first].get(id).type !== contexts[c].get(id).type) fail(`modifiers.${m[2]}: ${id} muda de $type entre ${first} e ${c}`);
      }
    }
    layers.push({ name: m[2], modifier: true, default: def.default, contexts });
  }
  for (const k of Object.keys(ATTRS)) if (!layers.some((l) => l.name === k)) fail(`ATTRS.${k}: modifier não está no resolutionOrder`);

  // Um mapa por combinação de contextos; nenhum token pode aparecer em duas camadas.
  const view = (pick = {}) => {
    const out = new Map();
    for (const l of layers) {
      const tokens = l.modifier ? l.contexts[pick[l.name] ?? l.default] ?? new Map() : l.tokens;
      for (const [id, t] of tokens) {
        if (out.has(id)) fail(`${id}: definido em ${out.get(id).file} e em ${t.file}`);
        out.set(id, t);
      }
    }
    return out;
  };
  const combos = layers.filter((l) => l.modifier).reduce((acc, l) => acc.flatMap((p) => Object.keys(l.contexts).map((c) => ({ ...p, [l.name]: c }))), [{}]);
  const views = combos.map((pick) => ({ pick, tokens: view(pick) }));
  if (errors.length) return { errors };

  // Formato do $value por $type (aliases são checados à parte, em cada combinação de contextos).
  const checkValue = (t) => {
    const at = `${t.file}: ${t.id}`;
    if (!t.type) return fail(`${at}: sem $type (nem no token nem num grupo acima)`);
    if (!TYPES.includes(t.type)) return fail(`${at}: $type "${t.type}" não suportado`);
    if (t.type === 'string' && t.ext?.[NS]?.nonStandardType !== true) fail(`${at}: $type "string" só vale com $extensions["${NS}"].nonStandardType = true`);
    const v = t.value;
    if (typeof v === 'string' && ALIAS.test(v)) return;
    if (typeof v === 'string' && /[{}]/.test(v)) return fail(`${at}: alias malformado "${v}"`);
    const ok = {
      color: () => isObj(v) && v.colorSpace === 'srgb' && Array.isArray(v.components) && v.components.length === 3
        && v.components.every((c) => isNum(c) && c >= 0 && c <= 1) && /^#[0-9a-f]{6}$/i.test(v.hex ?? '')
        && v.components.every((c, i) => Math.round(c * 255) === parseInt(v.hex.slice(1 + i * 2, 3 + i * 2), 16))
        && (v.alpha === undefined || v.alpha === 0 || v.alpha === 1),
      dimension: () => isObj(v) && isNum(v.value) && (v.unit === 'px' || v.unit === 'rem'),
      duration: () => isObj(v) && isNum(v.value) && (v.unit === 'ms' || v.unit === 's'),
      fontFamily: () => (typeof v === 'string' && v) || (Array.isArray(v) && v.length && v.every((f) => typeof f === 'string' && f)),
      fontWeight: () => (isNum(v) && v >= 1 && v <= 1000) || Object.hasOwn(WEIGHTS, v),
      string: () => typeof v === 'string' && /^[a-z-]+$/.test(v),
    }[t.type];
    if (!ok()) fail(`${at}: $value ${JSON.stringify(v)} não é ${t.type} válido${t.type === 'color' ? ' (srgb, hex de 6 dígitos igual aos components, alpha 0 ou 1)' : ''}`);
  };
  const seenTokens = new Set();
  for (const { tokens } of views) for (const t of tokens.values()) if (!seenTokens.has(t)) { seenTokens.add(t); checkValue(t); }

  // Todo alias resolve, sem ciclo, para um token do mesmo $type, em toda combinação de contextos.
  const target = (tokens, t, seen = []) => {
    const m = typeof t.value === 'string' && ALIAS.exec(t.value);
    if (!m) return t;
    if (seen.includes(t.id)) throw new Error(`alias em ciclo: ${[...seen, t.id].join(' → ')}`);
    const next = tokens.get(m[1]);
    if (!next) throw new Error(`alias inexistente: ${[...seen, t.id].join(' → ')} → ${m[1]}`);
    return target(tokens, next, [...seen, t.id]);
  };
  const broken = new Set();
  for (const { pick, tokens } of views) {
    for (const t of tokens.values()) {
      try {
        const final = target(tokens, t);
        const m = typeof t.value === 'string' && ALIAS.exec(t.value);
        if (m && tokens.get(m[1]).type !== t.type) fail(`${t.file}: ${t.id} é ${t.type} e aponta para ${m[1]}, que é ${tokens.get(m[1]).type}`);
        if (final.type !== t.type) fail(`${t.file}: ${t.id} é ${t.type} e resolve para ${final.id}, que é ${final.type}`);
      } catch (e) {
        // Um erro por token: a combinação de modos citada é a primeira em que ele aparece.
        if (!broken.has(t.id)) fail(`${t.file}: ${e.message} (${Object.entries(pick).map((p) => p.join('=')).join(', ')})`);
        broken.add(t.id);
      }
    }
  }
  if (errors.length) return { errors };

  // CSS
  const cssName = (path) => '--' + path.join('-');
  const rem = (px) => (px === 0 ? '0' : `${Number((px / 16).toFixed(4))}rem`);
  const literal = (t) => {
    const v = t.value;
    switch (t.type) {
      case 'color': return v.alpha === 0 ? 'transparent' : v.hex.toLowerCase();
      case 'dimension': return v.unit === 'rem' ? (v.value === 0 ? '0' : `${v.value}rem`) : rem(v.value);
      case 'duration': return `${v.value}${v.unit}`;
      case 'fontFamily': return [v].flat().map((f) => (GENERIC_FONTS.includes(f) ? f : `"${f}"`)).join(', ');
      case 'fontWeight': return String(WEIGHTS[v] ?? v);
      default: return v;
    }
  };
  const val = (tokens, t) => {
    const name = t.path.join('/');
    const m = typeof t.value === 'string' && ALIAS.exec(t.value);
    if (keepPx(name)) {
      const f = target(tokens, t);
      if (f.type !== 'dimension' || f.value.unit !== 'px') throw new Error(`${t.id} deveria resolver para dimension em px`);
      return f.value.value === 0 ? '0' : `${f.value.value}px`;
    }
    if (!m) return TOUCH.includes(name) && t.type === 'dimension' ? `max(44px, ${literal(t)})` : literal(t);
    const out = `var(${cssName(m[1].split('.'))})`;
    const inherits = TOUCH.includes(m[1].replace(/\./g, '/'));
    return TOUCH.includes(name) && !inherits ? `max(44px, ${out})` : out;
  };
  const decls = (tokens, ids) => ids.map((id) => `  ${cssName(tokens.get(id).path)}: ${val(tokens, tokens.get(id))};`);
  const block = (sel, lines) => `${sel} {\n${lines.join('\n')}\n}\n`;

  const base = view();
  const rootLines = decls(base, [...base.keys()]);
  // Para cada contexto que não é o padrão: só os tokens dele, resolvidos com ele no lugar do padrão.
  const variants = (name) => {
    const l = layers.find((x) => x.name === name);
    return Object.keys(l.contexts).filter((c) => c !== l.default)
      .map((c) => ({ value: ATTRS[name].values[c], lines: decls(view({ [name]: c }), [...l.contexts[c].keys()]) }));
  };
  const lightValue = ATTRS.tema.values[layers.find((x) => x.name === 'tema').default];
  const header = '/* Gerado por scripts/dtcg-to-css.mjs a partir de tokens/uaiui.resolver.json. Não edite à mão. */';

  const root = [
    header + '\n',
    block(':root', rootLines),
    ...variants('tema').flatMap(({ value, lines }) => [
      block(`:root[data-theme="${value}"]`, lines),
      `@media (prefers-color-scheme: ${value}) {\n${block(`  :root:not([data-theme="${lightValue}"])`, lines.map((l) => '  ' + l))}}\n`,
    ]),
    ...variants('densidade').map(({ value, lines }) => block(`:root[data-density="${value}"]`, lines)),
  ].join('\n');

  // Versão escopada: tudo no próprio .uaiui (aliases var() resolvem no wrapper e nada vaza).
  // Tema só por data-uaiui-theme (sem atributo: claro, sem prefers-color-scheme).
  const W = '.uaiui';
  const wrapper = [
    header,
    '/* Tokens escopados no wrapper .uaiui. Tema: data-uaiui-theme="dark" (padrão: claro). Densidade: data-uaiui-density="mobile|compact" (padrão: Desktop). */\n',
    block(W, rootLines),
    ...variants('tema').map(({ value, lines }) => block(`${W}[data-uaiui-theme="${value}"]`, lines)),
    ...variants('densidade').map(({ value, lines }) => block(`${W}[data-uaiui-density="${value}"]`, lines)),
  ].join('\n');

  return { errors, root, wrapper, count: base.size };
}

/** Autoteste do validador: cada caso estraga um token e tem de falhar com a mensagem certa. */
function selfTest() {
  const px = (value) => ({ value, unit: 'px' });
  const files = () => ({
    'r.json': { version: '2025.10',
      sets: { base: { sources: [{ $ref: 'base.json' }] } },
      modifiers: {
        tema: { contexts: { claro: [{ $ref: 'claro.json' }], escuro: [{ $ref: 'escuro.json' }] }, default: 'claro' },
        densidade: { contexts: { comfortable: [{ $ref: 'd.json' }], standard: [{ $ref: 'd.json' }], compact: [{ $ref: 'd.json' }] }, default: 'comfortable' },
      },
      resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/modifiers/tema' }, { $ref: '#/modifiers/densidade' }] },
    'base.json': { size: { $type: 'dimension', x4: { $value: px(16) } }, ui: { fg: { $type: 'color', $value: '{cor.a}' } } },
    'claro.json': { $type: 'color', cor: { a: { $value: { colorSpace: 'srgb', components: [1, 1, 1], hex: '#ffffff' } } } },
    'escuro.json': { $type: 'color', cor: { a: { $value: { colorSpace: 'srgb', components: [0, 0, 0], hex: '#000000' } } } },
    'd.json': { $type: 'dimension', button: { 'padding-x': { $value: '{size.x4}' } } },
  });
  const cases = [
    ['válido', () => {}, null],
    ['alias inexistente', (f) => { f['d.json'].button['padding-x'].$value = '{size.x9}'; }, /alias inexistente/],
    ['alias em ciclo', (f) => { f['base.json'].size.x4.$value = '{button.padding-x}'; }, /alias em ciclo/],
    ['sem $type', (f) => { delete f['base.json'].size.$type; }, /sem \$type/],
    ['alias para outro tipo', (f) => { f['base.json'].ui.fg.$value = '{size.x4}'; }, /é color e aponta para size\.x4, que é dimension/],
    ['string sem extensão', (f) => { f['base.json'].t = { $type: 'string', $value: 'uppercase' }; }, /só vale com \$extensions/],
    ['valor fora do tipo', (f) => { f['base.json'].size.x4.$value = 16; }, /não é dimension válido/],
    ['hex diferente dos components', (f) => { f['claro.json'].cor.a.$value.hex = '#fefefe'; }, /não é color válido/],
    ['contexto sem um token', (f) => { f['escuro.json'].cor.b = { $value: { colorSpace: 'srgb', components: [0, 0, 0], hex: '#000000' } }; }, /cor\.b existe em escuro e falta em claro/],
    ['token em duas camadas', (f) => { f['claro.json'].size = { x4: { $type: 'dimension', $value: px(4) } }; }, /size\.x4: definido em/],
  ];
  const failures = [];
  for (const [name, mutate, expected] of cases) {
    const f = files();
    mutate(f);
    const { errors } = build((file) => JSON.stringify(f[file]), 'r.json');
    if (expected ? !errors.some((e) => expected.test(e)) : errors.length) failures.push(`${name}: veio ${JSON.stringify(errors)}`);
  }
  if (failures.length) {
    console.error('autoteste do validador falhou:\n- ' + failures.join('\n- '));
    process.exit(1);
  }
  return cases.length;
}

const tokensDir = new URL('../tokens/', import.meta.url);
const { errors, root, wrapper, count } = build((file) => readFileSync(new URL(file, tokensDir), 'utf8'));
if (errors.length) {
  console.error('tokens inválidos:\n- ' + errors.join('\n- '));
  process.exit(1);
}
const outputs = [['tokens.css', root], ['tokens-wrapper.css', wrapper]].map(([f, css]) => [new URL(`../src/styles/${f}`, import.meta.url), f, css]);
if (process.argv.includes('--check')) {
  const cases = selfTest();
  const stale = outputs.filter(([url, , css]) => { try { return readFileSync(url, 'utf8') !== css; } catch { return true; } }).map(([, f]) => f);
  if (stale.length) {
    console.error(`desatualizado em relação a tokens/: ${stale.join(', ')}. Rode npm run tokens.`);
    process.exit(1);
  }
  console.log(`tokens: ok, ${count} tokens válidos, aliases resolvidos em todos os modos, CSS em dia (autoteste: ${cases} casos)`);
} else {
  for (const [url, f, css] of outputs) {
    writeFileSync(url, css);
    console.log(`${f}:`, css.split('\n').length, 'linhas');
  }
}
