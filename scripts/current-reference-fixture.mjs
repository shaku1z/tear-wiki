import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateGameReferenceArtifact } from './game-reference-contract.mjs';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Load the checked-in reference triplet's two byte-hashed files and validate
 * them before exposing values to a fixture. Tests must follow the current
 * promoted source/run rather than pinning a historical release, but they must
 * still fail if the checked-in receipt or manifest is malformed.
 */
export async function readCurrentReferenceFixture({ root = DEFAULT_ROOT } = {}) {
  const dataDirectory = path.join(root, 'src', 'data');
  const manifestBytes = await readFile(path.join(dataDirectory, 'game-reference.v1.json'));
  const receiptBytes = await readFile(path.join(dataDirectory, 'game-reference.v1.receipt.json'));
  let receipt;
  try {
    receipt = JSON.parse(receiptBytes.toString('utf8'));
  } catch (error) {
    throw new Error(`current reference receipt is invalid JSON: ${error.message}`);
  }
  assert.match(receipt?.sourceSha ?? '', /^[0-9a-f]{40}$/u, 'current reference receipt source SHA is invalid');
  assert.match(String(receipt?.validationRunId ?? ''), /^[1-9][0-9]*$/u, 'current reference receipt validation run is invalid');
  const result = validateGameReferenceArtifact({
    manifestBytes,
    receiptBytes,
    expectedSha: receipt.sourceSha,
    expectedRunId: String(receipt.validationRunId),
  });
  assert.equal(result.manifest.source.sha, receipt.sourceSha, 'current reference manifest source SHA is not receipt-bound');
  assert.equal(String(result.receipt.validationRunId), String(receipt.validationRunId), 'current reference run is not receipt-bound');
  return {
    manifestBytes,
    receiptBytes,
    sourceSha: result.manifest.source.sha,
    runId: String(result.receipt.validationRunId),
    manifestSha256: result.manifestSha256,
    result,
  };
}
