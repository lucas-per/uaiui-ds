import type { MacroSection } from '../config/navigation';

/**
 * Texto visível e nome acessível do link de uma macro-seção no cabeçalho.
 * O nome acessível é o `accessibleName` da seção, quando ela tem um (vale no
 * desktop e no menu mobile; ele começa pelo texto visível, WCAG 2.5.3). Sem
 * `accessibleName`: no mobile o texto é o `shortLabel` e, como ele abrevia o
 * rótulo, o nome acessível volta a ser o `label` completo; fora isso o link
 * não precisa de `aria-label`.
 */
export function getHeaderLinkText(
  section: Pick<MacroSection, 'label' | 'shortLabel' | 'accessibleName'>,
  compact: boolean,
): { text: string; ariaLabel?: string } {
  const text = compact && section.shortLabel ? section.shortLabel : section.label;
  if (section.accessibleName) {
    return { text, ariaLabel: section.accessibleName };
  }
  if (compact && section.shortLabel && section.shortLabel !== section.label) {
    return { text, ariaLabel: section.label };
  }
  return { text };
}

