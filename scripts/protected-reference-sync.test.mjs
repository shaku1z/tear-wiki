import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { deflateRawSync } from 'node:zlib';
import {
  assertDispatchRuntime,
  consumeGameReferenceDispatch,
  DISPATCH_ACTION,
  parseDispatchEvent,
  WIKI_REPOSITORY,
} from './consume-game-reference-dispatch.mjs';
import { assertReferencePromotionState, REFERENCE_PROMOTION_FILES } from './check-reference-promotion-state.mjs';
import { assertSyncPrIdentity, assertSyncPrSnapshot } from './verify-sync-pr-reference.mjs';

const SOURCE_SHA = '9ddd8f20a9c7d1830a2e043d9e558e259f738d02';
const RUN_ID = '32785864315';
const ARTIFACT_ID = '9541725277';
const manifest = await readFile(new URL('../src/data/game-reference.v1.json', import.meta.url));
const receipt = await readFile(new URL('../src/data/game-reference.v1.receipt.json', import.meta.url));
const workflow = await readFile(new URL('../.github/workflows/sync-game-reference.yml', import.meta.url), 'utf8');
const validateWorkflow = await readFile(new URL('../.github/workflows/validate.yml', import.meta.url), 'utf8');
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

function zip(entries) {
  const locals = []; const centrals = []; let offset = 0;
  for (const { name, data, attributes = 0 } of entries) {
    const filename = Buffer.from(name); const uncompressed = Buffer.from(data); const body = deflateRawSync(uncompressed);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(uncompressed.length, 22); local.writeUInt16LE(filename.length, 26);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(8, 10); central.writeUInt32LE(body.length, 20); central.writeUInt32LE(uncompressed.length, 24); central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(attributes, 38); central.writeUInt32LE(offset, 42);
    locals.push(local, filename, body); centrals.push(central, filename); offset += local.length + filename.length + body.length;
  }
  const centralBytes = Buffer.concat(centrals); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(centralBytes.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBytes, end]);
}

const artifactZip = zip([
  { name: 'game-reference.v1.json', data: manifest },
  { name: 'game-reference.v1.receipt.json', data: receipt },
]);
const artifactDigest = `sha256:${createHash('sha256').update(artifactZip).digest('hex')}`;

function eventFor(zipBytes = artifactZip, overrides = {}) {
  return {
    action: DISPATCH_ACTION,
    repository: { full_name: WIKI_REPOSITORY },
    client_payload: {
      game_commit: SOURCE_SHA,
      validation_run_id: RUN_ID,
      artifact_id: ARTIFACT_ID,
      artifact_zip_base64: zipBytes.toString('base64'),
      ...overrides,
    },
  };
}

function metadata({ run = {}, artifact = {}, artifacts = undefined } = {}) {
  const canonicalArtifact = {
    id: Number(ARTIFACT_ID),
    name: `tear-game-reference-v1-${SOURCE_SHA}`,
    expired: false,
    size_in_bytes: artifactZip.length,
    digest: artifactDigest,
    expires_at: '2099-01-01T00:00:00Z',
    workflow_run: { id: Number(RUN_ID), head_branch: 'main', head_sha: SOURCE_SHA },
    ...artifact,
  };
  return {
    ref: { ref: 'refs/heads/main', object: { type: 'commit', sha: SOURCE_SHA } },
    run: {
      id: Number(RUN_ID),
      name: 'Validate',
      workflow_id: 322540049,
      path: '.github/workflows/ci.yml',
      workflow_name: 'Validate',
      status: 'completed',
      conclusion: 'success',
      event: 'push',
      head_branch: 'main',
      head_sha: SOURCE_SHA,
      repository: { full_name: 'shaku1z/tear' },
      head_repository: { full_name: 'shaku1z/tear' },
      ...run,
    },
    artifacts: artifacts ?? [canonicalArtifact],
  };
}

function response(json, status = 200) {
  return { ok: status === 200, status, json: async () => json };
}

function fetchFixture(fixture) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/git/ref/heads/main')) return response(fixture.ref);
    if (url.endsWith(`/actions/runs/${RUN_ID}`)) return response(fixture.run);
    if (url.endsWith(`/actions/runs/${RUN_ID}/artifacts?per_page=100`)) return response({ total_count: fixture.artifacts.length, artifacts: fixture.artifacts });
    throw new Error(`unexpected URL ${url}`);
  };
  return { fetchImpl, calls };
}

test('accepts the exact dispatch, verifies public metadata and promotes only after digest validation', async () => {
  const fixture = metadata();
  const { fetchImpl, calls } = fetchFixture(fixture);
  let promotion;
  const result = await consumeGameReferenceDispatch({
    event: eventFor(),
    fetchImpl,
    promoteImpl: async (options) => { promotion = options; return { files: ['manifest', 'receipt', 'registry'] }; },
    now: Date.parse('2026-08-25T00:00:00Z'),
  });
  assert.equal(result.result.manifest.source.sha, SOURCE_SHA);
  assert.equal(result.artifact.digest, artifactDigest);
  assert.equal(promotion.expectedSha, SOURCE_SHA);
  assert.equal(promotion.expectedRunId, RUN_ID);
  assert.deepEqual(promotion.manifestBytes, manifest);
  assert.deepEqual(promotion.receiptBytes, receipt);
  assert.equal(calls.length, 3);
  for (const call of calls) assert.equal(call.options.headers.Authorization, undefined);
});

test('requires the exact four payload fields and protected workflow runtime', () => {
  assert.throws(() => parseDispatchEvent(eventFor(artifactZip, { extra: 'reject' })), /exactly/);
  assert.throws(() => parseDispatchEvent(eventFor(artifactZip, { artifact_zip_base64: `${artifactZip.toString('base64')}\n` })), /canonical/);
  assert.throws(() => parseDispatchEvent({ action: DISPATCH_ACTION, repository: { full_name: WIKI_REPOSITORY }, client_payload: {} }), /exactly/);
  assert.throws(() => assertDispatchRuntime({}), /restricted/);
  assert.doesNotThrow(() => assertDispatchRuntime({ GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'repository_dispatch', GITHUB_REPOSITORY: WIKI_REPOSITORY, GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_PATH: 'event.json' }));
});

test('rejects a tampered public digest or ZIP before promotion', async () => {
  for (const [label, event, fixture] of [
    ['digest', eventFor(), metadata({ artifact: { digest: `sha256:${'0'.repeat(64)}` } })],
    ['zip', eventFor(Buffer.from(artifactZip.map((byte, index) => index === 0 ? byte ^ 1 : byte))), metadata()],
  ]) {
    let promoted = false;
    await assert.rejects(
      () => consumeGameReferenceDispatch({ event, ...fetchFixture(fixture), promoteImpl: async () => { promoted = true; } }),
      /digest/,
      label,
    );
    assert.equal(promoted, false, `${label} reached promotion`);
  }
});

test('rejects wrong run provenance, expired artifacts, and replayed duplicate metadata', async () => {
  const cases = [
    { name: 'stale', fixture: { ...metadata(), ref: { ref: 'refs/heads/main', object: { type: 'commit', sha: 'a'.repeat(40) } } }, pattern: /current canonical/ },
    { name: 'run', fixture: metadata({ run: { head_sha: 'a'.repeat(40) } }), pattern: /provenance/ },
    { name: 'expired', fixture: metadata({ artifact: { expired: true, expires_at: '2020-01-01T00:00:00Z' } }), pattern: /exact unique match|expired/ },
    { name: 'replay', fixture: metadata({ artifacts: [metadata().artifacts[0], metadata().artifacts[0]] }), pattern: /not unique/ },
  ];
  for (const testCase of cases) {
    await assert.rejects(
      () => consumeGameReferenceDispatch({ event: eventFor(), ...fetchFixture(testCase.fixture), promoteImpl: async () => { throw new Error('promotion must not run'); } }),
      testCase.pattern,
      testCase.name,
    );
  }
});

test('workflow is repository-dispatch-only, PR-only, and limited to the reference triplet', () => {
  assert.match(workflow, /repository_dispatch:\s*\n\s*types:\s*\[tear-game-deployed\]/u);
  assert.match(workflow, /actions:\s*write/u);
  assert.match(workflow, /contents:\s*write/u);
  assert.match(workflow, /pull-requests:\s*write/u);
  assert.match(workflow, /ref:\s*main/u);
  assert.match(workflow, /run:\s*npm ci/u);
  assert.match(workflow, /run:\s*npm run consume:game-reference-dispatch/u);
  assert.equal((workflow.match(/npm run check:snapshot/g) ?? []).length, 1);
  assert.equal((workflow.match(/gh workflow run validate\.yml --repo "\$GITHUB_REPOSITORY" --ref "\$branch" -f expected_head="\$expected_head"/g) ?? []).length, 2);
  assert.match(workflow, /gh pr view "\$existing_pr_number" --repo "\$GITHUB_REPOSITORY" --json baseRefName,files,headRefName,headRefOid/u);
  assert.match(workflow, /git fetch --no-tags origin "refs\/heads\/\$branch:refs\/remotes\/origin\/\$branch"/u);
  assert.match(workflow, /node scripts\/verify-sync-pr-reference\.mjs/u);
  assert.match(validateWorkflow, /workflow_dispatch:/u);
  assert.match(validateWorkflow, /expected_head:\s*\n\s*description:/u);
  assert.match(validateWorkflow, /expected_head:[\s\S]*?required: true[\s\S]*?type: string/u);
  assert.match(validateWorkflow, /EXPECTED_HEAD: \$\{\{ inputs\.expected_head \}\}/u);
  assert.match(validateWorkflow, /ACTUAL_HEAD: \$\{\{ github\.sha \}\}/u);
  assert.match(validateWorkflow, /if \[\[ "\$ACTUAL_HEAD" != "\$EXPECTED_HEAD" \]\]/u);
  assert.match(workflow, /git push --set-upstream origin "\$branch"/u);
  assert.match(workflow, /gh pr create/u);
  assert.doesNotMatch(workflow, /git push[^\n]*\bmain\b|gh pr merge|wrangler|cloudflare|auto-merge/iu);
  for (const path of ['src/data/game-reference.v1.json', 'src/data/game-reference.v1.receipt.json', 'src/data/wiki-terminology.json']) assert.match(workflow, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u'));
  assert.equal(packageJson.scripts['consume:game-reference-dispatch'], 'node scripts/consume-game-reference-dispatch.mjs');
});

test('the event consumer rejects local writer-style CLI bypasses', () => {
  const result = spawnSync(process.execPath, ['scripts/consume-game-reference-dispatch.mjs', '--write'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_ACTIONS: 'true',
      GITHUB_EVENT_NAME: 'repository_dispatch',
      GITHUB_REPOSITORY: WIKI_REPOSITORY,
      GITHUB_REF: 'refs/heads/main',
      GITHUB_EVENT_PATH: 'missing-event.json',
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /CLI accepts no arguments/);
});

test('promotion state accepts exactly the intended modified files and rejects bypass paths', () => {
  const diffText = `${REFERENCE_PROMOTION_FILES.join('\n')}\n`;
  const statusText = `${REFERENCE_PROMOTION_FILES.map((file) => ` M ${file}`).join('\n')}\n`;
  assert.deepEqual(assertReferencePromotionState({ statusText, diffText }), { noChange: false });
  assert.deepEqual(assertReferencePromotionState({ statusText: '', diffText: '' }), { noChange: true });
  assert.throws(() => assertReferencePromotionState({ statusText: '', diffText }), /status|exactly/);
  assert.throws(() => assertReferencePromotionState({ statusText: `${statusText}?? unexpected.txt\n`, diffText }), /only unstaged|exactly/);
  assert.throws(() => assertReferencePromotionState({ statusText: statusText.replace(' M ', 'M  '), diffText }), /only unstaged/);
  assert.throws(() => assertReferencePromotionState({ statusText, diffText: `${diffText}src/extra.txt\n` }), /exactly/);
});

test('existing synchronization PR reuse requires exact branch, files, and current snapshot identity', async () => {
  const branch = `codex/sync-game-reference-${SOURCE_SHA}`;
  const pr = { baseRefName: 'main', headRefName: branch, headRefOid: 'b'.repeat(40), files: REFERENCE_PROMOTION_FILES.map((path) => ({ path })) };
  assert.equal(assertSyncPrIdentity(pr, { expectedBranch: branch, expectedHeadOid: 'b'.repeat(40) }), 'b'.repeat(40));
  const registry = await readFile(new URL('../src/data/wiki-terminology.json', import.meta.url));
  assertSyncPrSnapshot({ manifestBytes: manifest, receiptBytes: receipt, registryBytes: registry, expectedSha: SOURCE_SHA, expectedRunId: RUN_ID });
  assert.throws(() => assertSyncPrIdentity({ ...pr, files: [...pr.files, { path: 'src/extra.txt' }] }, { expectedBranch: branch, expectedHeadOid: 'b'.repeat(40) }), /exactly|unexpected/);
  assert.throws(() => assertSyncPrIdentity({ ...pr, headRefName: 'codex/other' }, { expectedBranch: branch, expectedHeadOid: 'b'.repeat(40) }), /branch/);
  assert.throws(() => assertSyncPrSnapshot({ manifestBytes: Buffer.from(manifest.toString('utf8').replace(SOURCE_SHA, 'a'.repeat(40))), receiptBytes: receipt, registryBytes: registry, expectedSha: SOURCE_SHA, expectedRunId: RUN_ID }), /receipt|source/);
});
