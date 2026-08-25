import assert from 'node:assert/strict';
import { createBuildProvenance, provenanceBytes, readBuildProvenance } from './build-provenance.mjs';

const expectedWikiCommit = process.env.EXPECTED_WIKI_GIT_COMMIT;
const expectedGameSourceSha = process.env.EXPECTED_GAME_SOURCE_SHA;
const expected = await createBuildProvenance({ expectedWikiCommit, expectedGameSourceSha });
const { bytes, value, outputPath } = await readBuildProvenance();
assert.deepEqual(value, expected, 'build provenance does not match the current wiki commit/reference triplet');
assert.deepEqual(bytes, provenanceBytes(expected), 'build provenance is not canonical LF JSON');
console.log(`Verified deterministic build provenance at ${outputPath} for wiki ${expected.wiki.commit} and game ${expected.gameReference.sourceSha}.`);
