import yauzl from 'yauzl';
import { promisify } from 'node:util';
import { validateGameReferenceArtifact } from './game-reference-contract.mjs';
import { storeGameReference } from './store-game-reference.mjs';

const openZip = promisify(yauzl.fromBuffer);
const REPOSITORY = 'shaku1z/tear';
const WORKFLOW = 'Validate';
const WORKFLOW_ID = 322540049;
const WORKFLOW_PATH = '.github/workflows/ci.yml';
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_ZIP_BYTES = 4 * 1024 * 1024;
const FILES = new Set(['game-reference.v1.json', 'game-reference.v1.receipt.json']);

function fail(message) { throw new Error(`game-reference fetch: ${message}`); }
function validSha(value) { return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value); }
function validRun(value) { return typeof value === 'string' && /^[1-9][0-9]*$/.test(value); }
function headers(token, accept = 'application/vnd.github+json') {
  return { Accept: accept, 'X-GitHub-Api-Version': '2022-11-28', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
function safeDownloadRedirect(location, base) {
  let target;
  try { target = new URL(location, base); } catch { fail('artifact download redirect is invalid'); }
  const allowed = target.protocol === 'https:' && (target.hostname.endsWith('.blob.core.windows.net') || target.hostname === 'pipelines.actions.githubusercontent.com' || target.hostname.endsWith('.actions.githubusercontent.com'));
  if (!allowed) fail('artifact download redirect is not an approved storage host');
  return target.href;
}
async function responseJson(response, label) {
  if (!response?.ok) fail(`${label} request failed (${response?.status ?? 'network'})`);
  try { return await response.json(); } catch { fail(`${label} response was not JSON`); }
}
async function responseBytes(response) {
  if (!response?.ok) fail(`artifact download failed (${response?.status ?? 'network'})`);
  const length = response.headers?.get?.('content-length');
  if (length !== null && length !== undefined && (!/^[0-9]+$/.test(length) || Number(length) > MAX_ZIP_BYTES)) fail('artifact ZIP exceeds size limit');
  let bytes;
  if (response.body?.getReader) {
    const reader = response.body.getReader(); const chunks = []; let size = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > MAX_ZIP_BYTES) { await reader.cancel(); fail('artifact ZIP exceeds size limit'); } chunks.push(Buffer.from(value)); }
    bytes = Buffer.concat(chunks);
  } else bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_ZIP_BYTES) fail('artifact ZIP exceeds size limit');
  return Buffer.from(bytes);
}
async function downloadZip(fetchImpl, url, token) {
  const initial = await fetchImpl(url, { headers: headers(token), redirect: 'manual' });
  if (![301, 302, 303, 307, 308].includes(initial.status)) return responseBytes(initial);
  const location = initial.headers?.get?.('location');
  if (!location) fail('artifact download redirect has no location');
  const target = safeDownloadRedirect(location, url);
  // The storage redirect deliberately receives no GitHub credential.
  return responseBytes(await fetchImpl(target, { headers: { Accept: 'application/octet-stream' }, redirect: 'error' }));
}
function sameId(left, right) { return String(left) === String(right); }
function regularEntry(entry) {
  const unixType = (entry.externalFileAttributes >>> 16) & 0o170000;
  const msDosDirectory = (entry.externalFileAttributes & 0x10) !== 0;
  return !entry.fileName.endsWith('/') && !msDosDirectory && unixType !== 0o120000 && (unixType === 0 || unixType === 0o100000);
}
function safeName(name) {
  return typeof name === 'string' && !name.includes('\\') && !name.startsWith('/') && !/^[A-Za-z]:/.test(name) && !name.split('/').includes('..') && FILES.has(name);
}
function readEntry(zip, entry) {
  return new Promise((resolve, reject) => zip.openReadStream(entry, (error, stream) => {
    if (error) return reject(error);
    const chunks = []; let size = 0;
    stream.on('data', (chunk) => { size += chunk.length; if (size > MAX_FILE_BYTES) stream.destroy(new Error('artifact file exceeds size limit')); else chunks.push(chunk); });
    stream.once('error', reject);
    stream.once('end', () => resolve(Buffer.concat(chunks)));
  }));
}

/** Rejects every archive member except the two regular artifact files before extraction. */
export async function extractArtifactZip(zipBytes) {
  if (!(zipBytes instanceof Uint8Array) || zipBytes.length === 0 || zipBytes.length > MAX_ZIP_BYTES) fail('artifact ZIP exceeds size limit');
  let zip;
  try { zip = await openZip(Buffer.from(zipBytes), { autoClose: false, lazyEntries: true, validateEntrySizes: true, strictFileNames: true }); } catch { fail('artifact ZIP is invalid'); }
  const entries = [];
  try {
    await new Promise((resolve, reject) => {
      zip.once('error', reject); zip.once('end', resolve);
      zip.on('entry', (entry) => { entries.push(entry); zip.readEntry(); }); zip.readEntry();
    });
    if (entries.length !== 2) fail('artifact ZIP must contain exactly two files');
    const found = new Map();
    for (const entry of entries) {
      if (!safeName(entry.fileName) || !regularEntry(entry) || entry.generalPurposeBitFlag & 1 || ![0, 8].includes(entry.compressionMethod) || entry.uncompressedSize === 0 || entry.uncompressedSize > MAX_FILE_BYTES || entry.compressedSize > MAX_FILE_BYTES || found.has(entry.fileName)) fail('artifact ZIP has an unsafe entry');
      found.set(entry.fileName, entry);
    }
    if (found.size !== 2 || [...FILES].some((name) => !found.has(name))) fail('artifact ZIP is missing required files');
    const manifestBytes = await readEntry(zip, found.get('game-reference.v1.json'));
    const receiptBytes = await readEntry(zip, found.get('game-reference.v1.receipt.json'));
    return { manifestBytes, receiptBytes };
  } catch (error) { if (error.message.startsWith('game-reference fetch:')) throw error; fail(error.message || 'artifact ZIP extraction failed'); } finally { zip.close(); }
}

export async function fetchGameReferenceArtifact({ sha, runId, token = process.env.GAME_REFERENCE_GITHUB_TOKEN ?? process.env.GITHUB_TOKEN, fetchImpl = globalThis.fetch }) {
  if (!validSha(sha)) fail('sha must be a 40-character lowercase SHA');
  if (!validRun(runId)) fail('run-id must be a canonical positive integer string');
  if (typeof token !== 'string' || token.length === 0) fail('a GitHub token is required');
  if (typeof fetchImpl !== 'function') fail('fetch implementation is required');
  const api = `https://api.github.com/repos/${REPOSITORY}`;
  const run = await responseJson(await fetchImpl(`${api}/actions/runs/${runId}`, { headers: headers(token) }), 'workflow run');
  if (!sameId(run.id, runId) || run.name !== WORKFLOW || run.workflow_id !== WORKFLOW_ID || run.path !== WORKFLOW_PATH || (run.workflow_name != null && run.workflow_name !== WORKFLOW) || run.status !== 'completed' || run.conclusion !== 'success' || run.event !== 'push' || run.head_branch !== 'main' || run.head_sha !== sha || run.repository?.full_name !== REPOSITORY || run.head_repository?.full_name !== REPOSITORY) fail('workflow run provenance does not match');
  const payload = await responseJson(await fetchImpl(`${api}/actions/runs/${runId}/artifacts?per_page=100`, { headers: headers(token) }), 'artifact list');
  if (!Array.isArray(payload.artifacts)) fail('artifact list is malformed');
  const name = `tear-game-reference-v1-${sha}`;
  const artifacts = payload.artifacts.filter((artifact) => artifact?.name === name && artifact.expired === false && sameId(artifact.workflow_run?.id, runId) && artifact.workflow_run?.head_branch === 'main' && artifact.workflow_run?.head_sha === sha && Number.isSafeInteger(artifact.id) && artifact.id > 0);
  if (artifacts.length !== 1) fail('expected exactly one unexpired artifact from the requested run');
  const bytes = await downloadZip(fetchImpl, `${api}/actions/artifacts/${artifacts[0].id}/zip`, token);
  return extractArtifactZip(bytes);
}

export async function fetchVerifyAndStore(options) {
  const bytes = await fetchGameReferenceArtifact(options);
  const result = validateGameReferenceArtifact({ ...bytes, expectedSha: options.sha, expectedRunId: options.runId });
  if (options.write) await storeGameReference(bytes);
  return result;
}

function parseArgs(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === '--write') fail('--write is not accepted by this CLI; use the canonical sync wrapper');
    if (!['--sha', '--run-id'].includes(flag) || values.has(flag) || index + 1 === args.length || args[index + 1].startsWith('--')) fail(`invalid CLI argument ${flag}`);
    values.set(flag, args[++index]);
  }
  if (!values.has('--sha') || !values.has('--run-id')) fail('both --sha and --run-id are required');
  return { sha: values.get('--sha'), runId: values.get('--run-id') };
}
if (process.argv[1]?.endsWith('fetch-game-reference-artifact.mjs')) {
  fetchVerifyAndStore(parseArgs(process.argv.slice(2))).then((result) => console.log(`game-reference fetched: ${result.manifest.source.sha.slice(0, 12)} (${result.manifestSha256.slice(0, 12)})`)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
