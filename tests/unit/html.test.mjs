import assert from 'node:assert/strict';
import { test } from 'node:test';
import { escapeHtml, fill, jsonScript, prefixUrls } from '../../scripts/lib/html.mjs';

test('escapeHtml escapes every special character', () => {
  assert.equal(escapeHtml(`<a href="x" onclick='y'>&</a>`), '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  assert.equal(escapeHtml(null), '');
});

test('fill escapes {{values}}, keeps {{{html}}} and fails on missing values', () => {
  assert.equal(fill('<p>{{a}}</p>{{{b}}}', { a: '<b>', b: '<i>x</i>' }), '<p>&lt;b&gt;</p><i>x</i>');
  assert.throws(() => fill('{{missing}}', {}), /missing/);
});

test('prefixUrls only rewrites relative links, including srcset', () => {
  const html = '<a href="shop/">x</a><a href="https://e.com">y</a><a href="#top">z</a><a href="mailto:a@b.c">m</a><img src="img/a.webp" srcset="img/a.webp 1x, img/b.webp 2x"><a href="./">h</a>';
  assert.equal(prefixUrls(html, '../'), '<a href="../shop/">x</a><a href="https://e.com">y</a><a href="#top">z</a><a href="mailto:a@b.c">m</a><img src="../img/a.webp" srcset="../img/a.webp 1x, ../img/b.webp 2x"><a href="../">h</a>');
  assert.equal(prefixUrls(html, ''), html);
});

test('jsonScript cannot break out of a script tag', () => {
  const out = jsonScript({ name: '</script><script>alert(1)</script>', sep: String.fromCharCode(0x2028) });
  assert.ok(!out.includes('</script>'));
  assert.ok(!out.includes(String.fromCharCode(0x2028)));
  assert.deepEqual(JSON.parse(out), { name: '</script><script>alert(1)</script>', sep: String.fromCharCode(0x2028) });
});
