import { resolve } from 'node:path';
import { SITE } from '../config/site.mjs';
import { build } from './lib/build.mjs';
import { loadData } from './lib/data.mjs';

const slash = (url) => url.replace(/\/*$/, '/');
const SITE_URL = slash(process.env.SITE_URL || SITE.url);
const API_URL = process.env.API_URL ? slash(process.env.API_URL) : '';
const fixtures = process.argv.includes('--fixtures');
const clientApi = fixtures ? `${SITE_URL}__api/` : API_URL || SITE.apiUrl;
const version = `${(process.env.GITHUB_SHA || 'local').slice(0, 7)}-${Date.now().toString(36)}`;

const data = await loadData({ apiUrl: fixtures ? clientApi : API_URL, fixtures });
const out = process.env.OUT_DIR ? resolve(process.env.OUT_DIR) : undefined;
const result = await build({ siteUrl: SITE_URL, apiUrl: clientApi, data, version, out });

console.log(`Built ${out || 'dist/'}: ${result.files} files, ${(result.bytes / 1048576).toFixed(1)} MB, ${result.pages} pages (${result.items} items, ${result.promotions} live promotions)`);
console.log(`Site URL: ${SITE_URL}`);
console.log(`API URL: ${API_URL || (fixtures ? clientApi : '(not set)')}`);
console.log(`Service worker version: ${version}`);
