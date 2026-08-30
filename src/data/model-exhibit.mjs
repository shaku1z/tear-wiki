import artifact from './game-reference.v1.json' with { type: 'json' };

// Historical silhouettes are presentation assets, not a second gameplay
// roster. Canonical family and boss identities are projected from the
// authenticated game-reference artifact below; new records automatically get
// an honest metadata-only exhibit until artwork is deliberately retained.
const ARCHIVAL_ASSET_BY_CANONICAL_ID = Object.freeze({
  charger: 'charger',
  ranged: 'ranged',
  flyer: 'flyer',
  bomber: 'bomber',
  armored: 'armored',
  wraith: 'wraith',
  chimera: 'chimera',
  warden: 'warden',
  colossus: 'iron-colossus',
  aldric: 'aldric',
  echo: 'the-echo',
  source: 'the-source',
});

const references = {};
for (const family of artifact.collections.enemies.items.families) {
  references[family.id] = Object.freeze({ kind: 'enemy', canonicalId: family.id, assetId: ARCHIVAL_ASSET_BY_CANONICAL_ID[family.id] ?? null });
}
for (const boss of artifact.collections.bosses.items) {
  references[boss.id] = Object.freeze({ kind: 'boss', canonicalId: boss.id, assetId: ARCHIVAL_ASSET_BY_CANONICAL_ID[boss.id] ?? null });
}

// Compatibility props used by retained hand-authored pages.
if (references.colossus) references['iron-colossus'] = references.colossus;
if (references.echo) references['the-echo'] = references.echo;
if (references.source) references['the-source'] = references.source;
references.support = Object.freeze({ kind: 'legacy-label', canonicalId: null, assetId: 'support', label: 'Support (legacy label)' });
references.elite = Object.freeze({ kind: 'unsupported', canonicalId: null, assetId: null, label: 'Elite (unpublished record)' });

export const MODEL_REFERENCES = Object.freeze(references);

export const ARCHIVAL_ASSET_ALLOWLIST = Object.freeze([
  'aldric',
  'armored',
  'bomber',
  'charger',
  'chimera',
  'flyer',
  'iron-colossus',
  'ranged',
  'support',
  'the-echo',
  'the-source',
  'warden',
  'wraith',
]);

export function resolveModelReference(model) {
  return MODEL_REFERENCES[model] || { kind: 'unsupported', canonicalId: null, assetId: null, label: `${model || 'Unknown'} (unpublished record)` };
}
