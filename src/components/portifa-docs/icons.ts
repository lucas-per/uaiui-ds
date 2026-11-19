// Ícones de 24 × 24, só traço (porte de src/data/icons.ts do uaiui-ds v0.2.0).
// Cada tom do toast tem um desenho próprio: a cor nunca é o único sinal.
export const icons = {
  chevron: '<path d="M6 9l6 6 6-6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  neutral: '<path d="M4 5h16v11h-9l-5 4v-4H4z"/>',
  success: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  warning: '<path d="M12 4L3 20h18z"/><path d="M12 10v5M12 17.5v.5"/>',
  error: '<path d="M4 4h16v16H4z"/><path d="M9 9l6 6M15 9l-6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
} as const;

/** HTML do ícone, para os exemplos (o mesmo texto vai ao preview e à aba Código). */
export const svg = (name: keyof typeof icons, cls = '') =>
  `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" focusable="false">${icons[name]}</svg>`;
