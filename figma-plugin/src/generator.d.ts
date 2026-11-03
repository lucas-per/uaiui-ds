// O gerador do repositório entra no bundle pelo build (alias "tokens-generator" → --generator=…).
// Contrato: validate(read, resolverFile) → { errors, model? } e toCss(model) → { [saída]: texto }.
declare module 'tokens-generator' {
  export function validate(read: (file: string) => string, resolverFile: string): { errors: string[]; model?: unknown };
  export function toCss(model: unknown): Record<string, unknown>;
}
