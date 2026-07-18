import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG, UPGRADES, STAGES, VARIANTS, AFFIXES, PRESETS, ACH, SHOP, DAILY } from '../src/scripts/game-engine.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(fs.readFileSync(path.join(root, 'src/scripts/game-source.json'), 'utf8'));
const output = path.join(root, 'src/data/game-manifest.json');

function json(value) {
  return JSON.parse(JSON.stringify(value));
}

// ACH.list may be a runtime getter in newer game builds. It filters through the
// browser-only PROFILE singleton, so the wiki must snapshot the authored backing
// catalogue rather than serialize the runtime facade.
const achievementList = Array.isArray(ACH._all) ? ACH._all : ACH.list;
const achievements = {
  RARITY: json(ACH.RARITY),
  CATS: json(ACH.CATS),
  list: json(achievementList),
};

const manifest = {
  schemaVersion: 2,
  source,
  config: json(CONFIG),
  upgrades: UPGRADES.map(({ id, name, cat, desc, unique = false, rare = false, tiers }) => {
    const evolutions = json(tiers || []);
    const progression = evolutions.length ? 'tiered' : unique ? 'single' : 'stackable';
    const tierLevels = evolutions.length
      ? [{ level: 1, source: 'draft', desc }, ...evolutions.map((tier, index) => ({ level: index + 2, source: 'boss', desc: tier.desc }))]
      : [];

    return {
      id, name, cat, desc, unique, rare,
      progression,
      maxTier: tierLevels.length || null,
      tierLevels,
      tiers: evolutions,
    };
  }),
  stages: json(STAGES),
  variants: json(VARIANTS),
  affixes: { list: AFFIXES.map(({ id, color }) => ({ id, color })), presets: json(PRESETS) },
  achievements,
  shop: json(SHOP),
  dailyChallenges: DAILY.POOL.map(({ id, key, mode, goal, shards }) => ({ id, key, mode, goal, shards })),
};

assert.ok(manifest.source.commit, 'Game source commit is required.');
assert.ok(Array.isArray(manifest.upgrades) && manifest.upgrades.length > 0, 'No upgrades were extracted.');
assert.ok(Array.isArray(manifest.stages) && manifest.stages.length > 0, 'No stages were extracted.');
assert.ok(Array.isArray(manifest.achievements.list) && manifest.achievements.list.length > 0, 'No achievements were extracted.');
assert.ok(manifest.config.colors?.perfect, 'The engine palette was not extracted.');
assert.equal(new Set(manifest.upgrades.map((upgrade) => upgrade.id)).size, manifest.upgrades.length, 'Upgrade IDs must be unique.');
for (const upgrade of manifest.upgrades.filter((item) => item.progression === 'tiered')) {
  assert.equal(upgrade.maxTier, upgrade.tierLevels.length, `${upgrade.id} tier count must be explicit.`);
  assert.deepEqual(upgrade.tierLevels.map((tier) => tier.level), [1, 2, 3], `${upgrade.id} must expose Tier 1 through Tier 3.`);
  assert.equal(upgrade.tierLevels[0].desc, upgrade.desc, `${upgrade.id} Tier 1 must match the draft pickup.`);
}

fs.writeFileSync(output, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Generated ${path.relative(root, output)} from ${manifest.source.repository}@${manifest.source.commit}.`);
