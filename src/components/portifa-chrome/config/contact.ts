export type ContactLink = {
  key: 'email' | 'linkedin' | 'github' | 'cv';
  href: string;
  /** Texto visível nos rodapés. */
  label: string;
  /**
   * Nome acessível. Obrigatório quando o link aparece só com ícone (mini-rodapé
   * do menu mobile); nos rodapés, só entra quando o texto visível não basta.
   */
  ariaLabel: string;
  /** Usar o nome acessível também nos rodapés, onde o texto é visível. */
  ariaLabelWithText?: boolean;
  /** Classe de clique (camada do Figma). */
  className: string;
  external?: boolean;
  download?: boolean;
  /** Ícone nos rodapés (LinkedIn e GitHub com a seta de "abre fora"). */
  footerIcon: 'mail' | 'external' | 'download';
  /** Ícone no mini-rodapé do menu mobile (marcas do LinkedIn e do GitHub). O CV não entra lá. */
  menuIcon?: 'mail' | 'linkedin' | 'github';
};

/**
 * Fonte única dos contatos: rodapé desktop, rodapé mobile e mini-rodapé do
 * menu mobile. Ordem do Figma nos rodapés: E-mail → LinkedIn → GitHub → Baixar CV;
 * o mini-rodapé do menu tem a própria (`menuFooterLinks`).
 */
export const contactLinks: ContactLink[] = [
  {
    key: 'email',
    href: 'mailto:oi@lpereira.me',
    label: 'oi@lpereira.me',
    ariaLabel: 'Enviar e-mail para oi@lpereira.me',
    className: 'clickable-mailto-footer',
    footerIcon: 'mail',
    menuIcon: 'mail',
  },
  {
    key: 'linkedin',
    href: 'https://www.linkedin.com/in/lucasvalimpereira/',
    label: 'LinkedIn',
    ariaLabel: 'Abrir perfil do LinkedIn em nova aba',
    className: 'clickable-link-external-linkedin',
    external: true,
    footerIcon: 'external',
    menuIcon: 'linkedin',
  },
  {
    key: 'github',
    href: 'https://github.com/lucas-per',
    label: 'GitHub',
    ariaLabel: 'Abrir perfil do GitHub em nova aba',
    ariaLabelWithText: true,
    className: 'clickable-link-external-github',
    external: true,
    footerIcon: 'external',
    menuIcon: 'github',
  },
  {
    key: 'cv',
    // ADAPTAÇÃO UaiUI: A5, o atributo download não funciona entre origens. Vira "Ver CV": PDF de lpereira.me em nova aba, sem download. O aria-label (decisão 6) começa pelo texto visível (WCAG 2.5.3) e avisa da nova aba.
    href: 'https://lpereira.me/cv-lucas-pereira.pdf',
    label: 'Ver CV',
    ariaLabel: 'Ver CV, PDF em nova aba',
    ariaLabelWithText: true,
    className: 'clickable-download-cv',
    external: true,
    footerIcon: 'external',
  },
];

/** Titular e ano do ©, nos rodapés; o mini-rodapé do menu usa só o ano (o ano é o do build). */
export const copyrightHolder = 'Lucas Pereira';
export const copyrightYear = new Date().getFullYear();

export function getContact(key: ContactLink['key']): ContactLink {
  return contactLinks.find((link) => link.key === key)!;
}

export type MenuFooterLink = ContactLink & { menuIcon: NonNullable<ContactLink['menuIcon']> };

/** Mini-rodapé do menu mobile (Figma 695:953): GitHub → LinkedIn → E-mail, sem o CV. */
export const menuFooterLinks: MenuFooterLink[] = (['github', 'linkedin', 'email'] as const).map((key) => {
  const link = getContact(key);
  return { ...link, menuIcon: link.menuIcon! };
});

