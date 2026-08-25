import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import test from 'node:test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promoteGameReference } from './promote-game-reference.mjs';
import { verifyGameReferenceSnapshot } from './verify-game-reference-snapshot.mjs';

const SOURCE_ROOT = new URL('../', import.meta.url);
const CURRENT_SHA = '9ddd8f20a9c7d1830a2e043d9e558e259f738d02';
const CURRENT_RUN = '32785864315';

async function makeFixture() {
  const root = await mkdtemp(join(tmpdir(), 'tear-reference-promotion-'));
  const data = join(root, 'src', 'data');
  await mkdir(data, { recursive: true });
  for (const name of ['game-reference.v1.json', 'game-reference.v1.receipt.json', 'wiki-terminology.json']) {
    await writeFile(join(data, name), await readFile(new URL(`src/data/${name}`, SOURCE_ROOT)));
  }
  return { root, data };
}

async function removeFixture(root) {
  await rm(root, { recursive: true, force: true });
}

async function futureArtifact() {
  const manifest = JSON.parse((await readFile(new URL('src/data/game-reference.v1.json', SOURCE_ROOT))).toString('utf8'));
  const receipt = JSON.parse((await readFile(new URL('src/data/game-reference.v1.receipt.json', SOURCE_ROOT))).toString('utf8'));
  const sourceSha = 'a'.repeat(40);
  const runId = '987654321';
  manifest.source.sha = sourceSha;
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  receipt.sourceSha = sourceSha;
  receipt.artifactName = `tear-game-reference-v1-${sourceSha}`;
  receipt.manifestSha256 = createHash('sha256').update(manifestBytes).digest('hex');
  receipt.validationRunId = runId;
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  return { manifestBytes, receiptBytes, expectedSha: sourceSha, expectedRunId: runId };
}

async function fileSet(data) {
  return Promise.all(['game-reference.v1.json', 'game-reference.v1.receipt.json', 'wiki-terminology.json'].map((name) => readFile(join(data, name))));
}

test('promotion follows the externally supplied artifact and changes only the current registry snapshot', async () => {
  const fixture = await makeFixture();
  try {
    const before = await fileSet(fixture.data);
    const incoming = await futureArtifact();
    const result = await promoteGameReference({
      ...incoming,
      root: fixture.root,
    });
    assert.equal(result.result.manifest.source.sha, incoming.expectedSha);
    const verified = await verifyGameReferenceSnapshot({ root: fixture.root });
    assert.equal(verified.result.receipt.validationRunId, incoming.expectedRunId);
    assert.notDeepEqual(verified.registry.snapshot, JSON.parse(before[2].toString('utf8')).snapshot);
    const after = JSON.parse((await readFile(join(fixture.data, 'wiki-terminology.json'))).toString('utf8'));
    const prior = JSON.parse(before[2].toString('utf8'));
    assert.deepEqual(after.historicalSnapshot, prior.historicalSnapshot);
    assert.deepEqual(after.publicTerms, prior.publicTerms);
    assert.deepEqual(after.activeRoster, prior.activeRoster);
    assert.deepEqual(after.legacyPolicy, prior.legacyPolicy);
  } finally {
    await removeFixture(fixture.root);
  }
});

test('promotion rejects missing external trust inputs before touching the three files', async () => {
  const fixture = await makeFixture();
  try {
    const before = await fileSet(fixture.data);
    const incoming = await futureArtifact();
    await assert.rejects(() => promoteGameReference({ ...incoming, expectedSha: undefined, root: fixture.root }), /expectedSha/);
    assert.deepEqual(await fileSet(fixture.data), before);
  } finally {
    await removeFixture(fixture.root);
  }
});

test('every injected backup/install failure rolls all three files back byte-for-byte', async () => {
  const incoming = await futureArtifact();
  for (let failAt = 1; failAt <= 6; failAt += 1) {
    const fixture = await makeFixture();
    try {
      const before = await fileSet(fixture.data);
      let calls = 0;
      const replaceFile = async (source, destination) => {
        calls += 1;
        if (calls === failAt) throw new Error(`injected replacement failure ${failAt}`);
        await rename(source, destination);
      };
      await assert.rejects(
        () => promoteGameReference({ ...incoming, root: fixture.root, replaceFile }),
        new RegExp(`injected replacement failure ${failAt}`),
      );
      assert.deepEqual(await fileSet(fixture.data), before, `failure ${failAt} changed a protected file`);
      assert.deepEqual((await readdir(fixture.data)).filter((name) => name.startsWith('.')), [], `failure ${failAt} left temporary state`);
      const verified = await verifyGameReferenceSnapshot({ root: fixture.root });
      assert.equal(verified.result.manifest.source.sha, CURRENT_SHA, `failure ${failAt} changed the current source`);
      assert.equal(String(verified.result.receipt.validationRunId), CURRENT_RUN, `failure ${failAt} changed the current run`);
    } finally {
      await removeFixture(fixture.root);
    }
  }
});

test('promotion accepts only the canonical src/data path for its repository root', async () => {
  const fixture = await makeFixture();
  try {
    const incoming = await futureArtifact();
    await assert.rejects(
      () => promoteGameReference({ ...incoming, root: fixture.root, dataDirectory: fixture.root }),
      /must be the repository src\/data directory/,
    );
  } finally {
    await removeFixture(fixture.root);
  }
});
