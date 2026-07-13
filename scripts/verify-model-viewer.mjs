import assert from 'node:assert/strict';
import fs from 'node:fs';
import manifest from '../src/data/game-manifest.json' with { type: 'json' };
import { MODEL_PROFILES } from '../src/scripts/model-viewer-data.js';

const families = ['charger', 'ranged', 'flyer', 'bomber', 'armored', 'support', 'wraith', 'chimera'];
const bosses = ['warden', 'iron-colossus', 'aldric', 'the-echo', 'the-source'];
for (const model of [...families, ...bosses]) {
  assert.ok(MODEL_PROFILES[model], `Missing viewer profile for ${model}.`);
  assert.ok(MODEL_PROFILES[model].scale > 0, `Invalid viewer scale for ${model}.`);
}
for (const family of Object.keys(manifest.variants)) {
  assert.ok(families.includes(family), `Variant family ${family} has no supported viewer.`);
}

const renderer = fs.readFileSync('src/scripts/model-renderer.js', 'utf8');
assert.ok(!renderer.includes('performance.now ='), 'Viewer must not replace the browser clock.');
assert.ok(renderer.includes('IntersectionObserver'), 'Viewer must suspend rendering offscreen.');
assert.ok(renderer.includes('withRuntime'), 'Viewer simulation globals must be scoped.');

console.log(`Verified ${families.length + bosses.length} model profiles, scoped simulation, and viewer lifecycle.`);
