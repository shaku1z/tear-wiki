import { writeBuildProvenance } from './build-provenance.mjs';

const { outputPath, provenance } = await writeBuildProvenance({
  expectedWikiCommit: process.env.EXPECTED_WIKI_GIT_COMMIT,
  expectedGameSourceSha: process.env.EXPECTED_GAME_SOURCE_SHA,
});
console.log(`Wrote deterministic wiki build provenance for ${provenance.wiki.commit} and game ${provenance.gameReference.sourceSha} to ${outputPath}.`);
