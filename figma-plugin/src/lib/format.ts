// Formatação dos arquivos de tokens: JSON.stringify com 2 espaços, exceto $value objeto ou lista,
// que fica numa linha só ({ "value": 0, "unit": "px" }), e \n no fim.

const inline = (v: unknown): string => {
  if (Array.isArray(v)) return `[${v.map(inline).join(', ')}]`;
  if (v !== null && typeof v === 'object') {
    const entries = Object.entries(v).filter(([, x]) => x !== undefined);
    return entries.length ? `{ ${entries.map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(', ')} }` : '{}';
  }
  return JSON.stringify(v);
};

const block = (v: unknown, indent: string): string => {
  const inner = indent + '  ';
  if (Array.isArray(v)) {
    return v.length ? `[\n${v.map((x) => inner + block(x, inner)).join(',\n')}\n${indent}]` : '[]';
  }
  if (v !== null && typeof v === 'object') {
    const entries = Object.entries(v).filter(([, x]) => x !== undefined);
    if (!entries.length) return '{}';
    const lines = entries.map(([k, x]) => {
      const text = k === '$value' && x !== null && typeof x === 'object' ? inline(x) : block(x, inner);
      return `${inner}${JSON.stringify(k)}: ${text}`;
    });
    return `{\n${lines.join(',\n')}\n${indent}}`;
  }
  return JSON.stringify(v);
};

export function serialize(tree: unknown): string {
  return block(tree, '') + '\n';
}
