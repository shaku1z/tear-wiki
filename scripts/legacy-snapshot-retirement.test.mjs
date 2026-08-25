import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const ROOT = new URL('../', import.meta.url);
const LEGACY_PATHS = [
  '.github/workflows/sync-game.yml',
  'scripts/generate-game-data.mjs',
  'scripts/sync-config.js',
  'scripts/sync-game-data.mjs',
  'scripts/verify-game-data.mjs',
  'src/data/game-manifest.json',
  'src/scripts/game-config.js',
  'src/scripts/game-engine.js',
  'src/scripts/game-source.json',
];

async function exists(path) {
  try {
    await access(new URL(path, ROOT));
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

test('legacy game snapshot pipeline is retired and canonical package boundaries remain explicit', async () => {
  for (const path of LEGACY_PATHS) assert.equal(await exists(path), false, `${path} must remain retired`);
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(packageJson.scripts['sync:game'], undefined);
  assert.equal(packageJson.scripts['verify:game'], undefined);
  assert.equal(packageJson.scripts['sync:game-reference-artifact'], undefined);
  assert.match(packageJson.scripts['verify:game-reference-artifact'], /verify-game-reference-snapshot\.mjs$/);
  assert.match(packageJson.scripts['verify:artifact-directory'], /store-game-reference\.mjs$/);
  assert.match(packageJson.scripts['sync:game-reference'], /sync-canonical-game-reference\.mjs --write$/);
});
