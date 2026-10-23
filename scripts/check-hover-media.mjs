// Falha se algum seletor com :hover (inclusive dentro de :is(), :where() ou :not()) estiver fora de @media (hover: hover).
// No toque o navegador mantém o :hover no último elemento tocado, então o hover só vale em aparelhos com mouse.
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Formato: arquivo::seletor. A lista só pode encolher: uma entrada que deixa de violar também falha.
const KNOWN_EXCEPTIONS = [];

const srcDir = fileURLToPath(new URL('../src/', import.meta.url));

/** Comentários viram espaços; `masked` também esvazia as strings (chaves, vírgulas e ":hover" dentro de aspas não contam). Mesmo tamanho. */
function clean(css) {
  const orig = css.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));
  const masked = orig.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, (m) => m[0] + '_'.repeat(m.length - 2) + m[0]);
  return { orig, masked };
}

/** Separa por vírgula só fora de parênteses e colchetes. */
function splitTop(text) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') depth -= 1;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  return parts.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

const HOVER_COND = /\(\s*hover\s*:\s*hover\s*\)/;

/** Uma @media protege se toda alternativa (separada por vírgula) exige (hover: hover), sem not nem or. */
function guardsHover(prelude) {
  const m = /^@media\b([\s\S]*)$/i.exec(prelude);
  if (!m) return false;
  const alternatives = splitTop(m[1]);
  return alternatives.length > 0 && alternatives.every((alt) => HOVER_COND.test(alt) && !/\bnot\b/i.test(alt) && !/\bor\b/i.test(alt));
}

/** Seletores com :hover sem uma @media que proteja entre os ancestrais (inclui regras aninhadas). */
export function unprotectedHoverSelectors(css) {
  const { orig, masked } = clean(css);
  const out = [];
  const scan = (from, to, guarded) => {
    let i = from;
    while (i < to) {
      const open = masked.indexOf('{', i);
      if (open === -1 || open >= to) break;
      const start = Math.max(i, masked.lastIndexOf(';', open) + 1, masked.lastIndexOf('}', open) + 1);
      const prelude = orig.slice(start, open).trim();
      const maskedPrelude = masked.slice(start, open).trim();
      let depth = 1;
      let j = open + 1;
      while (j < to && depth > 0) {
        if (masked[j] === '{') depth += 1;
        else if (masked[j] === '}') depth -= 1;
        j += 1;
      }
      if (prelude.startsWith('@')) {
        scan(open + 1, j - 1, guarded || guardsHover(maskedPrelude));
      } else {
        if (!guarded) {
          const originals = splitTop(prelude);
          splitTop(maskedPrelude).forEach((sel, k) => { if (/:hover(?![\w-])/i.test(sel)) out.push(originals[k]); });
        }
        scan(open + 1, j - 1, guarded); // CSS aninhado
      }
      i = j;
    }
  };
  scan(0, masked.length, false);
  return out;
}

function selfTest() {
  const bad = (name, css, expected) => ({ name, css, expected });
  const cases = [
    // negativos: têm de ser acusados
    bad('hover solto', '.a:hover { color: red; }', ['.a:hover']),
    bad('lista com vírgula', '.b, .c:hover { color: red; }', ['.c:hover']),
    bad('hover dentro de :not', '.d:not(:hover) { color: red; }', ['.d:not(:hover)']),
    bad('hover dentro de :is e :where', ':is(.e, .f:hover) { color: red; } :where(a:hover) { color: red; }', [':is(.e, .f:hover)', ':where(a:hover)']),
    bad('media errada', '@media (min-width: 768px) { .g:hover { color: red; } }', ['.g:hover']),
    bad('forced-colors sem hover', '@media (forced-colors: active) { .h:hover { color: red; } }', ['.h:hover']),
    bad('hover: none', '@media (hover: none) { .i:hover { color: red; } }', ['.i:hover']),
    bad('any-hover não vale', '@media (any-hover: hover) { .j:hover { color: red; } }', ['.j:hover']),
    bad('not (hover: hover)', '@media not all and (hover: hover) { .k:hover { color: red; } }', ['.k:hover']),
    bad('or', '@media (hover: hover) or (min-width: 1px) { .l:hover { color: red; } }', ['.l:hover']),
    bad('alternativa por vírgula sem hover', '@media (hover: hover), (min-width: 1px) { .m:hover { color: red; } }', ['.m:hover']),
    bad('regra depois da media fechada', '@media (hover: hover) { .n:hover { color: red; } } .o:hover { color: red; }', ['.o:hover']),
    bad('hover aninhado em regra, fora da media', '.p { &:hover { color: red; } }', ['&:hover']),
    bad('hover em @supports sem media', '@supports (display: grid) { .q:hover { color: red; } }', ['.q:hover']),
    // positivos: não podem ser acusados
    bad('media simples', '@media (hover: hover) { .a:hover { color: red; } }', []),
    bad('sem espaço', '@media (hover:hover) { .a:hover { color: red; } }', []),
    bad('media aninhada', '@media (min-width: 768px) { @media (hover: hover) { .b:hover { color: red; } } }', []),
    bad('media dentro da media', '@media (forced-colors: active) { @media (hover: hover) { .c:not([x]):hover { color: red; } } }', []),
    bad('combinada com and', '@media (forced-colors: active) and (hover: hover) { .d:not(:disabled):hover { color: red; } }', []),
    bad('and em qualquer ordem', '@media (hover: hover) and (forced-colors: active) { .e:hover { color: red; } }', []),
    bad('lista de seletores na media', '@media (hover: hover) { .f:hover, .g:hover { color: red; } }', []),
    bad(':not(:hover) dentro da media', '@media (hover: hover) { .h:not(:hover) { color: red; } }', []),
    bad('hover aninhado em regra, dentro da media', '@media (hover: hover) { .p { &:hover { color: red; } } }', []),
    bad('só palavra hover e comentário', '.a-hover, .hovered, .hover { color: red; } /* .z:hover {} */ [title=":hover"] { color: red; }', []),
  ];
  const failures = [];
  for (const c of cases) {
    const got = unprotectedHoverSelectors(c.css);
    if (JSON.stringify(got) !== JSON.stringify(c.expected)) failures.push(`${c.name}: esperado ${JSON.stringify(c.expected)}, veio ${JSON.stringify(got)}`);
  }
  if (failures.length) {
    console.error('autoteste do parser falhou:\n- ' + failures.join('\n- '));
    process.exit(1);
  }
  return cases.length;
}

function collect(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) collect(path, files);
    else if (/\.(css|astro)$/.test(entry.name)) files.push(path);
  }
  return files.sort();
}

/** O arquivo inteiro num .css; só os blocos <style> num .astro. */
function cssOf(file) {
  const text = readFileSync(file, 'utf8');
  return file.endsWith('.astro') ? [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n') : text;
}

const cases = selfTest();
const files = collect(srcDir);
const violations = files.flatMap((file) => unprotectedHoverSelectors(cssOf(file)).map((sel) => `${relative(srcDir, file)}::${sel}`));
const unexpected = violations.filter((v) => !KNOWN_EXCEPTIONS.includes(v));
const stale = KNOWN_EXCEPTIONS.filter((e) => !violations.includes(e));
if (unexpected.length || stale.length) {
  console.error('hover fora de @media (hover: hover):');
  for (const v of unexpected) console.error(`- ${v}`);
  for (const v of stale) console.error(`- exceção obsoleta (remova da lista): ${v}`);
  process.exit(1);
}
console.log(`hover-media: ok, nenhum :hover fora de @media (hover: hover) em ${files.length} arquivos (autoteste: ${cases} casos)`);
