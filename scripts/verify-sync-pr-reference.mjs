import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { validateGameReferenceArtifact } from './game-reference-contract.mjs';
import { assertTerminologyRegistry } from './terminology-contract.mjs';
import { REFERENCE_PROMOTION_FILES } from './check-reference-promotion-state.mjs';

function fail(message) {
  throw new Error(`sync PR reference: ${message}`);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validSha(value, label) {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/.test(value)) fail(`${label} must be a full lowercase SHA`);
  return value;
}

function validRun(value) {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) fail('validation run must be a canonical positive integer');
  return value;
}

function exactFiles(files) {
  if (!Array.isArray(files) || files.length !== REFERENCE_PROMOTION_FILES.length) fail('PR file list must contain exactly the reference triplet');
  const paths = files.map((file) => typeof file === 'string' ? file : file?.path);
  const actual = [...paths].sort();
  const expected = [...REFERENCE_PROMOTION_FILES].sort();
  if (actual.some((path, index) => path !== expected[index])) fail('PR file list contains an unexpected or missing path');
}

export function assertSyncPrIdentity(pr, { expectedBranch, expectedHeadOid, expectedBase = 'main' } = {}) {
  if (!isRecord(pr)) fail('PR metadata must be an object');
  if (pr.baseRefName !== expectedBase || pr.headRefName !== expectedBranch) fail('PR base/head branch does not match the protected sync flow');
  const headOid = validSha(pr.headRefOid, 'PR headRefOid');
  if (expectedHeadOid !== undefined && headOid !== expectedHeadOid) fail('PR head does not match fetched branch HEAD');
  exactFiles(pr.files);
  return headOid;
}

export function assertSyncPrSnapshot({ manifestBytes, receiptBytes, registryBytes, expectedSha, expectedRunId }) {
  const result = validateGameReferenceArtifact({ manifestBytes, receiptBytes, expectedSha, expectedRunId });
  let registry;
  try { registry = JSON.parse(Buffer.from(registryBytes).toString('utf8')); } catch (error) { fail(`PR terminology registry is invalid JSON: ${error.message}`); }
  assertTerminologyRegistry(registry, result);
  return { result, registry, manifestSha256: createHash('sha256').update(manifestBytes).digest('hex') };
}

function gitShow(ref, file) {
  try { return execFileSync('git', ['show', `${ref}:${file}`], { encoding: 'buffer', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (error) { fail(`could not read ${file} from ${ref}: ${error.message}`); }
}

function main() {
  const branch = process.env.SYNC_PR_BRANCH;
  if (typeof branch !== 'string' || !/^codex\/sync-game-reference-[0-9a-f]{40}$/.test(branch)) fail('branch is not a canonical game-reference sync branch');
  const expectedSha = validSha(process.env.SYNC_GAME_SHA, 'game SHA');
  const expectedRunId = validRun(process.env.SYNC_VALIDATION_RUN_ID);
  let pr;
  try { pr = JSON.parse(process.env.SYNC_PR_JSON ?? ''); } catch (error) { fail(`PR metadata is invalid JSON: ${error.message}`); }
  const ref = `refs/remotes/origin/${branch}`;
  let headOid;
  try { headOid = execFileSync('git', ['rev-parse', ref], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch (error) { fail(`fetched PR branch is unavailable: ${error.message}`); }
  validSha(headOid, 'fetched PR branch HEAD');
  assertSyncPrIdentity(pr, { expectedBranch: branch, expectedHeadOid: headOid });
  const verified = assertSyncPrSnapshot({
    manifestBytes: gitShow(ref, REFERENCE_PROMOTION_FILES[0]),
    receiptBytes: gitShow(ref, REFERENCE_PROMOTION_FILES[1]),
    registryBytes: gitShow(ref, REFERENCE_PROMOTION_FILES[2]),
    expectedSha,
    expectedRunId,
  });
  console.log(`sync_pr_valid=true\nsource_sha=${verified.result.manifest.source.sha}\nvalidation_run_id=${verified.result.receipt.validationRunId}`);
}

if (process.argv[1]?.endsWith('verify-sync-pr-reference.mjs')) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
