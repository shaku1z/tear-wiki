import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const artifact = JSON.parse(await readFile(new URL('../src/data/game-reference.v1.json', import.meta.url), 'utf8'));
const componentRoot = new URL('../src/components/', import.meta.url);

const componentNames = [
  'ConfigValue.astro',
  'ConfigTable.astro',
  'DailyChallengeConsole.astro',
  'MetaShopTable.astro',
  'StyleMeterReadout.astro',
  'RunScalingReadout.astro',
  'PaletteConsole.astro',
  'StatusEffectReadout.astro'
];

async function component(name) {
  return readFile(new URL(name, componentRoot), 'utf8');
}

test('system reference components use only the validated server artifact', async () => {
  for (const name of componentNames) {
    const source = await component(name);
    assert.match(source, /\.\.\/data\/game-reference\.mjs/, name);
    assert.doesNotMatch(source, /game-engine\.js|game-manifest|gameManifest/, name);
    assert.doesNotMatch(source, /\bCONFIG\b/, name);
    if (name !== 'ConfigValue.astro') assert.match(source, /source\.sha\.slice\(0, 7\)/, name);
  }
});

test('config readers expose only explicit weapon tuning and difficulty modifier paths', async () => {
  const value = await component('ConfigValue.astro');
  const table = await component('ConfigTable.astro');
  for (const source of [value, table]) {
    assert.ok(source.includes('(?:weapon|weapons)\\.([a-z0-9-]+)\\.tuning'), 'weapon path allowlist');
    assert.ok(source.includes('(?:difficulty|difficulties)\\.([a-z0-9-]+)\\.modifiers'), 'difficulty path allowlist');
    assert.match(source, /NOT PUBLISHED IN PUBLIC REFERENCE/);
  }
});

test('difficulty and stage readouts match complete artifact collections', async () => {
  const difficulties = artifact.collections['public-tuning'].items.difficultyCatalog;
  assert.deepEqual(difficulties.map((difficulty) => difficulty.id), ['easy', 'normal', 'hard', 'extreme', 'onehit']);
  for (const difficulty of difficulties) {
    assert.deepEqual(Object.keys(difficulty.modifiers).sort(), ['coinReward', 'enemyCount', 'enemyHealth', 'playerDamageTaken', 'scoreReward']);
  }

  const run = await component('RunScalingReadout.astro');
  assert.match(run, /difficulties\.map/);
  assert.match(run, /difficulty\.modifiers\[key\]/);
  assert.match(run, /modifierRows/);

  const stages = artifact.collections.stages.items;
  assert.deepEqual(stages.map((stage) => stage.id), ['grounds', 'undercroft', 'crimson-fields', 'voidspire', 'tear']);
  for (const stage of stages) assert.deepEqual(Object.keys(stage.theme).sort(), ['accent', 'background', 'dark', 'platform']);

  const palette = await component('PaletteConsole.astro');
  assert.match(palette, /stages\.map/);
  assert.match(palette, /stage\.theme\[key\]/);
  assert.match(palette, /themeColorKeys/);
});

test('unpublished system readouts state the boundary instead of rendering legacy values', async () => {
  for (const name of ['DailyChallengeConsole.astro', 'MetaShopTable.astro', 'StyleMeterReadout.astro', 'StatusEffectReadout.astro']) {
    const source = await component(name);
    assert.match(source, /NOT PUBLISHED IN PUBLIC REFERENCE/, name);
    assert.match(source, /No (?:stale|legacy)/, name);
  }
});

test('affected host pages no longer claim legacy configuration snapshots are current', async () => {
  const pages = [
    '../src/content/docs/reference/color-palette.mdx',
    '../src/content/docs/mechanics/status-effects.mdx',
    '../src/content/docs/mechanics/style-meter.mdx',
    '../src/content/docs/progression/daily-challenges.mdx',
    '../src/content/docs/progression/meta-shop.mdx'
  ];
  for (const relative of pages) {
    const source = await readFile(new URL(relative, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /CONFIG\.colors|retained game configuration|retained game snapshot|captured hit-loss|captured from the game snapshot/i, relative);
  }
});
