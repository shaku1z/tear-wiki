import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { readCurrentReferenceFixture } from './current-reference-fixture.mjs';
import { validateGameReferenceArtifact } from './game-reference-contract.mjs';
import { verifyArtifactDirectory } from './store-game-reference.mjs';

const current = await readCurrentReferenceFixture();
const { sourceSha: SHA, runId: RUN, manifestSha256 } = current;
const bytes = { manifestBytes: current.manifestBytes, receiptBytes: current.receiptBytes };

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
  assert.equal(result.manifestSha256, manifestSha256);
});

test('keeps byte-hashed snapshots out of Windows text conversion', () => {
  const attributes = execFileSync('git', ['check-attr', 'text', '--', 'src/data/game-reference.v1.json', 'src/data/game-reference.v1.receipt.json'], { encoding: 'utf8' });
  assert.match(attributes, /game-reference\.v1\.json: text: unset/);
  assert.match(attributes, /game-reference\.v1\.receipt\.json: text: unset/);
  assert.equal(createHash('sha256').update(bytes.manifestBytes).digest('hex'), manifestSha256);
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

test('rejects collection omissions, incompleteness, malformed ids, duplicates, and broken references', () => {
  invalidManifest((manifest) => { delete manifest.collections.bosses; }, /collections\.bosses is required/);
  invalidManifest((manifest) => { manifest.collections.bosses.status = 'partial'; }, /bosses\.status/);
  invalidManifest((manifest) => { manifest.collections.bosses.items[1].id = 'warden'; }, /bosses ids must be unique/);
  invalidManifest((manifest) => { manifest.collections.bosses.items[1].id = 'Not Canonical'; }, /canonical content id/);
  invalidManifest((manifest) => { manifest.collections.stages.items[0].boss = 'missing'; }, /unknown boss/);
  invalidManifest((manifest) => { manifest.collections.bosses.items[0].stageId = 'undercroft'; }, /do not reference each other/);
  invalidManifest((manifest) => { manifest.roster.activeWeaponIds[0] = 'spear'; }, /active weapon ids/);
  invalidManifest((manifest) => { manifest.collections.enemies.items.affixes[0].color = ''; }, /enemy affix record is malformed/);
  invalidManifest((manifest) => { manifest.collections.enemies.items.presets[0].familyId = 'missing'; }, /unknown family/);
  invalidManifest((manifest) => { manifest.collections.enemies.items.presets[0].affixIds[0] = 'missing'; }, /unknown affix/);
});

test('accepts authenticated source-owned content growth without mirrored counts or ids', () => {
  const manifestBytes = mutatedManifest((manifest) => {
    manifest.collections.extraFutureCollection = { items: [], status: 'complete' };
    manifest.collections.achievements.items.splice(1, 0, { ...manifest.collections.achievements.items[0], id: 'future_biome_clear' });
    manifest.collections.stages.items.splice(1, 0, { ...manifest.collections.stages.items[0], id: 'future-biome', boss: 'future-boss' });
    manifest.collections.bosses.items.splice(1, 0, { ...manifest.collections.bosses.items[0], id: 'future-boss', stageId: 'future-biome' });
    manifest.collections.upgrades.items.push({ ...manifest.collections.upgrades.items[0], id: 'future_upgrade' });
    manifest.collections.enemies.items.families.push({ id: 'future-family', variants: [{ id: 'future-variant' }] });
    manifest.collections.enemies.items.affixes.push({ id: 'future-affix', color: '#ffffff' });
    manifest.collections.enemies.items.presets.push({ familyId: 'future-family', affixIds: ['future-affix'] });
    manifest.collections['public-tuning'].items.difficultyCatalog.push({ id: 'future-difficulty' });
  });
  assert.doesNotThrow(() => validateGameReferenceArtifact(valid({ manifestBytes, receiptBytes: receiptFor(manifestBytes) })));
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
