import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join, normalize, resolve } from 'node:path';
import { lstat, readFile, readdir, realpath, rename, unlink, writeFile } from 'node:fs/promises';
import { validateGameReferenceArtifact } from './game-reference-contract.mjs';

const MAX_BYTES = 1024 * 1024;
const MANIFEST = 'game-reference.v1.json';
const RECEIPT = 'game-reference.v1.receipt.json';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) { throw new Error(`game-reference store: ${message}`); }
function samePath(left, right) {
  const normalizeCase = process.platform === 'win32' ? (path) => normalize(path).toLowerCase() : normalize;
  return normalizeCase(left) === normalizeCase(right);
}

async function realDirectory(path, label) {
  const absolute = resolve(path);
  let entry;
  try { entry = await lstat(absolute); } catch { fail(`${label} does not exist`); }
  if (!entry.isDirectory() || entry.isSymbolicLink()) fail(`${label} must be a real directory`);
  const canonical = await realpath(absolute);
  if (!samePath(absolute, canonical)) fail(`${label} must not use an alias, symlink, or junction`);
  return canonical;
}

async function regularFile(path, label) {
  let entry;
  try { entry = await lstat(path); } catch { fail(`${label} does not exist`); }
  if (!entry.isFile() || entry.isSymbolicLink()) fail(`${label} must be a regular non-symlink file`);
  if (entry.size === 0 || entry.size > MAX_BYTES) fail(`${label} must be nonempty and at most 1 MiB`);
  return entry;
}

async function artifactBytes(artifactDir) {
  const directory = await realDirectory(artifactDir, 'artifact directory');
  const entries = await readdir(directory);
  if (entries.length !== 2 || entries.some((name) => name !== MANIFEST && name !== RECEIPT)) fail('artifact directory must contain exactly the two reference files');
  const manifestPath = join(directory, MANIFEST);
  const receiptPath = join(directory, RECEIPT);
  await regularFile(manifestPath, MANIFEST);
  await regularFile(receiptPath, RECEIPT);
  return { manifestBytes: await readFile(manifestPath), receiptBytes: await readFile(receiptPath) };
}

async function destination(path) {
  try {
    const entry = await lstat(path);
    if (!entry.isFile() || entry.isSymbolicLink()) fail(`${basename(path)} destination must be a regular non-symlink file`);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function uniquePath(directory, stem) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const path = join(directory, `.${stem}.${process.pid}.${randomBytes(8).toString('hex')}`);
    try { await lstat(path); } catch (error) { if (error?.code === 'ENOENT') return path; throw error; }
  }
  fail('could not allocate a unique temporary path');
}

async function removeExact(path) {
  try { await unlink(path); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
}

/** Stores already-validated bytes transactionally. replaceFile is injectable only for fault-injection tests. */
export async function storeGameReference({ manifestBytes, receiptBytes, dataDirectory = join(ROOT, 'src', 'data'), replaceFile = rename }) {
  if (samePath(resolve(dataDirectory), join(ROOT, 'src', 'data'))) {
    await realDirectory(ROOT, 'wiki root');
    await realDirectory(join(ROOT, 'src'), 'wiki src directory');
  }
  const data = await realDirectory(dataDirectory, 'wiki src/data directory');
  const manifestDestination = join(data, MANIFEST);
  const receiptDestination = join(data, RECEIPT);
  const hadManifest = await destination(manifestDestination);
  const hadReceipt = await destination(receiptDestination);
  const tempManifest = await uniquePath(data, `${MANIFEST}.tmp`);
  const tempReceipt = await uniquePath(data, `${RECEIPT}.tmp`);
  const backupManifest = await uniquePath(data, `${MANIFEST}.bak`);
  const backupReceipt = await uniquePath(data, `${RECEIPT}.bak`);
  let manifestBackedUp = false, receiptBackedUp = false, manifestInstalled = false, receiptInstalled = false, rollbackFailed = false;
  try {
    await writeFile(tempManifest, manifestBytes, { flag: 'wx' });
    await writeFile(tempReceipt, receiptBytes, { flag: 'wx' });
    if (hadManifest) { await replaceFile(manifestDestination, backupManifest); manifestBackedUp = true; }
    await replaceFile(tempManifest, manifestDestination); manifestInstalled = true;
    if (hadReceipt) { await replaceFile(receiptDestination, backupReceipt); receiptBackedUp = true; }
    await replaceFile(tempReceipt, receiptDestination); receiptInstalled = true;
    if (manifestBackedUp) await removeExact(backupManifest);
    if (receiptBackedUp) await removeExact(backupReceipt);
  } catch (error) {
    try {
      if (receiptInstalled) await removeExact(receiptDestination);
      if (receiptBackedUp) await replaceFile(backupReceipt, receiptDestination);
      if (manifestInstalled) await removeExact(manifestDestination);
      if (manifestBackedUp) await replaceFile(backupManifest, manifestDestination);
    } catch (rollbackError) {
      rollbackFailed = true;
      throw new AggregateError([error, rollbackError], 'game-reference store and rollback both failed');
    }
    throw error;
  } finally {
    const disposable = rollbackFailed ? [tempManifest, tempReceipt] : [tempManifest, tempReceipt, backupManifest, backupReceipt];
    await Promise.all(disposable.map(removeExact));
  }
}

export async function verifyArtifactDirectory({ artifactDir, sha, runId }) {
  const bytes = await artifactBytes(artifactDir);
  const result = validateGameReferenceArtifact({ ...bytes, expectedSha: sha, expectedRunId: runId });
  return { ...bytes, result };
}

function parseArgs(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === '--write') fail('--write is not accepted by this CLI; use the canonical sync wrapper');
    if (!['--artifact-dir', '--sha', '--run-id'].includes(flag) || values.has(flag) || index + 1 === args.length || args[index + 1].startsWith('--')) fail(`invalid CLI argument ${flag}`);
    values.set(flag, args[index + 1]); index += 1;
  }
  for (const flag of ['--artifact-dir', '--sha', '--run-id']) if (!values.has(flag)) fail(`missing ${flag}`);
  if (!/^[0-9a-f]{40}$/.test(values.get('--sha'))) fail('--sha must be a 40-character lowercase SHA');
  if (!/^[1-9][0-9]*$/.test(values.get('--run-id'))) fail('--run-id must be a canonical positive integer string');
  return { artifactDir: values.get('--artifact-dir'), sha: values.get('--sha'), runId: values.get('--run-id') };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { result } = await verifyArtifactDirectory(options);
  console.log(`game-reference verified: ${result.manifest.source.sha.slice(0, 12)} (${result.manifestSha256.slice(0, 12)})`);
}

if (process.argv[1] && samePath(resolve(process.argv[1]), fileURLToPath(import.meta.url))) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
