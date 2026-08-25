import { fileURLToPath } from 'node:url';
import { join, normalize, resolve } from 'node:path';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { validateGameReferenceArtifact } from './game-reference-contract.mjs';

const MAX_BYTES = 1024 * 1024;
const MANIFEST = 'game-reference.v1.json';
const RECEIPT = 'game-reference.v1.receipt.json';

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
