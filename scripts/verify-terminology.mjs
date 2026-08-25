import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateGameReferenceArtifact } from './game-reference-contract.mjs';
import registry from '../src/data/wiki-terminology.json' with { type: 'json' };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceSha = '9ddd8f20a9c7d1830a2e043d9e558e259f738d02';
const validationRunId = '32785864315';
const manifestSha256 = '7b8b3f5fec5862f3649470ab3e04170e096065c823b9349140bf9d688740311f';
const readBytes = (relativePath) => fs.readFileSync(path.join(root, relativePath));
const readText = (relativePath) => readBytes(relativePath).toString('utf8');

const manifestBytes = readBytes('src/data/game-reference.v1.json');
const receiptBytes = readBytes('src/data/game-reference.v1.receipt.json');
const receipt = JSON.parse(receiptBytes.toString('utf8'));
const current = validateGameReferenceArtifact({ manifestBytes, receiptBytes, expectedSha: sourceSha, expectedRunId: validationRunId });

assert.equal(current.manifestSha256, manifestSha256, 'Current game-reference manifest hash changed unexpectedly.');
assert.equal(receipt.sourceSha, sourceSha, 'Current receipt source SHA changed unexpectedly.');
assert.equal(receipt.validationRunId, validationRunId, 'Current receipt validation run changed unexpectedly.');
assert.equal(receipt.manifestSha256, manifestSha256, 'Current receipt manifest hash changed unexpectedly.');
assert.equal(current.manifest.schemaVersion, 2, 'Current game-reference schema must remain version 2.');
assert.equal(current.manifest.terminologyVersion, 'g4-terminology-v1', 'Current artifact terminology contract changed unexpectedly.');

const expectedNames = [
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
const expectedAliases = {
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

assert.equal(registry.schemaVersion, 1, 'Unsupported wiki terminology schema.');
assert.equal(registry.registryId, 'g4-wiki-terminology-v1', 'Unexpected terminology registry.');
assert.equal(registry.status, 'verified-reference', 'Terminology must be bound to the current validated reference.');
assert.deepEqual(registry.publicTerms.map((term) => term.displayName), expectedNames, 'Permanent public term order changed.');
assert.equal(new Set(registry.publicTerms.map((term) => term.id)).size, registry.publicTerms.length, 'Public term IDs must be unique.');
for (const term of registry.publicTerms) assert.deepEqual(term.deprecatedAliases, expectedAliases[term.id], `${term.id} aliases changed.`);
assert.deepEqual(registry.publicTerms.find((term) => term.id === 'music').deprecatedCopyAliases, ['THE SIGNAL'], 'Music copy compatibility changed.');
assert.equal(registry.publicTerms.find((term) => term.id === 'tearbench').unchanged, true, 'TearBench must remain unchanged.');

assert.deepEqual(registry.snapshot, {
  repository: 'shaku1z/tear',
  sourceSha,
  validationRunId,
  manifestSha256,
  manifestSchemaVersion: 2,
  format: 'game-reference.v1',
  terminologyVersion: 'g4-terminology-v1',
  manifestFilename: 'game-reference.v1.json',
  receiptFilename: 'game-reference.v1.receipt.json',
  validationEvent: 'push',
  validationRef: 'refs/heads/main',
}, 'Current terminology snapshot must bind the exact validated artifact and receipt.');
assert.deepEqual(registry.historicalSnapshot, {
  repository: 'shaku1z/tear',
  commit: 'd62c20eca2da067800f763abc5afdf4c7747fe76',
  capturedAt: '2026-07-18T05:40:18Z',
  freshness: 'retained',
  refreshOwner: 'G6 typed game-reference synchronization',
}, 'Immutable G4 historical snapshot provenance changed.');

const roster = registry.activeRoster;
assert.equal(roster.schemaVersion, 'final-five-v1', 'Unexpected Final Five schema.');
assert.deepEqual(roster.canonicalIds, ['sword', 'hammer', 'greatsword', 'chainblade', 'riftlock'], 'Final Five IDs must stay ordered.');
assert.deepEqual(roster.canonicalDisplayNames, ['Sword', 'Hammer', 'Greatsword', 'Chainblade', 'Riftlock'], 'Final Five display names must stay ordered.');
assert.deepEqual(roster.retiredIds, ['spear', 'ringblade'], 'Only Spear and Ringblade are retired IDs.');
assert.deepEqual(roster.migrationMap, { spear: 'greatsword', ringblade: 'riftlock' }, 'Retired weapon migration map changed.');
assert.deepEqual(current.manifest.roster.activeWeaponIds, roster.canonicalIds, 'Terminology roster diverged from game-reference roster.');
assert.deepEqual(current.manifest.roster.retiredWeaponIds, roster.retiredIds, 'Retired roster diverged from game-reference roster.');

const legacyFiles = [
  'src/data/game-manifest.json',
  'src/scripts/game-engine.js',
  'src/scripts/game-config.js',
  'src/scripts/game-source.json',
  'scripts/sync-game-data.mjs',
  'scripts/sync-config.js',
  'scripts/generate-game-data.mjs',
  'scripts/verify-game-data.mjs',
  '.github/workflows/sync-game.yml',
];
for (const relativePath of legacyFiles) assert.equal(fs.existsSync(path.join(root, relativePath)), false, `Obsolete legacy path remains: ${relativePath}`);

// Generic words such as "Signal" remain valid gameplay vocabulary; only
// configured deprecated copy phrases are scanned in authored public source.
const legacyAliases = registry.publicTerms.flatMap((term) => term.deprecatedCopyAliases ?? term.deprecatedAliases);
const legacyWeaponIds = roster.retiredIds;
const deprecatedPatterns = [...legacyAliases, ...legacyWeaponIds];
const scanRoots = ['src/content', 'src/components', 'src/pages', 'src/content.config.ts', 'astro.config.mjs', 'public/admin'];
const files = [];
const walk = (relativePath) => {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return;
  const stat = fs.statSync(absolutePath);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(absolutePath)) walk(path.join(relativePath, entry));
    return;
  }
  if (/\.(astro|md|mdx|ts|tsx|svelte|html|yml|yaml|json)$/i.test(relativePath)) files.push(relativePath);
};
for (const scanRoot of scanRoots) walk(scanRoot);

const hits = [];
for (const relativePath of files) {
  const contents = fs.readFileSync(path.join(root, relativePath), 'utf8');
  for (const alias of deprecatedPatterns) {
    const pattern = new RegExp(`(?<![\\w-])${alias.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')}(?![\\w-])`, 'i');
    if (pattern.test(contents)) hits.push(`${relativePath}: ${alias}`);
  }
}
assert.deepEqual(hits, [], `Deprecated names leaked into active wiki source:\n${hits.join('\n')}`);

const terminologyPage = readText('src/content/docs/reference/terminology.mdx');
assert.match(terminologyPage, /explicit compatibility reference/i, 'Compatibility page must state its historical/migration scope.');
assert.match(terminologyPage, /validated game-reference artifact/i, 'Compatibility page must identify the current validated reference.');
const rosterPage = readText('src/content/docs/reference/weapon-roster.mdx');
assert.match(rosterPage, /Final Five/i, 'Final Five page must be present in authored content.');

console.log(`Verified ${registry.publicTerms.length} permanent public terms against ${sourceSha} (run ${validationRunId}, schema 2) and Final Five compatibility policy.`);
