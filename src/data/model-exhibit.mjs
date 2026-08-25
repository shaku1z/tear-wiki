// Explicit bridge between historical ModelViewer props and the canonical
// game-reference IDs. This file contains no game runtime imports or inferred
// combat data.
export const MODEL_REFERENCES = Object.freeze({
  charger: Object.freeze({ kind: 'enemy', canonicalId: 'charger', assetId: 'charger' }),
  ranged: Object.freeze({ kind: 'enemy', canonicalId: 'ranged', assetId: 'ranged' }),
  flyer: Object.freeze({ kind: 'enemy', canonicalId: 'flyer', assetId: 'flyer' }),
  bomber: Object.freeze({ kind: 'enemy', canonicalId: 'bomber', assetId: 'bomber' }),
  armored: Object.freeze({ kind: 'enemy', canonicalId: 'armored', assetId: 'armored' }),
  priest: Object.freeze({ kind: 'enemy', canonicalId: 'priest', assetId: null }),
  mender: Object.freeze({ kind: 'enemy', canonicalId: 'mender', assetId: null }),
  herald: Object.freeze({ kind: 'enemy', canonicalId: 'herald', assetId: null }),
  anchor: Object.freeze({ kind: 'enemy', canonicalId: 'anchor', assetId: null }),
  wraith: Object.freeze({ kind: 'enemy', canonicalId: 'wraith', assetId: 'wraith' }),
  chimera: Object.freeze({ kind: 'enemy', canonicalId: 'chimera', assetId: 'chimera' }),
  warden: Object.freeze({ kind: 'boss', canonicalId: 'warden', assetId: 'warden' }),
  colossus: Object.freeze({ kind: 'boss', canonicalId: 'colossus', assetId: 'iron-colossus' }),
  'iron-colossus': Object.freeze({ kind: 'boss', canonicalId: 'colossus', assetId: 'iron-colossus' }),
  aldric: Object.freeze({ kind: 'boss', canonicalId: 'aldric', assetId: 'aldric' }),
  echo: Object.freeze({ kind: 'boss', canonicalId: 'echo', assetId: 'the-echo' }),
  'the-echo': Object.freeze({ kind: 'boss', canonicalId: 'echo', assetId: 'the-echo' }),
  source: Object.freeze({ kind: 'boss', canonicalId: 'source', assetId: 'the-source' }),
  'the-source': Object.freeze({ kind: 'boss', canonicalId: 'source', assetId: 'the-source' }),
  // These props exist in older MDX, but neither is a canonical family ID.
  support: Object.freeze({ kind: 'legacy-label', canonicalId: null, assetId: 'support', label: 'Support (legacy label)' }),
  elite: Object.freeze({ kind: 'unsupported', canonicalId: null, assetId: null, label: 'Elite (unpublished record)' }),
});

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
