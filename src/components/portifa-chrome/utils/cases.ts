/**
 * ADAPTAÇÃO UaiUI: decisão 5, lista fixa no lugar de astro:content. Título e status vêm de src/content/cases do Portifa (campos title e status) e a ordem de homeCaseOrder em src/utils/cases.ts; case novo publicado = atualizar esta lista (ver docs/CHROME-PORTIFA.md).
 */
export const menuCases: { key: string; label: string; href: string }[] = [
  { key: 'jornada-pagamentos', label: 'Área de pagamentos', href: 'https://lpereira.me/cases/jornada-pagamentos' },
  { key: 'redesign', label: 'Redesign de produto', href: 'https://lpereira.me/cases/redesign' },
];
