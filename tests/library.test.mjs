// Validates the component library: unique ids, known kits, resolvable templates and well-formed markup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../src/components.js', import.meta.url), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(src, sandbox);
const { kits, items, templates } = sandbox.window.KB_LIB;

const VOID = new Set('area base br col embed hr img input link meta source track wbr'.split(' '));

function checkBalanced(html) {
  const stack = [];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('<!--')) continue;
    const [, close, rawTag, , selfClose] = m;
    const tag = rawTag.toLowerCase();
    if (close) {
      const top = stack.pop();
      if (top !== tag) return `expected </${top}> but found </${tag}>`;
    } else if (!VOID.has(tag) && !selfClose) {
      stack.push(tag);
    }
  }
  return stack.length ? `unclosed <${stack.join('>, <')}>` : null;
}

test('library has components and kits', () => {
  assert.ok(items.length >= 150, `expected 150+ components, got ${items.length}`);
  assert.ok(kits.length >= 7);
});

test('component ids are unique', () => {
  const seen = new Set();
  for (const it of items) {
    assert.ok(!seen.has(it.id), `duplicate id ${it.id}`);
    seen.add(it.id);
  }
});

test('every component belongs to a known kit and has a name, category and markup', () => {
  const kitIds = new Set(kits.map((k) => k.id));
  for (const it of items) {
    assert.ok(kitIds.has(it.kit), `${it.id}: unknown kit ${it.kit}`);
    assert.ok(it.name && it.cat, `${it.id}: missing name or category`);
    assert.ok(it.html.trim().startsWith('<'), `${it.id}: markup must start with an element`);
  }
});

test('component markup is well formed', () => {
  for (const it of items) {
    const err = checkBalanced(it.html);
    assert.equal(err, null, `${it.id}: ${err}`);
  }
});

test('components never ship scripts or external images', () => {
  for (const it of items) {
    assert.ok(!/<script/i.test(it.html), `${it.id} contains a <script>`);
    assert.ok(!/src="https?:/i.test(it.html), `${it.id} loads a remote image`);
  }
});

test('templates only reference existing components', () => {
  const ids = new Set(items.map((i) => i.id));
  const flat = (e) => (Array.isArray(e) ? [e[0], ...e[1].flatMap(flat)] : [e]);
  for (const t of templates) {
    for (const id of t.items.flatMap(flat)) assert.ok(ids.has(id), `template "${t.name}" references missing ${id}`);
  }
});
