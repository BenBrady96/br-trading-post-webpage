export function parseHex(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const channel = (v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

export function contrast(a, b) {
  const [la, lb] = [luminance(parseHex(a)), luminance(parseHex(b))].sort((x, y) => y - x);
  return (la + 0.05) / (lb + 0.05);
}

export function tokenBlocks(css) {
  const block = (pattern) => {
    const m = pattern.exec(css);
    if (!m) return null;
    const tokens = {};
    for (const [, name, value] of m[1].matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)) tokens[name] = value.toUpperCase();
    return tokens;
  };
  return {
    light: block(/^:root \{([\s\S]*?)\n\}/m),
    darkAuto: block(/:root:not\(\[data-theme="light"\]\) \{([\s\S]*?)\n {2}\}/),
    dark: block(/^:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/m),
  };
}

export const PAIRS = [
  ['text', 'bg'], ['text-2', 'bg'], ['text-3', 'bg'],
  ['text', 'bg-soft'], ['text-2', 'bg-soft'], ['text-3', 'bg-soft'],
  ['text', 'bg-raised'], ['text-2', 'bg-raised'], ['text-3', 'bg-raised'],
  ['text-2', 'surface-2'], ['text', 'surface-2'],
  ['brand', 'bg'], ['brand', 'bg-soft'], ['brand', 'bg-raised'],
  ['on-brand', 'brand'], ['on-brand', 'brand-hover'],
  ['good', 'bg'], ['good', 'bg-raised'],
  ['accent-ink', 'accent-soft'], ['accent-ink', 'bg'],
  ['sky-ink', 'sky-soft'],
  ['sold-ink', 'sold-bg'],
  ['bg', 'text'],
];

export function checkContrast(tokens, { minimum = 4.5 } = {}) {
  const failures = [];
  for (const [fg, bg] of PAIRS) {
    const a = tokens[fg];
    const b = tokens[bg];
    if (!a || !b) {
      failures.push(`${fg} on ${bg}: token missing`);
      continue;
    }
    const ratio = contrast(a, b);
    if (ratio < minimum) failures.push(`${fg} (${a}) on ${bg} (${b}): ${ratio.toFixed(2)}:1, needs ${minimum}:1`);
  }
  return failures;
}
