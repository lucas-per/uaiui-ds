// Valor do Figma → $value DTCG (o alias é tratado no pipeline, que conhece os nomes).

import { isRGBA, type SnapshotValue } from './snapshot.ts';
import type { DtcgType } from './types.ts';

/** 4 casas tiram o ruído de float32 do Figma (0.98823529… → 0.9882). */
export const round4 = (x: number): number => {
  const r = Math.round(x * 1e4) / 1e4;
  return Object.is(r, -0) ? 0 : r;
};

const byte = (c: number) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0');

/** Cor no formato do repositório: colorSpace, components, alpha (só se ≠ 1) e hex, nesta ordem. O hex sai do valor bruto. */
export function colorValue(c: { r: number; g: number; b: number; a: number }) {
  const out: { colorSpace: 'srgb'; components: number[]; alpha?: number; hex?: string } = {
    colorSpace: 'srgb',
    components: [c.r, c.g, c.b].map(round4),
  };
  const alpha = round4(c.a);
  if (alpha !== 1) out.alpha = alpha;
  out.hex = `#${byte(c.r)}${byte(c.g)}${byte(c.b)}`;
  return out;
}

export function convertValue(v: SnapshotValue, type: DtcgType, units: { dimension: string; duration: string }): { value?: unknown; error?: string } {
  switch (type) {
    case 'color':
      return isRGBA(v) ? { value: colorValue(v) } : { error: `esperava cor e veio ${JSON.stringify(v)}` };
    case 'dimension':
    case 'duration':
      return typeof v === 'number' && Number.isFinite(v)
        ? { value: { value: round4(v), unit: units[type] } }
        : { error: `esperava número e veio ${JSON.stringify(v)}` };
    case 'fontWeight':
    case 'number':
      return typeof v === 'number' && Number.isFinite(v) ? { value: round4(v) } : { error: `esperava número e veio ${JSON.stringify(v)}` };
    case 'fontFamily':
    case 'string':
      return typeof v === 'string' ? { value: v } : { error: `esperava texto e veio ${JSON.stringify(v)}` };
  }
}
