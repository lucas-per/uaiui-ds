export interface NavItem { title: string; href: string; description: string; status?: 'novo' }
export interface NavGroup { title: string; items: NavItem[] }

export const nav: NavGroup[] = [
  {
    title: 'Começar',
    items: [
      { title: 'Introdução', href: '/docs', description: 'O que é o UaiUI e como a documentação está organizada.' },
      { title: 'Tokens e temas', href: '/docs/tokens', description: 'Como as variables do Figma viram CSS, e como trocar tema e densidade.' },
    ],
  },
  {
    title: 'Componentes',
    items: [
      { title: 'Accordion', href: '/docs/components/accordion', description: 'Esconde conteúdo secundário que a pessoa consulta sob demanda.' },
      { title: 'Button', href: '/docs/components/button', description: 'Dispara uma ação. Três tipos (filled, outlined, ghost) e três estilos.' },
      { title: 'Toast', href: '/docs/components/toast', description: 'Aviso curto depois de uma ação ou de um evento; some sozinho.', status: 'novo' },
    ],
  },
];

export const flat = nav.flatMap((g) => g.items.map((i) => ({ ...i, group: g.title })));
