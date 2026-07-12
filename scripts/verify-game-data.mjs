import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync('src/data/game-manifest.json', 'utf8'));
const source = JSON.parse(fs.readFileSync('src/scripts/game-source.json', 'utf8'));

assert.equal(manifest.schemaVersion, 2, 'Unsupported game manifest schema.');
assert.equal(manifest.source.commit, source.commit, 'Manifest and engine source commits differ.');
assert.ok(manifest.source.commit && manifest.source.commit !== 'local-unversioned', 'A committed game revision is required.');
assert.ok(manifest.upgrades.length > 0, 'No upgrades were extracted.');
assert.ok(manifest.stages.length > 0, 'No stages were extracted.');
assert.ok(manifest.achievements.list.length > 0, 'No achievements were extracted.');
assert.ok(manifest.dailyChallenges.length > 0, 'No daily challenges were extracted.');
assert.ok(manifest.affixes.list.length > 0, 'No affixes were extracted.');
assert.ok(manifest.shop.length > 0, 'No meta shop items were extracted.');
for (const upgrade of manifest.upgrades.filter((item) => item.progression === 'tiered')) {
  assert.equal(upgrade.maxTier, 3, `${upgrade.id} must expose all three game tiers.`);
  assert.deepEqual(upgrade.tierLevels.map((tier) => tier.level), [1, 2, 3], `${upgrade.id} tier levels are incomplete.`);
  assert.equal(upgrade.tierLevels[0].source, 'draft', `${upgrade.id} Tier 1 must be a draft pickup.`);
  assert.ok(upgrade.tierLevels.slice(1).every((tier) => tier.source === 'boss'), `${upgrade.id} evolutions must be boss tier-ups.`);
}
console.log(`Verified game manifest for ${manifest.source.repository}@${manifest.source.commit}.`);
