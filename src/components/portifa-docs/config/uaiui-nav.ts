/**
 * Páginas da documentação do UaiUI (porte de src/data/nav.ts do uaiui-ds
 * v0.2.0). Alimenta o menu lateral, o botão "Páginas" no celular, a busca, o
 * pager e a seção "Componentes" da Introdução. Os caminhos já são os do site
 * (/projetos/uaiui/...), então o withBase do repositório do DS não veio junto.
 *
 * Só entra aqui página que existe (uaiui-nav.test.ts): um grupo sem itens não
 * aparece. Componentes novos entram no grupo "Componentes" junto com a página
 * deles, em pages/projetos/uaiui/componentes/.
 *
 * ADAPTAÇÃO UaiUI: rotas na raiz do site próprio (decisão 1 da PR do docs):
 * / (Introdução), /tokens/ e /componentes/<nome>/, com barra final (decisão 2).
 * As páginas ficam em src/pages/ e src/pages/componentes/. As descrições são
 * as do antigo src/data/nav.ts deste repositório (texto mais novo); só a do Toast
 * difere da do Portifa.
 */
export interface DocsNavItem {
  title: string;
  href: string;
  description: string;
  status?: 'novo';
}

export interface DocsNavGroup {
  title: string;
  items: DocsNavItem[];
}

export const docsNav: DocsNavGroup[] = [
  {
    title: 'Começar',
    items: [
      { title: 'Introdução', href: '/', description: 'O que é o UaiUI e como a documentação está organizada.' },
      { title: 'Tokens e temas', href: '/tokens/', description: 'Como as variables do Figma viram CSS, e como trocar tema e densidade.' },
    ],
  },
  {
    title: 'Componentes',
    items: [
      { title: 'Accordion', href: '/componentes/accordion/', description: 'Esconde conteúdo secundário que a pessoa consulta sob demanda.' },
      { title: 'Button', href: '/componentes/button/', description: 'Dispara uma ação. Três tipos (filled, outlined, ghost) e três estilos.' },
      { title: 'Toast', href: '/componentes/toast/', description: 'Aviso curto que aparece depois de uma ação ou de um evento: salvou, falhou, nova versão. Não bloqueia a tela.', status: 'novo' },
    ],
  },
];

export const docsNavGroups = docsNav.filter((group) => group.items.length > 0);

export const docsNavFlat = docsNav.flatMap((group) => group.items.map((item) => ({ ...item, group: group.title })));

export const docsComponents = docsNav.find((group) => group.title === 'Componentes')?.items ?? [];

function withTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

/** Página atual (pelo caminho) e as vizinhas, para o pager. */
export function getDocsPage(pathname: string) {
  const index = docsNavFlat.findIndex((item) => item.href === withTrailingSlash(pathname));
  return {
    current: index >= 0 ? docsNavFlat[index] : undefined,
    prev: index > 0 ? docsNavFlat[index - 1] : undefined,
    next: index >= 0 && index < docsNavFlat.length - 1 ? docsNavFlat[index + 1] : undefined,
  };
}
