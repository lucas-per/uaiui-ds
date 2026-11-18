// O site fica na raiz (sem `base`), então `BASE_URL` é '/' e `withBase` devolve o caminho como está.
// Os helpers continuam para que os links não mudem se um dia o site ganhar um subcaminho.
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const withBase = (p: string) => base + p;
export const stripBase = (p: string) => (p.startsWith(base) ? p.slice(base.length) : p).replace(/\/$/, '') || '/';
