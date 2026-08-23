import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import registry from '../src/data/wiki-terminology.json' with { type: 'json' };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));

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

assert.equal(registry.schemaVersion, 1, 'Unsupported wiki terminology schema.');
assert.equal(registry.registryId, 'g4-wiki-terminology-v1', 'Unexpected terminology registry.');
assert.equal(registry.status, 'governance-only', 'G4 terminology must remain governance-only.');
assert.deepEqual(registry.publicTerms.map((term) => term.displayName), expectedNames, 'Permanent public term order changed.');
assert.equal(new Set(registry.publicTerms.map((term) => term.id)).size, registry.publicTerms.length, 'Public term IDs must be unique.');
assert.equal(registry.publicTerms.find((term) => term.id === 'tearbench').unchanged, true, 'TearBench must remain unchanged.');

const roster = registry.activeRoster;
assert.equal(roster.schemaVersion, 'final-five-v1', 'Unexpected Final Five schema.');
assert.deepEqual(roster.canonicalIds, ['sword', 'hammer', 'greatsword', 'chainblade', 'riftlock'], 'Final Five IDs must stay ordered.');
assert.deepEqual(roster.canonicalDisplayNames, ['Sword', 'Hammer', 'Greatsword', 'Chainblade', 'Riftlock'], 'Final Five display names must stay ordered.');
assert.deepEqual(roster.retiredIds, ['spear', 'ringblade'], 'Only Spear and Ringblade are retired IDs.');
assert.deepEqual(roster.migrationMap, { spear: 'greatsword', ringblade: 'riftlock' }, 'Retired weapon migration map changed.');

const source = readJson('src/scripts/game-source.json');
const manifest = readJson('src/data/game-manifest.json');
assert.equal(source.commit, registry.snapshot.commit, 'Terminology receipt must describe the retained source commit.');
assert.equal(manifest.source.commit, registry.snapshot.commit, 'Terminology receipt must not silently move the generated snapshot.');
assert.equal(registry.snapshot.freshness, 'retained', 'G4 must describe the snapshot as retained.');
assert.equal(registry.snapshot.refreshOwner, 'G6 typed game-reference synchronization', 'G6 must own the future sync replacement.');

// Generic words such as "Signal" remain valid gameplay vocabulary; only
// configured deprecated copy phrases are scanned in authored public source.
const legacyAliases = registry.publicTerms.flatMap((term) => term.deprecatedCopyAliases ?? term.deprecatedAliases);
const legacyWeaponIds = roster.retiredIds;
const deprecatedPatterns = [...legacyAliases, ...legacyWeaponIds];
const scanRoots = ['src/content', 'src/components', 'src/pages', 'src/content.config.ts', 'astro.config.mjs', 'public/admin'];
const ignored = new Set([
  'src/data/wiki-terminology.json',
  'src/data/game-manifest.json',
  'src/scripts/game-engine.js',
  'src/scripts/game-config.js',
  'src/scripts/game-source.json',
]);
const files = [];
const walk = (relativePath) => {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return;
  const stat = fs.statSync(absolutePath);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(absolutePath)) walk(path.join(relativePath, entry));
    return;
  }
  if (/\.(astro|md|mdx|ts|tsx|svelte|html|yml|yaml|json)$/i.test(relativePath) && !ignored.has(relativePath.replaceAll('\\', '/'))) files.push(relativePath);
};
for (const scanRoot of scanRoots) walk(scanRoot);

const hits = [];
for (const relativePath of files) {
  const contents = fs.readFileSync(path.join(root, relativePath), 'utf8');
  for (const alias of deprecatedPatterns) {
    const pattern = new RegExp(`(?<![\\w-])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`, 'i');
    if (pattern.test(contents)) hits.push(`${relativePath}: ${alias}`);
  }
}
assert.deepEqual(hits, [], `Deprecated names leaked into active wiki source:\n${hits.join('\n')}`);

const terminologyPage = fs.readFileSync(path.join(root, 'src/content/docs/reference/terminology.mdx'), 'utf8');
assert.match(terminologyPage, /explicit compatibility reference/i, 'Compatibility page must state its historical/migration scope.');
const rosterPage = fs.readFileSync(path.join(root, 'src/content/docs/reference/weapon-roster.mdx'), 'utf8');
assert.match(rosterPage, /Final Five/i, 'Final Five page must be present in authored content.');

console.log(`Verified ${registry.publicTerms.length} permanent public terms, retained snapshot ${registry.snapshot.commit}, and Final Five compatibility policy.`);
