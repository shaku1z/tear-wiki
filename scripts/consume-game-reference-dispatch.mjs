import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { extractArtifactZip } from './fetch-game-reference-artifact.mjs';
import { validateGameReferenceArtifact } from './game-reference-contract.mjs';
import { promoteGameReference } from './promote-game-reference.mjs';

export const WIKI_REPOSITORY = 'shaku1z/tear-wiki';
export const GAME_REPOSITORY = 'shaku1z/tear';
export const DISPATCH_ACTION = 'tear-game-deployed';
export const WORKFLOW = 'Validate';
export const WORKFLOW_ID = 322540049;
export const WORKFLOW_PATH = '.github/workflows/ci.yml';
export const MAX_DISPATCH_ZIP_BYTES = 48 * 1024;
export const MAX_DISPATCH_BASE64_CHARS = Math.ceil(MAX_DISPATCH_ZIP_BYTES / 3) * 4;

const REQUIRED_PAYLOAD_KEYS = ['artifact_id', 'artifact_zip_base64', 'game_commit', 'validation_run_id'];

function fail(message) {
  throw new Error(`game-reference dispatch: ${message}`);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, expected, label) {
  if (!isRecord(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const canonical = [...expected].sort();
  if (actual.length !== canonical.length || actual.some((key, index) => key !== canonical[index])) {
    fail(`${label} must contain exactly ${expected.join(', ')}`);
  }
}

function validSha(value, label) {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/.test(value)) fail(`${label} must be a 40-character lowercase SHA`);
  return value;
}

function positiveId(value, label) {
  const text = typeof value === 'string'
    ? value
    : Number.isSafeInteger(value) ? String(value) : '';
  if (!/^[1-9][0-9]*$/.test(text) || !Number.isSafeInteger(Number(text))) fail(`${label} must be a canonical positive integer`);
  return text;
}

function sameId(left, right) {
  return String(left) === String(right);
}

function decodeCanonicalBase64(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_DISPATCH_BASE64_CHARS || value.length % 4 !== 0) {
    fail(`artifact_zip_base64 must be canonical base64 no larger than ${MAX_DISPATCH_ZIP_BYTES} decoded bytes`);
  }
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    fail('artifact_zip_base64 contains invalid or non-canonical characters');
  }
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length === 0 || bytes.length > MAX_DISPATCH_ZIP_BYTES || bytes.toString('base64') !== value) {
    fail(`artifact_zip_base64 must be canonical base64 no larger than ${MAX_DISPATCH_ZIP_BYTES} decoded bytes`);
  }
  return bytes;
}

export function parseDispatchEvent(event) {
  if (!isRecord(event) || event.action !== DISPATCH_ACTION || event.repository?.full_name !== WIKI_REPOSITORY) {
    fail(`event must be ${DISPATCH_ACTION} for ${WIKI_REPOSITORY}`);
  }
  exactKeys(event.client_payload, REQUIRED_PAYLOAD_KEYS, 'event.client_payload');
  return {
    gameSha: validSha(event.client_payload.game_commit, 'game_commit'),
    runId: positiveId(event.client_payload.validation_run_id, 'validation_run_id'),
    artifactId: positiveId(event.client_payload.artifact_id, 'artifact_id'),
    zipBytes: decodeCanonicalBase64(event.client_payload.artifact_zip_base64),
  };
}

export function assertDispatchRuntime(env = process.env) {
  if (env.GITHUB_ACTIONS !== 'true' || env.GITHUB_EVENT_NAME !== 'repository_dispatch' || env.GITHUB_REPOSITORY !== WIKI_REPOSITORY || env.GITHUB_REF !== 'refs/heads/main' || typeof env.GITHUB_EVENT_PATH !== 'string' || env.GITHUB_EVENT_PATH.length === 0) {
    fail('CLI entrypoint is restricted to the protected wiki repository_dispatch workflow');
  }
}

function publicRequest() {
  return {
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    redirect: 'error',
    cache: 'no-store',
  };
}

async function publicJson(fetchImpl, url, label) {
  let response;
  try { response = await fetchImpl(url, publicRequest()); } catch (error) { fail(`${label} request failed: ${error.message}`); }
  if (response?.status !== 200 || !response?.ok) fail(`${label} request was not public HTTP 200`);
  try { return await response.json(); } catch { fail(`${label} response was not JSON`); }
}

function assertRunMetadata(run, { gameSha, runId }) {
  if (!isRecord(run) || !sameId(run.id, runId) || run.name !== WORKFLOW || String(run.workflow_id) !== String(WORKFLOW_ID) || run.path !== WORKFLOW_PATH || (run.workflow_name != null && run.workflow_name !== WORKFLOW) || run.status !== 'completed' || run.conclusion !== 'success' || run.event !== 'push' || run.head_branch !== 'main' || run.head_sha !== gameSha || run.repository?.full_name !== GAME_REPOSITORY || run.head_repository?.full_name !== GAME_REPOSITORY) {
    fail('workflow run provenance does not match the protected game main Validate run');
  }
}

function assertArtifactMetadata(artifactsPayload, { artifactId, gameSha, runId, now }) {
  if (!isRecord(artifactsPayload) || !Array.isArray(artifactsPayload.artifacts)) fail('artifact list is malformed');
  if (Number.isSafeInteger(artifactsPayload.total_count) && artifactsPayload.total_count !== artifactsPayload.artifacts.length) fail('artifact list is incomplete or paginated');
  const byId = artifactsPayload.artifacts.filter((artifact) => sameId(artifact?.id, artifactId));
  if (byId.length !== 1) fail('artifact ID is not unique in the public artifact list');
  const artifact = byId[0];
  const expectedName = `tear-game-reference-v1-${gameSha}`;
  const exactMatches = artifactsPayload.artifacts.filter((candidate) => candidate?.name === expectedName && sameId(candidate?.id, artifactId) && candidate.expired === false && sameId(candidate.workflow_run?.id, runId) && candidate.workflow_run?.head_branch === 'main' && candidate.workflow_run?.head_sha === gameSha);
  if (exactMatches.length !== 1 || exactMatches[0] !== artifact) fail('artifact name, run, branch, or source SHA is not an exact unique match');
  if (!/^sha256:[0-9a-f]{64}$/.test(artifact.digest ?? '')) fail('artifact metadata has no immutable SHA-256 digest');
  if (!Number.isSafeInteger(artifact.size_in_bytes) || artifact.size_in_bytes <= 0 || artifact.size_in_bytes > MAX_DISPATCH_ZIP_BYTES) fail('artifact metadata size is outside the dispatch bound');
  const expiry = typeof artifact.expires_at === 'string' ? Date.parse(artifact.expires_at) : Number.NaN;
  if (artifact.expired !== false || !Number.isFinite(expiry) || expiry <= now) fail('artifact is expired or has no valid future expiry');
  return artifact;
}

/**
 * Consumes only a repository_dispatch payload whose ZIP is authenticated by
 * fresh public GitHub Actions metadata. The payload never supplies the digest;
 * the public artifact record is the digest authority.
 */
export async function consumeGameReferenceDispatch({ event, fetchImpl = globalThis.fetch, promoteImpl = promoteGameReference, now = Date.now() } = {}) {
  const payload = parseDispatchEvent(event);
  if (typeof fetchImpl !== 'function') fail('fetch implementation is required');
  if (typeof promoteImpl !== 'function') fail('promotion implementation is required');
  const api = `https://api.github.com/repos/${GAME_REPOSITORY}`;
  const mainRef = await publicJson(fetchImpl, `${api}/git/ref/heads/main`, 'canonical game main ref');
  if (!isRecord(mainRef) || mainRef.ref !== 'refs/heads/main' || mainRef.object?.type !== 'commit' || mainRef.object?.sha !== payload.gameSha) fail('dispatch source SHA is not the current canonical game main commit');
  const run = await publicJson(fetchImpl, `${api}/actions/runs/${payload.runId}`, 'workflow run');
  assertRunMetadata(run, payload);
  const artifacts = await publicJson(fetchImpl, `${api}/actions/runs/${payload.runId}/artifacts?per_page=100`, 'artifact list');
  const artifact = assertArtifactMetadata(artifacts, { ...payload, now: typeof now === 'function' ? now() : now });
  if (payload.zipBytes.length !== artifact.size_in_bytes) fail('decoded artifact ZIP size does not match public metadata');
  const digest = createHash('sha256').update(payload.zipBytes).digest('hex');
  if (`sha256:${digest}` !== artifact.digest) fail('decoded artifact ZIP does not match the public immutable digest');
  const extracted = await extractArtifactZip(payload.zipBytes);
  const result = validateGameReferenceArtifact({ ...extracted, expectedSha: payload.gameSha, expectedRunId: payload.runId });
  const promotion = await promoteImpl({ ...extracted, expectedSha: payload.gameSha, expectedRunId: payload.runId });
  return { result, promotion, artifact: { id: payload.artifactId, name: artifact.name, digest: artifact.digest, sizeInBytes: artifact.size_in_bytes } };
}

async function main() {
  assertDispatchRuntime();
  if (process.argv.length !== 2) fail('CLI accepts no arguments; it reads only the GitHub repository_dispatch event');
  let event;
  try { event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8')); } catch (error) { fail(`GitHub event payload could not be read: ${error.message}`); }
  const result = await consumeGameReferenceDispatch({ event });
  console.log(`Verified and promoted game-reference ${result.result.manifest.source.sha} from run ${result.result.receipt.validationRunId}; artifact ${result.artifact.id} digest ${result.artifact.digest}`);
}

const invokedPath = process.argv[1] === undefined ? '' : resolve(process.argv[1]);
if (invokedPath === resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
