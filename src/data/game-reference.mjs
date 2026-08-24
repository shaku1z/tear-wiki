import { validateGameReferenceArtifact } from '../../scripts/game-reference-contract.mjs';

import manifestBytes from './game-reference.v1.json?raw';
import receiptBytes from './game-reference.v1.receipt.json?raw';
const receipt = JSON.parse(receiptBytes);
const { manifest, manifestSha256 } = validateGameReferenceArtifact({
  manifestBytes, receiptBytes, expectedSha: receipt.sourceSha, expectedRunId: receipt.validationRunId,
});

export const gameReference = Object.freeze(manifest);
export const gameReferenceReceipt = Object.freeze(receipt);
export const gameReferenceSha256 = manifestSha256;
export const weapons = Object.freeze(manifest.collections.weapons.items);
export const upgrades = Object.freeze(manifest.collections.upgrades.items);
export const achievements = Object.freeze(manifest.collections.achievements.items);
export const bosses = Object.freeze(manifest.collections.bosses.items);
export const stages = Object.freeze(manifest.collections.stages.items);
export const modes = Object.freeze(manifest.collections.modes.items);
export const enemies = Object.freeze(manifest.collections.enemies.items);
export const difficulties = Object.freeze(manifest.collections['public-tuning'].items.difficultyCatalog);
export const source = Object.freeze({ sha: manifest.source.sha, repository: manifest.source.repository, runId: receipt.validationRunId, sha256: manifestSha256 });
