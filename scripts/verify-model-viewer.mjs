import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import artifact from '../src/data/game-reference.v1.json' with { type: 'json' };
import { ARCHIVAL_ASSET_ALLOWLIST, MODEL_REFERENCES, resolveModelReference } from '../src/data/model-exhibit.mjs';

const canonicalFamilies = artifact.collections.enemies.items.families;
const canonicalBosses = artifact.collections.bosses.items;
const familyIds = canonicalFamilies.map((family) => family.id);
const bossIds = canonicalBosses.map((boss) => boss.id);
assert.deepEqual(familyIds, ['charger', 'ranged', 'flyer', 'bomber', 'armored', 'priest', 'mender', 'herald', 'anchor', 'wraith', 'chimera']);
assert.deepEqual(bossIds, ['warden', 'colossus', 'aldric', 'echo', 'source']);

const assetRoot = path.resolve('public/generated/models');
const actualAssets = fs.readdirSync(assetRoot).filter((entry) => entry.endsWith('.svg')).map((entry) => entry.slice(0, -4)).sort();
assert.deepEqual(actualAssets, [...ARCHIVAL_ASSET_ALLOWLIST].sort(), 'Archival SVG inventory changed without an explicit allowlist update.');
for (const assetId of ARCHIVAL_ASSET_ALLOWLIST) {
  const svg = fs.readFileSync(path.join(assetRoot, `${assetId}.svg`), 'utf8');
  assert.match(svg, /^<svg\b/u, `${assetId}.svg is not an SVG exhibit.`);
}

for (const family of canonicalFamilies) {
  const reference = MODEL_REFERENCES[family.id];
  assert.ok(reference && reference.kind === 'enemy' && reference.canonicalId === family.id, `Missing canonical family exhibit mapping for ${family.id}.`);
  if (reference.assetId) assert.ok(ARCHIVAL_ASSET_ALLOWLIST.includes(reference.assetId), `Family ${family.id} points at an unallowlisted asset.`);
}
for (const boss of canonicalBosses) {
  const reference = MODEL_REFERENCES[boss.id];
  assert.ok(reference && reference.kind === 'boss' && reference.canonicalId === boss.id, `Missing canonical boss exhibit mapping for ${boss.id}.`);
  assert.ok(reference.assetId && ARCHIVAL_ASSET_ALLOWLIST.includes(reference.assetId), `Boss ${boss.id} must point at an archival asset.`);
}

const component = fs.readFileSync('src/components/ModelViewer.astro', 'utf8');
assert.match(component, /game-reference\.mjs/);
assert.match(component, /model-exhibit\.mjs/);
assert.match(component, /ARCHIVAL SVG \/ NOT RUNTIME SIMULATION/);
assert.match(component, /NO ARCHIVAL SILHOUETTE/);
assert.match(component, /data-variant-select/);
assert.doesNotMatch(component, /game-manifest|model-renderer|model-viewer-data|initModelViewer|<canvas|data-telemetry|CONFIG/);
assert.equal(fs.existsSync('src/scripts/model-renderer.js'), false, 'Legacy model renderer must not remain active.');
assert.equal(fs.existsSync('src/scripts/model-viewer-data.js'), false, 'Legacy model profile data must not remain active.');
assert.equal(fs.existsSync('scripts/generate-model-fallbacks.mjs'), false, 'Legacy fallback generator must not remain active.');

const documentationRoot = path.resolve('src/content/docs');
const documentationFiles = [];
const validVariantUses = new Set();
const invalidVariantUses = new Set();
function collectMarkdown(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectMarkdown(fullPath);
    else if (entry.name.endsWith('.mdx')) documentationFiles.push(fullPath);
  }
}
collectMarkdown(documentationRoot);
const modelTag = /<ModelViewer\b([^>]*)>/gu;
for (const file of documentationFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(modelTag)) {
    const model = /\bmodel="([^"]+)"/u.exec(match[1])?.[1];
    const variant = /\bvariant="([^"]+)"/u.exec(match[1])?.[1] || '';
    assert.ok(model, `${file} contains a ModelViewer without a model prop.`);
    const reference = resolveModelReference(model);
    assert.ok(MODEL_REFERENCES[model], `${file} uses an unregistered ModelViewer prop: ${model}.`);
    if (reference.kind === 'enemy') {
      const family = canonicalFamilies.find((entry) => entry.id === reference.canonicalId);
      assert.ok(family, `${file} maps ${model} to a missing canonical family.`);
      if (variant && family.variants.some((entry) => entry.id === variant)) validVariantUses.add(`${model}:${variant}`);
      else if (variant) invalidVariantUses.add(`${model}:${variant}`);
    } else if (variant) {
      invalidVariantUses.add(`${model}:${variant}`);
    }
  }
}
assert.deepEqual([...validVariantUses].sort(), ['bomber:lobber', 'charger:bull', 'flyer:swooper', 'ranged:warlock']);
assert.deepEqual([...invalidVariantUses].sort(), ['armored:default', 'chimera:default', 'elite:default', 'wraith:default']);
assert.match(component, /invalidVariant/);

console.log(`Verified ${canonicalFamilies.length} canonical enemy families, ${canonicalBosses.length} canonical bosses, ${actualAssets.length} retained archival SVGs, and ${documentationFiles.length} MDX files against the static exhibit boundary.`);
