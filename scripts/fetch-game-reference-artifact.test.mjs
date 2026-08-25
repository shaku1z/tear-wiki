import assert from 'node:assert/strict';
import test from 'node:test';
import { readCurrentReferenceFixture } from './current-reference-fixture.mjs';
import { extractArtifactZip, fetchGameReferenceArtifact } from './fetch-game-reference-artifact.mjs';

const current = await readCurrentReferenceFixture();
const { sourceSha: SHA, runId: RUN, manifestBytes: manifest, receiptBytes: receipt } = current;

function zip(entries) {
  const locals = []; const centrals = []; let offset = 0;
  for (const { name, data, attributes = 0 } of entries) {
    const filename = Buffer.from(name); const body = Buffer.from(data);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(body.length, 22); local.writeUInt16LE(filename.length, 26);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt32LE(body.length, 20); central.writeUInt32LE(body.length, 24); central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(attributes, 38); central.writeUInt32LE(offset, 42);
    locals.push(local, filename, body); centrals.push(central, filename); offset += local.length + filename.length + body.length;
  }
  const centralBytes = Buffer.concat(centrals); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(centralBytes.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBytes, end]);
}
function response({ json, bytes, status = 200, location }) {
  return { ok: status >= 200 && status < 300, status, headers: { get: (key) => key.toLowerCase() === 'location' ? location ?? null : null }, json: async () => json, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
}
const goodZip = () => zip([{ name: 'game-reference.v1.json', data: manifest }, { name: 'game-reference.v1.receipt.json', data: receipt }]);

test('extracts only the exact two artifact members', async () => {
  const result = await extractArtifactZip(goodZip());
  assert.deepEqual(result.manifestBytes, manifest); assert.deepEqual(result.receiptBytes, receipt);
});

test('rejects hostile ZIP members before extraction', async () => {
  for (const entries of [
    [{ name: 'game-reference.v1.json', data: manifest }, { name: 'game-reference.v1.receipt.json', data: receipt }, { name: 'extra', data: 'x' }],
    [{ name: '../game-reference.v1.json', data: manifest }, { name: 'game-reference.v1.receipt.json', data: receipt }],
    [{ name: 'game-reference.v1.json', data: manifest }, { name: 'game-reference.v1.json', data: manifest }],
    [{ name: 'game-reference.v1.json', data: manifest, attributes: 0o120000 * 0x10000 }, { name: 'game-reference.v1.receipt.json', data: receipt }],
  ]) await assert.rejects(() => extractArtifactZip(zip(entries)), /game-reference fetch/);
});

test('checks exact run provenance and strips token on the storage redirect', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.includes('/artifacts?')) return response({ json: { artifacts: [{ id: 12, name: `tear-game-reference-v1-${SHA}`, expired: false, workflow_run: { id: Number(RUN), head_branch: 'main', head_sha: SHA } }] } });
    if (url.includes('/artifacts/12/zip')) return response({ status: 302, location: 'https://example.blob.core.windows.net/artifact?signature=redacted' });
    if (url.includes('/runs/')) return response({ json: { id: Number(RUN), name: 'Validate', workflow_id: 322540049, path: '.github/workflows/ci.yml', workflow_name: 'Validate', status: 'completed', conclusion: 'success', event: 'push', head_branch: 'main', head_sha: SHA, repository: { full_name: 'shaku1z/tear' }, head_repository: { full_name: 'shaku1z/tear' } } });
    return response({ bytes: goodZip() });
  };
  const result = await fetchGameReferenceArtifact({ sha: SHA, runId: RUN, token: 'secret', fetchImpl });
  assert.deepEqual(result.manifestBytes, manifest);
  assert.equal(calls.at(-1).options.headers.Authorization, undefined);
  assert.equal(calls.at(-1).options.redirect, 'error');
});

test('rejects provenance and unsafe download redirects', async () => {
  const badRun = async () => response({ json: { id: Number(RUN), name: 'Validate', workflow_id: 322540049, path: '.github/workflows/ci.yml', workflow_name: 'Validate', status: 'completed', conclusion: 'success', event: 'push', head_branch: 'main', head_sha: SHA, repository: { full_name: 'other/repo' }, head_repository: { full_name: 'shaku1z/tear' } } });
  await assert.rejects(() => fetchGameReferenceArtifact({ sha: SHA, runId: RUN, token: 'secret', fetchImpl: badRun }), /provenance/);
  for (const mismatch of [{ workflow_id: 1 }, { path: '.github/workflows/untrusted.yml' }]) {
    const sameNameWrongWorkflow = async () => response({ json: { id: Number(RUN), name: 'Validate', workflow_id: 322540049, path: '.github/workflows/ci.yml', workflow_name: null, status: 'completed', conclusion: 'success', event: 'push', head_branch: 'main', head_sha: SHA, repository: { full_name: 'shaku1z/tear' }, head_repository: { full_name: 'shaku1z/tear' }, ...mismatch } });
    await assert.rejects(() => fetchGameReferenceArtifact({ sha: SHA, runId: RUN, token: 'secret', fetchImpl: sameNameWrongWorkflow }), /provenance/);
  }
  let request = 0;
  const unsafeRedirect = async () => {
    request += 1;
    if (request === 1) return response({ json: { id: Number(RUN), name: 'Validate', workflow_id: 322540049, path: '.github/workflows/ci.yml', workflow_name: 'Validate', status: 'completed', conclusion: 'success', event: 'push', head_branch: 'main', head_sha: SHA, repository: { full_name: 'shaku1z/tear' }, head_repository: { full_name: 'shaku1z/tear' } } });
    if (request === 2) return response({ json: { artifacts: [{ id: 1, name: `tear-game-reference-v1-${SHA}`, expired: false, workflow_run: { id: Number(RUN), head_branch: 'main', head_sha: SHA } }] } });
    return response({ status: 302, location: 'https://attacker.invalid/archive.zip' });
  };
  await assert.rejects(() => fetchGameReferenceArtifact({ sha: SHA, runId: RUN, token: 'secret', fetchImpl: unsafeRedirect }), /approved storage host/);
});
