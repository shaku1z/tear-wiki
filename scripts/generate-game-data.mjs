import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG, UPGRADES, STAGES, VARIANTS, ACH, SHOP } from '../src/scripts/game-engine.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(fs.readFileSync(path.join(root, 'src/scripts/game-source.json'), 'utf8'));
const output = path.join(root, 'src/data/game-manifest.json');

function json(value) {
  return JSON.parse(JSON.stringify(value));
}

const manifest = {
  schemaVersion: 1,
  source,
  config: json(CONFIG),
  upgrades: UPGRADES.map(({ id, name, cat, desc, unique = false, rare = false, tiers }) => ({
    id, name, cat, desc, unique, rare, tiers: json(tiers || []),
  })),
  stages: json(STAGES),
  variants: json(VARIANTS),
  achievements: json(ACH),
  shop: json(SHOP),
};

assert.ok(manifest.source.commit, 'Game source commit is required.');
assert.ok(Array.isArray(manifest.upgrades) && manifest.upgrades.length > 0, 'No upgrades were extracted.');
assert.ok(Array.isArray(manifest.stages) && manifest.stages.length > 0, 'No stages were extracted.');
assert.ok(manifest.config.colors?.perfect, 'The engine palette was not extracted.');
assert.equal(new Set(manifest.upgrades.map((upgrade) => upgrade.id)).size, manifest.upgrades.length, 'Upgrade IDs must be unique.');

fs.writeFileSync(output, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Generated ${path.relative(root, output)} from ${manifest.source.repository}@${manifest.source.commit}.`);
