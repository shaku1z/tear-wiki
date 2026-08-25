import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyGameReferenceSnapshot } from './verify-game-reference-snapshot.mjs';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BUILD_PROVENANCE_RELATIVE_PATH = 'dist/_meta/tear-wiki-build-provenance.v1.json';
export const BUILD_PROVENANCE_FORMAT = 'tear-wiki-build-provenance.v1';
const SHA = /^[0-9a-f]{40}$/u;

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function canonicalJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function gitCommit(root) {
  let commit;
  try {
    commit = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    throw new Error(`cannot determine wiki git commit: ${error.message}`);
  }
  if (!SHA.test(commit)) throw new Error('wiki git commit must be a full lowercase SHA-1');
  return commit;
}

function expectedSha(value, label) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !SHA.test(value)) throw new Error(`${label} must be a full lowercase SHA-1`);
  return value;
}

/**
 * Computes the immutable build attestation from the checked-in reference
 * triplet. There is deliberately no timestamp: identical commit and source
 * bytes produce identical provenance bytes.
 */
export async function createBuildProvenance({
  root = DEFAULT_ROOT,
  expectedWikiCommit,
  expectedGameSourceSha,
} = {}) {
  const wikiCommit = gitCommit(root);
  const requiredWikiCommit = expectedSha(expectedWikiCommit, 'expected wiki commit');
  if (requiredWikiCommit !== undefined && requiredWikiCommit !== wikiCommit) {
    throw new Error(`wiki git commit ${wikiCommit} does not match expected ${requiredWikiCommit}`);
  }

  const dataDirectory = path.join(root, 'src', 'data');
  const manifestBytes = await readFile(path.join(dataDirectory, 'game-reference.v1.json'));
  const receiptBytes = await readFile(path.join(dataDirectory, 'game-reference.v1.receipt.json'));
  const registryBytes = await readFile(path.join(dataDirectory, 'wiki-terminology.json'));
  const { result } = await verifyGameReferenceSnapshot({ root });
  const sourceSha = result.manifest.source.sha;
  const requiredGameSha = expectedSha(expectedGameSourceSha, 'expected game source SHA');
  if (requiredGameSha !== undefined && requiredGameSha !== sourceSha) {
    throw new Error(`game reference source SHA ${sourceSha} does not match expected ${requiredGameSha}`);
  }

  const manifestSha256 = sha256(manifestBytes);
  const receiptSha256 = sha256(receiptBytes);
  const registrySha256 = sha256(registryBytes);
  assert.equal(manifestSha256, result.manifestSha256, 'manifest hash changed during provenance calculation');
  assert.equal(result.receipt.manifestSha256, manifestSha256, 'receipt does not bind the manifest bytes');

  return {
    format: BUILD_PROVENANCE_FORMAT,
    schemaVersion: 1,
    wiki: {
      repository: 'shaku1z/tear-wiki',
      commit: wikiCommit,
    },
    gameReference: {
      repository: result.receipt.repository,
      sourceSha,
      validationRunId: String(result.receipt.validationRunId),
      artifactName: result.receipt.artifactName,
      manifestFilename: result.receipt.manifestFilename,
      receiptFilename: result.receipt.receiptFilename,
      manifestSha256,
      receiptSha256,
      registrySha256,
      schemaVersion: result.manifest.schemaVersion,
      format: result.receipt.gameReferenceFormat,
      terminologyVersion: result.receipt.terminologyVersion,
    },
  };
}

export function provenanceBytes(provenance) {
  return Buffer.from(canonicalJson(provenance), 'utf8');
}

export async function writeBuildProvenance(options = {}) {
  const root = options.root ?? DEFAULT_ROOT;
  const provenance = await createBuildProvenance(options);
  const outputPath = path.join(root, BUILD_PROVENANCE_RELATIVE_PATH);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, provenanceBytes(provenance), { flag: 'w' });
  return { outputPath, provenance };
}

export async function readBuildProvenance({ root = DEFAULT_ROOT } = {}) {
  const outputPath = path.join(root, BUILD_PROVENANCE_RELATIVE_PATH);
  let bytes;
  try {
    bytes = await readFile(outputPath);
  } catch (error) {
    throw new Error(`build provenance is missing: ${error.message}`);
  }
  let value;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    throw new Error(`build provenance is invalid JSON: ${error.message}`);
  }
  return { bytes, value, outputPath };
}

export { DEFAULT_ROOT };
