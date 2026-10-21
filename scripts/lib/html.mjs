export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function fill(template, values) {
  return template
    .replace(/\{\{\{(\w+)\}\}\}/g, (_, key) => {
      if (!(key in values)) throw new Error(`Template value missing: ${key}`);
      return values[key] ?? '';
    })
    .replace(/\{\{(\w+)\}\}/g, (_, key) => {
      if (!(key in values)) throw new Error(`Template value missing: ${key}`);
      return escapeHtml(values[key]);
    });
}

const isRelative = (url) => !/^(?:[a-z][a-z0-9+.-]*:|#|\/|\?)/i.test(url);

const prefixOne = (url, prefix) => (isRelative(url) ? `${prefix}${url === './' ? '' : url}` || './' : url);

export function prefixUrls(html, prefix) {
  if (!prefix) return html;
  return html
    .replace(/\b(href|src|poster)="([^"]*)"/gi, (_, attr, url) => `${attr}="${prefixOne(url, prefix)}"`)
    .replace(/\bsrcset="([^"]*)"/gi, (_, set) => `srcset="${set.split(',').map((part) => {
      const [url, ...rest] = part.trim().split(/\s+/);
      return [prefixOne(url, prefix), ...rest].join(' ');
    }).join(', ')}"`);
}

export const jsonScript = (data) => JSON.stringify(data).replace(/[<\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);

export const attrs = (map) => Object.entries(map)
  .filter(([, v]) => v !== false && v != null)
  .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escapeHtml(v)}"`))
  .join('');
