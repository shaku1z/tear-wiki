import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateGameReferenceArtifact } from './game-reference-contract.mjs';
import { assertTerminologyRegistry, snapshotBinding } from './terminology-contract.mjs';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const readJson = (root, relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const readBytes = (root, relativePath) => fs.readFileSync(path.join(root, relativePath));
const readText = (root, relativePath) => readBytes(root, relativePath).toString('utf8');

const LEGACY_FILES = [
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

function scanDeprecatedCopy(root, registry) {
  const legacyAliases = registry.publicTerms.flatMap((term) => term.deprecatedCopyAliases ?? term.deprecatedAliases);
  const deprecatedPatterns = [...legacyAliases, ...registry.activeRoster.retiredIds];
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
      const pattern = new RegExp(`(?<![\\w-])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`, 'i');
      if (pattern.test(contents)) hits.push(`${relativePath}: ${alias}`);
    }
  }
  assert.deepEqual(hits, [], `Deprecated names leaked into active wiki source:\n${hits.join('\n')}`);
}

export function verifyTerminology({ root = DEFAULT_ROOT } = {}) {
  const registry = readJson(root, 'src/data/wiki-terminology.json');
  const binding = snapshotBinding(registry);
  const manifestBytes = readBytes(root, 'src/data/game-reference.v1.json');
  const receiptBytes = readBytes(root, 'src/data/game-reference.v1.receipt.json');
  const current = validateGameReferenceArtifact({
    manifestBytes,
    receiptBytes,
    expectedSha: binding.sourceSha,
    expectedRunId: String(binding.validationRunId),
  });
  assertTerminologyRegistry(registry, current);
  assert.equal(current.manifestSha256, binding.manifestSha256, 'Current game-reference manifest hash changed unexpectedly.');
  for (const relativePath of LEGACY_FILES) assert.equal(fs.existsSync(path.join(root, relativePath)), false, `Obsolete legacy path remains: ${relativePath}`);

  scanDeprecatedCopy(root, registry);
  const terminologyPage = readText(root, 'src/content/docs/reference/terminology.mdx');
  assert.match(terminologyPage, /explicit compatibility reference/i, 'Compatibility page must state its historical/migration scope.');
  assert.match(terminologyPage, /validated game-reference artifact/i, 'Compatibility page must identify the current validated reference.');
  const rosterPage = readText(root, 'src/content/docs/reference/weapon-roster.mdx');
  assert.match(rosterPage, /Final Five/i, 'Final Five page must be present in authored content.');

  console.log(`Verified ${registry.publicTerms.length} permanent public terms against ${binding.sourceSha} (run ${binding.validationRunId}, schema ${binding.manifestSchemaVersion}) and Final Five compatibility policy.`);
  return { registry, current };
}

const invokedPath = process.argv[1] === undefined ? '' : path.resolve(process.argv[1]);
if (invokedPath === path.resolve(fileURLToPath(import.meta.url))) verifyTerminology();
