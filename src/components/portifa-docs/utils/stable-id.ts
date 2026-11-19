/**
 * Id estável para os exemplos da documentação do UaiUI: o mesmo texto dá sempre
 * o mesmo id, em qualquer build (FNV-1a de 32 bits). O Example.astro do
 * uaiui-ds usava Math.random(), que muda o HTML a cada build.
 */
export function stableId(prefix: string, ...parts: string[]): string {
  let hash = 0x811c9dc5;
  for (const char of parts.join('\u0000')) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${prefix}-${hash.toString(36)}`;
}
