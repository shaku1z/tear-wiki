import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createBuildProvenance, provenanceBytes } from './build-provenance.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const manifestBytes = await readFile(new URL('../src/data/game-reference.v1.json', import.meta.url));
const receiptBytes = await readFile(new URL('../src/data/game-reference.v1.receipt.json', import.meta.url));
const registryBytes = await readFile(new URL('../src/data/wiki-terminology.json', import.meta.url));
const SOURCE_SHA = JSON.parse(receiptBytes).sourceSha;

test('build provenance is deterministic and binds the complete reference triplet', async () => {
  const first = await createBuildProvenance({ root: ROOT, expectedGameSourceSha: SOURCE_SHA });
  const second = await createBuildProvenance({ root: ROOT, expectedGameSourceSha: SOURCE_SHA });
  assert.deepEqual(first, second);
  assert.equal(first.format, 'tear-wiki-build-provenance.v1');
  assert.equal(first.wiki.repository, 'shaku1z/tear-wiki');
  assert.equal(first.gameReference.repository, 'shaku1z/tear');
  assert.equal(first.gameReference.sourceSha, SOURCE_SHA);
  assert.equal(first.gameReference.manifestSha256, createHash('sha256').update(manifestBytes).digest('hex'));
  assert.equal(first.gameReference.receiptSha256, createHash('sha256').update(receiptBytes).digest('hex'));
  assert.equal(first.gameReference.registrySha256, createHash('sha256').update(registryBytes).digest('hex'));
  assert.deepEqual(provenanceBytes(first), provenanceBytes(second));
});

test('provenance fails closed for a mismatched reference or wiki commit', async () => {
  const wrongSourceSha = SOURCE_SHA === 'a'.repeat(40) ? 'b'.repeat(40) : 'a'.repeat(40);
  await assert.rejects(() => createBuildProvenance({ root: ROOT, expectedGameSourceSha: wrongSourceSha }), /game reference source SHA/);
  await assert.rejects(() => createBuildProvenance({ root: ROOT, expectedWikiCommit: 'b'.repeat(40) }), /wiki git commit/);
});
