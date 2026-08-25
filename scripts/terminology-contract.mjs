import assert from 'node:assert/strict';

const EXPECTED_NAMES = [
  'TEAR Music',
  'Adaptive Soundtrack',
  'Music',
  'Soundtrack Desk',
  'Training Operations',
  'Scenario Console',
  'Replay Editor',
  'Replay Hub',
  'Game Agent',
  'Training Archive',
  'Run Monitor',
  'TearBench',
];

const EXPECTED_IDS = [
  'tear-music',
  'adaptive-soundtrack',
  'music',
  'soundtrack-desk',
  'training-operations',
  'scenario-console',
  'replay-editor',
  'replay-hub',
  'game-agent',
  'training-archive',
  'run-monitor',
  'tearbench',
];

const EXPECTED_ALIASES = {
  'tear-music': ['TearScore', 'tear-score'],
  'adaptive-soundtrack': ['TearScore runtime', 'TearScore engine'],
  music: ['THE SIGNAL', 'Signal'],
  'soundtrack-desk': ['Foundry Studio', 'audio Foundry'],
  'training-operations': ['Foundry'],
  'scenario-console': ['State Forge', 'State Forge Studio'],
  'replay-editor': ['Ghost Studio'],
  'replay-hub': ['Ghost Lab'],
  'game-agent': ['TearBot'],
  'training-archive': ['Academy'],
  'run-monitor': ['Watch Agent'],
  tearbench: [],
};

const EXPECTED_HISTORICAL_SNAPSHOT = {
  repository: 'shaku1z/tear',
  commit: 'd62c20eca2da067800f763abc5afdf4c7747fe76',
  capturedAt: '2026-07-18T05:40:18Z',
  freshness: 'retained',
  refreshOwner: 'G6 typed game-reference synchronization',
};

const ACTIVE_WEAPONS = ['sword', 'hammer', 'greatsword', 'chainblade', 'riftlock'];
const RETIRED_WEAPONS = ['spear', 'ringblade'];
const SNAPSHOT_KEYS = [
  'repository',
  'sourceSha',
  'validationRunId',
  'manifestSha256',
  'manifestSchemaVersion',
  'format',
  'terminologyVersion',
  'manifestFilename',
  'receiptFilename',
  'validationEvent',
  'validationRef',
];

function exactKeys(value, keys, label) {
  assert.equal(value !== null && typeof value === 'object' && !Array.isArray(value), true, `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label} keys changed`);
}

function assertText(value, label) {
  assert.equal(typeof value, 'string', `${label} must be text`);
  assert.notEqual(value.length, 0, `${label} must not be empty`);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function snapshotFromArtifact(result) {
  const { receipt, manifestSha256 } = result;
  return {
    repository: receipt.repository,
    sourceSha: receipt.sourceSha,
    validationRunId: receipt.validationRunId,
    manifestSha256,
    manifestSchemaVersion: receipt.gameReferenceSchemaVersion,
    format: receipt.gameReferenceFormat,
    terminologyVersion: receipt.terminologyVersion,
    manifestFilename: receipt.manifestFilename,
    receiptFilename: receipt.receiptFilename,
    validationEvent: receipt.validationEvent,
    validationRef: receipt.validationRef,
  };
}

export function snapshotBinding(registry) {
  exactKeys(registry?.snapshot, SNAPSHOT_KEYS, 'terminology snapshot');
  const snapshot = registry.snapshot;
  assert.match(snapshot.repository, /^shaku1z\/tear$/u, 'terminology snapshot repository is not canonical');
  assert.match(snapshot.sourceSha, /^[0-9a-f]{40}$/u, 'terminology snapshot source SHA is invalid');
  assert.match(String(snapshot.validationRunId), /^[1-9][0-9]*$/u, 'terminology snapshot validation run is invalid');
  assert.match(snapshot.manifestSha256, /^[0-9a-f]{64}$/u, 'terminology snapshot manifest hash is invalid');
  assert.equal(snapshot.manifestSchemaVersion, 2, 'terminology snapshot schema must be 2');
  assert.equal(snapshot.format, 'game-reference.v1', 'terminology snapshot format changed');
  assert.equal(snapshot.terminologyVersion, 'g4-terminology-v1', 'terminology snapshot version changed');
  assert.equal(snapshot.manifestFilename, 'game-reference.v1.json', 'terminology manifest filename changed');
  assert.equal(snapshot.receiptFilename, 'game-reference.v1.receipt.json', 'terminology receipt filename changed');
  assert.equal(snapshot.validationEvent, 'push', 'terminology snapshot event must be push');
  assert.equal(snapshot.validationRef, 'refs/heads/main', 'terminology snapshot ref must be main');
  return snapshot;
}

export function assertTerminologyRegistryShape(registry) {
  assert.equal(registry?.schemaVersion, 1, 'Unsupported wiki terminology schema.');
  assert.equal(registry.registryId, 'g4-wiki-terminology-v1', 'Unexpected terminology registry.');
  assert.equal(registry.status, 'verified-reference', 'Terminology must be bound to the current validated reference.');
  assert.equal(registry.scope, 'Permanent public terminology for authored wiki copy, bound to the validated current game-reference artifact.', 'Terminology scope changed.');
  assert.equal(Array.isArray(registry.publicTerms), true, 'Public terms must be an array.');
  assert.deepEqual(registry.publicTerms.map((term) => term.id), EXPECTED_IDS, 'Permanent public term IDs/order changed.');
  assert.deepEqual(registry.publicTerms.map((term) => term.displayName), EXPECTED_NAMES, 'Permanent public term order changed.');
  assert.equal(new Set(registry.publicTerms.map((term) => term.id)).size, registry.publicTerms.length, 'Public term IDs must be unique.');
  for (const term of registry.publicTerms) {
    const expectedTermKeys = ['id', 'displayName', 'codeId', 'scope', 'deprecatedAliases', 'compatibility'];
    if (term.id === 'music') expectedTermKeys.push('deprecatedCopyAliases');
    if (term.id === 'tearbench') expectedTermKeys.push('unchanged');
    exactKeys(term, expectedTermKeys, `public term ${term.id}`);
    assertText(term.id, `${term.id}.id`);
    assertText(term.displayName, `${term.id}.displayName`);
    assertText(term.codeId, `${term.id}.codeId`);
    assertText(term.scope, `${term.id}.scope`);
    assert.equal(Array.isArray(term.deprecatedAliases), true, `${term.id}.deprecatedAliases must be an array.`);
    assert.deepEqual(term.deprecatedAliases, EXPECTED_ALIASES[term.id], `${term.id} aliases changed.`);
    assertText(term.compatibility, `${term.id}.compatibility`);
  }
  assert.deepEqual(registry.publicTerms.find((term) => term.id === 'music')?.deprecatedCopyAliases, ['THE SIGNAL'], 'Music copy compatibility changed.');
  assert.equal(registry.publicTerms.find((term) => term.id === 'tearbench')?.unchanged, true, 'TearBench must remain unchanged.');
  assert.deepEqual(registry.historicalSnapshot, EXPECTED_HISTORICAL_SNAPSHOT, 'Immutable G4 historical snapshot provenance changed.');
  const roster = registry.activeRoster;
  assert.equal(roster?.schemaVersion, 'final-five-v1', 'Unexpected Final Five schema.');
  assert.equal(roster?.source, 'validated game-reference artifact roster', 'Final Five source changed.');
  assert.deepEqual(roster.canonicalIds, ACTIVE_WEAPONS, 'Final Five IDs must stay ordered.');
  assert.deepEqual(roster.canonicalDisplayNames, ['Sword', 'Hammer', 'Greatsword', 'Chainblade', 'Riftlock'], 'Final Five display names must stay ordered.');
  assert.deepEqual(roster.retiredIds, RETIRED_WEAPONS, 'Only Spear and Ringblade are retired IDs.');
  assert.deepEqual(roster.migrationMap, { spear: 'greatsword', ringblade: 'riftlock' }, 'Retired weapon migration map changed.');
  return registry;
}

export function assertTerminologyRegistry(registry, artifactResult) {
  assertTerminologyRegistryShape(registry);
  const roster = registry.activeRoster;
  assert.deepEqual(artifactResult.manifest.roster.activeWeaponIds, roster.canonicalIds, 'Terminology roster diverged from game-reference roster.');
  assert.deepEqual(artifactResult.manifest.roster.retiredWeaponIds, roster.retiredIds, 'Retired roster diverged from game-reference roster.');
  const expectedSnapshot = snapshotFromArtifact(artifactResult);
  assert.deepEqual(registry.snapshot, expectedSnapshot, 'Terminology snapshot does not match the validated artifact and receipt.');
  return registry;
}

export function registryForArtifact(registry, artifactResult) {
  assertTerminologyRegistryShape(registry);
  const next = clone(registry);
  next.snapshot = snapshotFromArtifact(artifactResult);
  const before = clone(registry);
  before.snapshot = null;
  const after = clone(next);
  after.snapshot = null;
  assert.deepEqual(after, before, 'Promotion may change only terminology.snapshot.');
  assertTerminologyRegistry(next, artifactResult);
  return next;
}

export { ACTIVE_WEAPONS, RETIRED_WEAPONS, EXPECTED_HISTORICAL_SNAPSHOT, SNAPSHOT_KEYS };
