import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import artifact from '../src/data/game-reference.v1.json' with { type: 'json' };
import { MODEL_REFERENCES, resolveModelReference } from '../src/data/model-exhibit.mjs';

const families = artifact.collections.enemies.items.families;
const bosses = artifact.collections.bosses.items;

test('model exhibit maps every canonical family and boss without invented records', () => {
  for (const family of families) {
    assert.deepEqual(MODEL_REFERENCES[family.id], {
      kind: 'enemy',
      canonicalId: family.id,
      assetId: MODEL_REFERENCES[family.id].assetId,
    });
  }
  for (const boss of bosses) {
    assert.equal(MODEL_REFERENCES[boss.id].kind, 'boss');
    assert.equal(MODEL_REFERENCES[boss.id].canonicalId, boss.id);
  }
  assert.equal(resolveModelReference('support').canonicalId, null);
  assert.equal(resolveModelReference('elite').canonicalId, null);
  assert.equal(resolveModelReference('unknown-record').assetId, null);
});

test('canonical variant records are the only selectable variant data', () => {
  const variantFamilies = families.filter((family) => family.variants.length > 0);
  assert.deepEqual(variantFamilies.map((family) => family.id), ['charger', 'ranged', 'flyer', 'bomber']);
  assert.ok(variantFamilies.every((family) => family.variants.every((variant) => variant.id && variant.name && Number.isFinite(variant.weight))));
  assert.ok(families.filter((family) => family.variants.length === 0).every((family) => MODEL_REFERENCES[family.id]));
});

test('viewer component is static and explicitly archival', async () => {
  const component = await readFile(new URL('../src/components/ModelViewer.astro', import.meta.url), 'utf8');
  assert.match(component, /game-reference\.mjs/);
  assert.match(component, /ARCHIVAL SVG \/ NOT RUNTIME SIMULATION/);
  assert.match(component, /NO CANONICAL ID/);
  assert.match(component, /NO TOTAL\/CURRENT HP/);
  assert.match(component, /invalidVariant/);
  assert.doesNotMatch(component, /game-engine\.js|model-renderer|model-viewer-data|initModelViewer|<canvas/);
});
