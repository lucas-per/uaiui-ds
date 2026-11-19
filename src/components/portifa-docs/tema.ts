// ADAPTAÇÃO UaiUI: adição deste repositório (D13 em docs/DOCS-PORTIFA.md). Não
// existe no Portifa nem no Figma; docs.ts continua a cópia literal.
//
// Tema dos exemplos. O palco de cada exemplo (.uaiui-docs__stage) é um .uaiui
// aninhado no wrapper: com data-uaiui-theme="dark", os tokens do DS dentro dele
// ficam escuros; sem o atributo, claros. A moldura (o wrapper) nunca recebe o
// tema. Como o .uaiui aninhado redeclara todos os tokens, ele também recebe uma
// cópia do data-uaiui-density do wrapper: sem ela, o palco voltaria para
// Confortável. O script inline do DocsLayout já aplicou a escolha salva antes da
// pintura; aqui ficam a troca, a sincronia dos grupos, a gravação e o anúncio.

// Módulo (export vazio): sem ele, o TypeScript juntaria este arquivo e docs.ts num escopo global só, e
// root e announce colidiriam.
export {};

const root = document.querySelector<HTMLElement>('.uaiui-docs');
const KEY = 'uaiui-theme';

function savedDark() {
  try {
    return localStorage.getItem(KEY) === 'dark';
  } catch {
    return false;
  }
}

function save(dark: boolean) {
  try {
    if (dark) localStorage.setItem(KEY, 'dark');
    else localStorage.removeItem(KEY);
  } catch {
    /* sem armazenamento: a escolha vale só nesta página */
  }
}

/** Mensagem para leitor de tela (o mesmo role="status" do layout que a densidade usa). */
function announce(message: string) {
  const live = document.getElementById('uaiui-docs-live');
  if (!live) return;
  live.textContent = '';
  window.setTimeout(() => (live.textContent = message), 50);
}

if (root) {
  const stages = () => root.querySelectorAll<HTMLElement>('.uaiui-docs__stage');
  const themeInputs = [...root.querySelectorAll<HTMLInputElement>('input[type="radio"][name$="-tema"]')];

  const applyTheme = (dark: boolean) => {
    for (const stage of stages()) {
      if (dark) stage.setAttribute('data-uaiui-theme', 'dark');
      else stage.removeAttribute('data-uaiui-theme');
    }
    for (const input of themeInputs) input.checked = input.value === (dark ? 'dark' : 'light');
  };

  const copyDensity = () => {
    const density = root.getAttribute('data-uaiui-density');
    for (const stage of stages()) {
      if (density) stage.setAttribute('data-uaiui-density', density);
      else stage.removeAttribute('data-uaiui-density');
    }
  };

  // Estado inicial igual ao do script inline (idempotente). Também desfaz um
  // rádio que o navegador tenha restaurado ao voltar pelo histórico.
  applyTheme(savedDark());
  copyDensity();

  themeInputs.forEach((input) => {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      const dark = input.value === 'dark';
      applyTheme(dark);
      save(dark);
      announce(`Tema dos exemplos: ${input.closest('label')?.textContent?.trim() ?? input.value}.`);
    });
  });

  // A densidade é trocada por docs.ts (cópia literal) no wrapper; o palco acompanha.
  new MutationObserver(copyDensity).observe(root, { attributes: true, attributeFilter: ['data-uaiui-density'] });
}
