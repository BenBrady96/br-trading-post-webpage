import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PUBLIC = join(ROOT, 'public');
export const TEMPLATES = join(ROOT, 'templates');
export const DIST = join(ROOT, 'dist');
export const CACHE = join(ROOT, '.cache');
export const LOCAL = join(ROOT, 'scripts', 'local');

export const exists = (path) => access(path).then(() => true, () => false);

export const readJson = async (path, fallback = null) => {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw new Error(`${path}: ${err.message}`);
  }
};

export async function writeText(path, text) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text);
}

export async function listFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path));
    else files.push(path);
  }
  return files;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const USER_AGENT = 'Mozilla/5.0 (BR Trading Post build; +https://brtradingpost.co.uk/)';

export async function download(url, { attempts = 3, type = 'json', timeout = 15000 } = {}) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(timeout) });
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
      if (type === 'json') return await res.json();
      if (type === 'text') return await res.text();
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (err.status === 404 || i >= attempts) throw Object.assign(new Error(`${url}: ${err.message}`), { status: err.status });
      await sleep(1000 * i);
    }
  }
}
