import assert from 'node:assert/strict';
import { get } from 'svelte/store';
import manifest from '../src/data/game-manifest.json' with { type: 'json' };
import { loadout, selectedAbilities } from '../src/stores/loadout.js';
import { simulate } from '../src/lib/simulate.js';

const tiered = manifest.upgrades.filter((upgrade) => upgrade.progression === 'tiered');

assert.ok(tiered.length > 0, 'No evolvable abilities were found.');
for (const upgrade of tiered) {
  assert.equal(upgrade.maxTier, 3, `${upgrade.id} must expose Tier 1 through Tier 3.`);
  assert.deepEqual(upgrade.tierLevels.map((tier) => tier.level), [1, 2, 3], `${upgrade.id} has an invalid tier path.`);

  for (const tier of upgrade.tierLevels) {
    loadout.set({ specials: { [upgrade.id]: tier.level }, uniques: [], stackables: {} });
    const result = simulate(get(selectedAbilities));
    assert.equal(result.mods.tier[upgrade.id], tier.level, `${upgrade.id} Tier ${tier.level} did not reach the simulator.`);
  }
}

const measureAerialRave = (tier) => {
  loadout.set({ specials: { aerial_rave: tier }, uniques: [], stackables: {} });
  const result = simulate(get(selectedAbilities));
  return { ramp: result.mods.aerialRave, cap: result.config.skill.aerialRaveCap };
};

const t1 = measureAerialRave(1);
const t2 = measureAerialRave(2);
const t3 = measureAerialRave(3);
assert.ok(t1.ramp < t2.ramp && t2.ramp < t3.ramp, 'Aerial Rave evolution effects are not cumulative.');
assert.ok(t1.cap < t2.cap && t2.cap < t3.cap, 'Aerial Rave tier configuration is not cumulative.');

loadout.set({ specials: {}, uniques: [], stackables: {} });
console.log(`Verified ${tiered.length} Tier 1–3 evolution paths and Builder simulator effects.`);
