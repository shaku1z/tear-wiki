import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { lstat, readFile, realpath, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateGameReferenceArtifact } from './game-reference-contract.mjs';
import { assertTerminologyRegistry, registryForArtifact, snapshotBinding } from './terminology-contract.mjs';

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = 'game-reference.v1.json';
const RECEIPT = 'game-reference.v1.receipt.json';
const REGISTRY = 'wiki-terminology.json';

function samePath(left, right) {
  const normalizeCase = process.platform === 'win32' ? (value) => normalize(value).toLowerCase() : normalize;
  return normalizeCase(left) === normalizeCase(right);
}

async function realDirectory(directory, root) {
  const absolute = resolve(directory);
  const rootAbsolute = resolve(root);
  if (!samePath(absolute, resolve(rootAbsolute, 'src', 'data'))) throw new Error('promotion data directory must be the repository src/data directory');
  let entry;
  try { entry = await lstat(absolute); } catch { throw new Error(`promotion data directory does not exist: ${absolute}`); }
  if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error('promotion data directory must be a real directory');
  let canonical;
  try { canonical = await realpath(absolute); } catch { throw new Error('promotion data directory realpath could not be verified'); }
  if (!samePath(absolute, canonical)) throw new Error('promotion data directory must not be an alias, symlink, or junction');
  const rootCanonical = await realpath(rootAbsolute);
  const escaped = relative(rootCanonical, canonical);
  if (escaped === '..' || escaped.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(escaped)) throw new Error('promotion data directory escapes the repository root');
  return canonical;
}

async function regularFile(filePath, label) {
  let entry;
  try { entry = await lstat(filePath); } catch { throw new Error(`${label} does not exist`); }
  if (!entry.isFile() || entry.isSymbolicLink()) throw new Error(`${label} must be a regular non-symlink file`);
  const canonical = await realpath(filePath);
  if (!samePath(canonical, filePath)) throw new Error(`${label} must not be an alias, symlink, or junction`);
  return entry;
}

function tempPath(directory, name, suffix) {
  return join(directory, `.${name}.${suffix}.${process.pid}.${randomBytes(8).toString('hex')}`);
}

async function removeExact(filePath) {
  try { await unlink(filePath); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
}

function parseRegistry(bytes) {
  try { return JSON.parse(bytes.toString('utf8')); } catch (error) { throw new Error(`terminology registry is invalid JSON: ${error.message}`); }
}

function registryBytes(registry) {
  return Buffer.from(`${JSON.stringify(registry, null, 2)}\n`, 'utf8');
}

async function verifyInstalled({ targets, expectedBytes, expectedSha, expectedRunId, expectedRegistry }) {
  const installedManifestBytes = await readFile(targets[0].path);
  const installedReceiptBytes = await readFile(targets[1].path);
  const installedRegistry = parseRegistry(await readFile(targets[2].path));
  assert.deepEqual(installedManifestBytes, expectedBytes[0], 'installed manifest bytes changed during promotion');
  assert.deepEqual(installedReceiptBytes, expectedBytes[1], 'installed receipt bytes changed during promotion');
  assert.deepEqual(installedRegistry, expectedRegistry, 'installed terminology registry changed during promotion');
  const installed = validateGameReferenceArtifact({
    manifestBytes: installedManifestBytes,
    receiptBytes: installedReceiptBytes,
    expectedSha,
    expectedRunId,
  });
  assertTerminologyRegistry(installedRegistry, installed);
}

async function rollback({ targets, backups, installed, backedUp, replaceFile }) {
  const errors = [];
  for (const index of [...installed].sort((left, right) => right - left)) {
    try { await removeExact(targets[index].path); } catch (error) { errors.push(error); }
  }
  for (const index of [...backedUp].sort((left, right) => right - left)) {
    try {
      await removeExact(targets[index].path);
      await replaceFile(backups[index], targets[index].path);
    } catch (error) { errors.push(error); }
  }
  return errors;
}

/**
 * Promotes one externally authenticated artifact as a three-file transaction.
 * The old manifest, receipt, and registry bytes are restored if installation
 * fails. This is rollback-transactional, not crash-atomic.
 */
export async function promoteGameReference({
  manifestBytes,
  receiptBytes,
  expectedSha,
  expectedRunId,
  root = DEFAULT_ROOT,
  dataDirectory = join(root, 'src', 'data'),
  replaceFile = rename,
} = {}) {
  // These values are external trust inputs from the canonical custody/artifact
  // flow. Never derive them from the checked-in registry before validation.
  const incoming = validateGameReferenceArtifact({ manifestBytes, receiptBytes, expectedSha, expectedRunId });
  const data = await realDirectory(dataDirectory, root);
  const targets = [MANIFEST, RECEIPT, REGISTRY].map((name) => ({ name, path: join(data, name) }));
  for (const target of targets) await regularFile(target.path, target.name);

  const currentManifestBytes = await readFile(targets[0].path);
  const currentReceiptBytes = await readFile(targets[1].path);
  const currentRegistryBytes = await readFile(targets[2].path);
  const currentRegistry = parseRegistry(currentRegistryBytes);
  const currentBinding = snapshotBinding(currentRegistry);
  const current = validateGameReferenceArtifact({
    manifestBytes: currentManifestBytes,
    receiptBytes: currentReceiptBytes,
    expectedSha: currentBinding.sourceSha,
    expectedRunId: String(currentBinding.validationRunId),
  });
  assertTerminologyRegistry(currentRegistry, current);
  const nextRegistry = registryForArtifact(currentRegistry, incoming);
  const nextRegistryBytes = registryBytes(nextRegistry);
  const next = [
    Buffer.from(manifestBytes),
    Buffer.from(receiptBytes),
    nextRegistryBytes,
  ];
  const temporary = targets.map((target) => tempPath(data, target.name, 'tmp'));
  const backups = targets.map((target) => tempPath(data, target.name, 'bak'));
  const installed = new Set();
  const backedUp = new Set();
  let committed = false;
  try {
    for (let index = 0; index < targets.length; index += 1) await writeFile(temporary[index], next[index], { flag: 'wx' });
    for (let index = 0; index < targets.length; index += 1) {
      await replaceFile(targets[index].path, backups[index]);
      backedUp.add(index);
    }
    for (let index = 0; index < targets.length; index += 1) {
      await replaceFile(temporary[index], targets[index].path);
      installed.add(index);
    }
    await verifyInstalled({ targets, expectedBytes: next, expectedSha, expectedRunId, expectedRegistry: nextRegistry });
    committed = true;
  } catch (error) {
    const rollbackErrors = await rollback({ targets, backups, installed, backedUp, replaceFile });
    if (rollbackErrors.length > 0) throw new AggregateError([error, ...rollbackErrors], 'game-reference promotion and rollback both failed');
    throw error;
  } finally {
    for (const filePath of temporary) await removeExact(filePath);
    if (!committed) for (const filePath of backups) await removeExact(filePath);
  }
  for (const filePath of backups) await removeExact(filePath);
  return { result: incoming, registry: nextRegistry, files: targets.map((target) => target.path) };
}
