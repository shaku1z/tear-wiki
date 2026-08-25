import assert from 'node:assert/strict';
import artifact from '../src/data/game-reference.v1.json' with { type: 'json' };

const tiered = artifact.collections.upgrades.items.filter((upgrade) => upgrade.rule.kind === 'tiered');

assert.equal(tiered.length, 18, 'The published artifact must expose all 18 tiered upgrades.');
for (const upgrade of tiered) {
  assert.equal(upgrade.tiers.length, 2, `${upgrade.id} must expose Tier 1 through Tier 3.`);
  assert.ok(upgrade.description.length > 0, `${upgrade.id} must expose a Tier 1 description.`);
  assert.ok(upgrade.tiers.every((tier) => typeof tier.description === 'string' && tier.description.length > 0), `${upgrade.id} has an incomplete published tier path.`);
}

console.log(`Verified ${tiered.length} published Tier 1–3 descriptions; no runtime simulator is used by the planner.`);
