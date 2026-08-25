import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateGameReferenceArtifact } from './game-reference-contract.mjs';

const root = new URL('../src/data/', import.meta.url);
const manifestBytes = await readFile(new URL('game-reference.v1.json', root));
const receiptBytes = await readFile(new URL('game-reference.v1.receipt.json', root));
const receipt = JSON.parse(receiptBytes.toString('utf8'));
const expectedSha = '9ddd8f20a9c7d1830a2e043d9e558e259f738d02';
const expectedRunId = '32785864315';
const expectedManifestSha256 = '7b8b3f5fec5862f3649470ab3e04170e096065c823b9349140bf9d688740311f';

const result = validateGameReferenceArtifact({
  manifestBytes,
  receiptBytes,
  expectedSha,
  expectedRunId,
});

assert.equal(result.manifestSha256, expectedManifestSha256, 'Checked-in game-reference manifest hash changed unexpectedly.');
assert.equal(createHash('sha256').update(manifestBytes).digest('hex'), expectedManifestSha256, 'Manifest bytes do not match the pinned hash.');
assert.equal(result.manifest.source.sha, expectedSha, 'Checked-in source SHA changed unexpectedly.');
assert.equal(result.receipt.sourceSha, expectedSha, 'Checked-in receipt source SHA changed unexpectedly.');
assert.equal(result.receipt.validationRunId, expectedRunId, 'Checked-in validation run changed unexpectedly.');
assert.deepEqual(result.manifest.roster.activeWeaponIds, ['sword', 'hammer', 'greatsword', 'chainblade', 'riftlock'], 'Final Five roster changed.');
assert.deepEqual(result.manifest.roster.retiredWeaponIds, ['spear', 'ringblade'], 'Retired weapon roster changed.');

console.log(`Verified current game-reference snapshot ${expectedSha} (run ${expectedRunId}, schema ${result.manifest.schemaVersion}, SHA-256 ${expectedManifestSha256}).`);
