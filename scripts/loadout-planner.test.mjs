import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import artifact from '../src/data/game-reference.v1.json' with { type: 'json' };
import {
  LOADOUT_VERSION,
  MAX_ENCODED_LENGTH,
  decodeLoadout,
  encodeLoadout,
} from '../src/lib/urlEncoder.js';

const catalog = artifact.collections.upgrades.items;
const tiered = catalog.filter((upgrade) => upgrade.rule.kind === 'tiered');
const unique = catalog.find((upgrade) => upgrade.rule.kind === 'unique');
const fortune = catalog.find((upgrade) => upgrade.id === 'fortune');
const unlimitedStackable = catalog.find((upgrade) => upgrade.rule.kind === 'stackable' && upgrade.maxStacks === null);

function encodedPayload(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

test('planner artifact exposes the exact current 60-upgrade catalog', () => {
  assert.equal(catalog.length, 60);
  assert.equal(tiered.length, 18);
  assert.equal(catalog.filter((upgrade) => upgrade.rule.kind === 'unique').length, 18);
  assert.equal(catalog.filter((upgrade) => upgrade.rule.kind === 'stackable').length, 24);
  assert.ok(fortune && fortune.maxStacks === 5);
  assert.ok(unlimitedStackable && unlimitedStackable.maxStacks === null);
});

test('v2 loadout links round-trip only catalog selections', () => {
  const state = {
    specials: { [tiered[0].id]: 3 },
    uniques: [unique.id],
    stackables: { [fortune.id]: 5, [unlimitedStackable.id]: 99 },
  };
  const encoded = encodeLoadout(state, catalog);
  assert.ok(encoded);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/u);
  const decoded = decodeLoadout(encoded, catalog);
  assert.deepEqual(decoded, {
    specials: { [tiered[0].id]: 3 },
    uniques: [unique.id],
    stackables: { [fortune.id]: 5, [unlimitedStackable.id]: 99 },
  });
});

test('decoder rejects legacy, malformed, unknown, and over-bound links', () => {
  const empty = { v: LOADOUT_VERSION, specials: {}, uniques: [], stackables: {} };
  assert.deepEqual(decodeLoadout(encodedPayload(empty), catalog), emptyValue());
  assert.equal(decodeLoadout(encodedPayload({ ...empty, v: 1 }), catalog), null);
  assert.equal(decodeLoadout(encodedPayload({ ...empty, extra: true }), catalog), null);
  assert.equal(decodeLoadout(encodedPayload({ ...empty, specials: { unknown: 1 } }), catalog), null);
  assert.equal(decodeLoadout(encodedPayload({ ...empty, specials: { [tiered[0].id]: 0 } }), catalog), null);
  assert.equal(decodeLoadout(encodedPayload({ ...empty, specials: { [tiered[0].id]: 4 } }), catalog), null);
  assert.equal(decodeLoadout(encodedPayload({ ...empty, specials: { [unique.id]: 1 } }), catalog), null);
  assert.equal(decodeLoadout(encodedPayload({ ...empty, uniques: [tiered[0].id] }), catalog), null);
  assert.equal(decodeLoadout(encodedPayload({ ...empty, specials: { [tiered[0].id]: 1 }, uniques: [tiered[0].id] }), catalog), null);
  assert.equal(decodeLoadout(encodedPayload({ ...empty, uniques: [unique.id, unique.id] }), catalog), null);
  assert.equal(decodeLoadout(encodedPayload({ ...empty, stackables: { [fortune.id]: 6 } }), catalog), null);
  assert.equal(decodeLoadout(encodedPayload({ ...empty, stackables: { [unlimitedStackable.id]: 100 } }), catalog), null);
  const prototypePayload = JSON.parse('{"v":2,"specials":{"__proto__":1},"uniques":[],"stackables":{}}');
  assert.equal(decodeLoadout(encodedPayload(prototypePayload), catalog), null);
  assert.equal(decodeLoadout('A'.repeat(MAX_ENCODED_LENGTH + 1), catalog), null);
  assert.equal(decodeLoadout('not base64!', catalog), null);
});

test('planner client graph stays artifact-bound and simulator-free', async () => {
  const builder = await readFile(new URL('../src/components/builder/Builder.svelte', import.meta.url), 'utf8');
  const page = await readFile(new URL('../src/pages/builder.astro', import.meta.url), 'utf8');
  const deepLink = await readFile(new URL('../src/components/BuilderDeepLink.astro', import.meta.url), 'utf8');
  const source = `${builder}\n${page}\n${deepLink}`;
  assert.match(builder, /export let upgrades/);
  assert.match(builder, /PLANNER LIMIT/);
  assert.match(builder, /NO PUBLISHED CAP/);
  assert.match(page, /plannerUpgrades/);
  assert.match(deepLink, /encodeLoadout/);
  assert.doesNotMatch(source, /game-engine\.js|game-manifest|simulate\.js|data\/abilities|v: 1|Buffer\.from/);
});

function emptyValue() {
  return { specials: {}, uniques: [], stackables: {} };
}
