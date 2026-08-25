import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateGameReferenceArtifact } from './game-reference-contract.mjs';
import { assertTerminologyRegistry, snapshotBinding } from './terminology-contract.mjs';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = 'game-reference.v1.json';
const RECEIPT = 'game-reference.v1.receipt.json';
const REGISTRY = 'wiki-terminology.json';

export async function verifyGameReferenceSnapshot({ root = DEFAULT_ROOT } = {}) {
  const dataDirectory = path.join(root, 'src', 'data');
  const manifestBytes = await readFile(path.join(dataDirectory, MANIFEST));
  const receiptBytes = await readFile(path.join(dataDirectory, RECEIPT));
  const registry = JSON.parse((await readFile(path.join(dataDirectory, REGISTRY))).toString('utf8'));
  const binding = snapshotBinding(registry);
  const result = validateGameReferenceArtifact({
    manifestBytes,
    receiptBytes,
    expectedSha: binding.sourceSha,
    expectedRunId: String(binding.validationRunId),
  });

  assertTerminologyRegistry(registry, result);
  assert.equal(result.manifestSha256, binding.manifestSha256, 'Checked-in game-reference manifest hash changed unexpectedly.');
  assert.equal(createHash('sha256').update(manifestBytes).digest('hex'), binding.manifestSha256, 'Manifest bytes do not match the registry hash.');
  assert.equal(result.manifest.source.sha, binding.sourceSha, 'Checked-in source SHA diverged from the registry.');
  assert.equal(result.receipt.sourceSha, binding.sourceSha, 'Checked-in receipt source SHA diverged from the registry.');
  assert.equal(String(result.receipt.validationRunId), String(binding.validationRunId), 'Checked-in validation run diverged from the registry.');
  return { registry, result };
}

const invokedPath = process.argv[1] === undefined ? '' : path.resolve(process.argv[1]);
if (invokedPath === path.resolve(fileURLToPath(import.meta.url))) {
  const { result } = await verifyGameReferenceSnapshot();
  console.log(`Verified current game-reference snapshot ${result.manifest.source.sha} (run ${result.receipt.validationRunId}, schema ${result.manifest.schemaVersion}, SHA-256 ${result.manifestSha256}).`);
}
