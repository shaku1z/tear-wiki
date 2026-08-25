import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { validateGameReferenceArtifact } from './game-reference-contract.mjs';
import { verifyArtifactDirectory } from './store-game-reference.mjs';

const manifestPath = new URL('../src/data/game-reference.v1.json', import.meta.url);
const receiptPath = new URL('../src/data/game-reference.v1.receipt.json', import.meta.url);
const SHA = '9ddd8f20a9c7d1830a2e043d9e558e259f738d02';
const RUN = '32785864315';
const bytes = { manifestBytes: await readFile(manifestPath), receiptBytes: await readFile(receiptPath) };

function receiptFor(manifestBytes, mutate = (value) => value) {
  const receipt = JSON.parse(bytes.receiptBytes); mutate(receipt);
  receipt.manifestSha256 = createHash('sha256').update(manifestBytes).digest('hex');
  return Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
}
function mutatedManifest(mutate) {
  const manifest = JSON.parse(bytes.manifestBytes); mutate(manifest); return Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
}
function valid(overrides = {}) { return { ...bytes, expectedSha: SHA, expectedRunId: RUN, ...overrides }; }
function invalid(overrides) { assert.throws(() => validateGameReferenceArtifact(valid(overrides)), /Invalid game-reference artifact/); }
function invalidManifest(mutate, expectedPattern) {
  const manifestBytes = mutatedManifest(mutate);
  const receiptBytes = receiptFor(manifestBytes);
  assert.throws(() => validateGameReferenceArtifact(valid({ manifestBytes, receiptBytes })), expectedPattern);
}
async function temp(prefix, action) {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  try { return await action(directory); } finally { await rm(directory, { recursive: true, force: true }); }
}
async function artifactDirectory(directory, manifest = bytes.manifestBytes, receipt = bytes.receiptBytes) {
  await writeFile(join(directory, 'game-reference.v1.json'), manifest);
  await writeFile(join(directory, 'game-reference.v1.receipt.json'), receipt);
}

test('accepts the checked-in current artifact', () => {
  const result = validateGameReferenceArtifact(valid());
  assert.equal(result.manifestSha256, '7b8b3f5fec5862f3649470ab3e04170e096065c823b9349140bf9d688740311f');
});

test('keeps byte-hashed snapshots out of Windows text conversion', () => {
  const attributes = execFileSync('git', ['check-attr', 'text', '--', 'src/data/game-reference.v1.json', 'src/data/game-reference.v1.receipt.json'], { encoding: 'utf8' });
  assert.match(attributes, /game-reference\.v1\.json: text: unset/);
  assert.match(attributes, /game-reference\.v1\.receipt\.json: text: unset/);
  assert.equal(createHash('sha256').update(bytes.manifestBytes).digest('hex'), '7b8b3f5fec5862f3649470ab3e04170e096065c823b9349140bf9d688740311f');
});

test('accepts a future explicit run when receipt and argument agree', () => {
  const future = '987654321';
  invalid({ receiptBytes: receiptFor(bytes.manifestBytes, (receipt) => { receipt.validationRunId = future; }), expectedRunId: RUN });
  invalid({ receiptBytes: receiptFor(bytes.manifestBytes, (receipt) => { receipt.validationRunId = '01'; }) });
  invalid({ receiptBytes: receiptFor(bytes.manifestBytes, (receipt) => { receipt.validationRunId = '01'; }), expectedRunId: '01' });
  assert.doesNotThrow(() => validateGameReferenceArtifact(valid({ receiptBytes: receiptFor(bytes.manifestBytes, (receipt) => { receipt.validationRunId = future; }), expectedRunId: future })));
});

test('rejects wrong trust envelope values and digest', () => {
  invalid({ expectedSha: 'a'.repeat(40) });
  invalid({ expectedRunId: '01' });
  invalid({ receiptBytes: receiptFor(bytes.manifestBytes, (receipt) => { receipt.repository = 'wrong/repo'; }) });
  invalidManifest((manifest) => { manifest.schemaVersion = 3; }, /schema envelope/);
  invalidManifest((manifest) => { manifest.terminologyVersion = 'wrong'; }, /schema envelope/);
  const badDigest = JSON.parse(bytes.receiptBytes); badDigest.manifestSha256 = 'a'.repeat(64);
  invalid({ receiptBytes: Buffer.from(`${JSON.stringify(badDigest, null, 2)}\n`) });
});

test('rejects collection omissions, extras, incompleteness, and catalog drift', () => {
  invalidManifest((manifest) => { delete manifest.collections.bosses; }, /collections keys/);
  invalidManifest((manifest) => { manifest.collections.extra = {}; }, /collections keys/);
  invalidManifest((manifest) => { manifest.collections.bosses.status = 'partial'; }, /bosses\.status/);
  invalidManifest((manifest) => { manifest.collections.bosses.items[1].id = 'warden'; }, /bosses ids/);
  invalidManifest((manifest) => { manifest.collections.bosses.items.reverse(); }, /bosses ids/);
  invalidManifest((manifest) => { manifest.roster.activeWeaponIds[0] = 'spear'; }, /active weapon ids/);
  invalidManifest((manifest) => { manifest.collections.enemies.items.affixes[0].extra = true; }, /enemy affix record keys/);
  invalidManifest((manifest) => { manifest.collections.enemies.items.presets[0].familyId = ''; }, /enemy preset ids/);
});

test('offline directory verifier rejects extra files and symlinks where supported', async (t) => {
  await temp('tear-game-reference-test-', async (directory) => {
    await artifactDirectory(directory);
    const result = await verifyArtifactDirectory({ artifactDir: directory, sha: SHA, runId: RUN });
    assert.equal(result.result.manifest.source.sha, SHA);
    await writeFile(join(directory, 'extra'), 'x');
    await assert.rejects(() => verifyArtifactDirectory({ artifactDir: directory, sha: SHA, runId: RUN }), /exactly/);
  });
  await temp('tear-game-reference-link-', async (directory) => {
    const target = join(directory, 'target'); const alias = join(directory, 'alias');
    await mkdir(target); await artifactDirectory(target);
    try { await symlink(target, alias, 'junction'); } catch {
      try { await symlink(target, alias, 'dir'); } catch { t.skip('host does not permit test symlinks or junctions'); return; }
    }
    await assert.rejects(() => verifyArtifactDirectory({ artifactDir: alias, sha: SHA, runId: RUN }), /real directory|alias|symlink|junction/);
  });
});
