import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { CATEGORIES, categoryFor, isSet } from '../../config/site.mjs';
import { checkContrast, contrast, tokenBlocks } from '../../scripts/lib/contrast.mjs';

test('categoryFor sorts listings into the right category', () => {
  assert.equal(categoryFor({ title: 'Charizard ex 199/165 Pokémon 151' }), 'pokemon');
  assert.equal(categoryFor({ title: 'Monkey D. Luffy OP05-119 SEC' }), 'one-piece');
  assert.equal(categoryFor({ title: 'Elsa Spirit of Winter Enchanted Lorcana' }), 'lorcana');
  assert.equal(categoryFor({ title: 'Blue-Eyes White Dragon LOB-001' }), 'yu-gi-oh');
  assert.equal(categoryFor({ title: 'MTG Foundations Play Booster Box' }), 'other-tcg');
  assert.equal(categoryFor({ title: 'Mystery card lot' }), 'other-tcg');
  assert.equal(categoryFor({ title: 'Custom Painted Pokémon Binder' }), 'custom-binders');
  assert.equal(categoryFor({ title: 'Charizard 9 pocket binder', source: 'etsy' }), 'custom-binders');
  assert.equal(categoryFor({ title: 'Official Pokémon 9 pocket binder', source: 'ebay' }), 'pokemon');
  assert.equal(categoryFor({ title: 'Booster box', specifics: [['Game', 'One Piece Card Game']] }), 'one-piece');
  assert.equal(categoryFor({ title: 'Luffy OP05-119', specifics: [['Game', 'Pokémon TCG']] }), 'one-piece');
});

test('every category has the copy its page needs', () => {
  for (const c of CATEGORIES) {
    assert.match(c.id, /^[a-z0-9-]+$/);
    assert.ok(c.title.length + ' | BR Trading Post'.length <= 60, c.title);
    assert.ok(c.intro.length >= 2 && c.faq.length >= 1, c.id);
  }
});

test('isSet treats TODO values as placeholders', () => {
  assert.equal(isSet('TODO: owner'), false);
  assert.equal(isSet(''), false);
  assert.equal(isSet('https://www.tiktok.com/@br'), true);
});

test('contrast maths matches WCAG', () => {
  assert.equal(contrast('#000000', '#FFFFFF').toFixed(1), '21.0');
  assert.equal(contrast('#777777', '#FFFFFF').toFixed(2), '4.48');
});

test('every text colour passes WCAG AA in light and dark mode', async () => {
  const css = await readFile(new URL('../../public/css/styles.css', import.meta.url), 'utf8');
  const { light, dark, darkAuto } = tokenBlocks(css);
  assert.deepEqual(dark, darkAuto);
  assert.deepEqual(checkContrast(light), []);
  assert.deepEqual(checkContrast({ ...light, ...dark }), []);
});
