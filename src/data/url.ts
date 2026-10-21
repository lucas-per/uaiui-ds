// Com `base: '/uaiui'`, todo link interno precisa do prefixo. Os dados guardam caminhos sem ele.
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const withBase = (p: string) => base + p;
export const stripBase = (p: string) => (p.startsWith(base) ? p.slice(base.length) : p).replace(/\/$/, '') || '/';
