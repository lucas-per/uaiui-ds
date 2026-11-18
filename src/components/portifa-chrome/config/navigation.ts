/**
 * ADAPTAÇÃO UaiUI: só as seções do cabeçalho. Saem portfolio, artigos, projetos e fotos (desabilitadas no Portifa, sem uso no docs) e getEnabledSections e getAriaCurrent (decisão 2: o aria-current do item "UaiUI DS" é fixo).
 */
export type MacroSection = {
  key: string;
  label: string;
  path: string;
  enabled: boolean;
  /**
   * Entra como link no cabeçalho do site: na barra do desktop e no menu do
   * mobile (a barra do mobile não tem links de seção). A home já é o logo.
   */
  inHeader?: boolean;
  /** Rótulo curto, usado no menu mobile; o nome acessível segue `label`. */
  shortLabel?: string;
  /**
   * Nome acessível do link do cabeçalho (desktop e menu mobile), quando ele
   * expande o texto visível. Precisa começar pelo texto visível, sem diferença
   * de caixa (WCAG 2.5.3).
   */
  accessibleName?: string;
};

/* A ordem do array é a do cabeçalho do desktop e do menu mobile: UaiUI DS
   primeiro, Paletaria depois (Figma 98:398, 695:953 e 676:514). */
export const macroSections: MacroSection[] = [
  {
    key: 'uaiui',
    label: 'UaiUI DS',
    shortLabel: 'UaiUI DS',
    accessibleName: 'UaiUI DS, design system',
    // ADAPTAÇÃO UaiUI: decisão 2, aponta para a raiz do docs (o único href relativo do chrome).
    path: '/',
    enabled: true,
    inHeader: true,
  },
  {
    key: 'color-decomposer',
    label: 'Paletaria',
    shortLabel: 'Paletaria',
    // ADAPTAÇÃO UaiUI: A4, URL absoluta de lpereira.me.
    path: 'https://lpereira.me/projetos/paletaria/',
    enabled: true,
    inHeader: true,
  },
];

export function getHeaderSections(): MacroSection[] {
  return macroSections.filter((section) => section.enabled && section.inHeader);
}

/**
 * ADAPTAÇÃO UaiUI: decisão 2, aria-current fixo. "UaiUI DS" é "page" na home do docs e "true" nas demais páginas; os links de lpereira.me nunca são a página atual.
 */
export function getHeaderCurrent(pathname: string, section: MacroSection): 'page' | 'true' | undefined {
  if (section.key !== 'uaiui') return undefined;
  return pathname.replace(/\/$/, '') === '' ? 'page' : 'true';
}
