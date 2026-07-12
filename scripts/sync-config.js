import https from 'https';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const GAME_REPOSITORY = process.env.GAME_REPOSITORY || 'shaku1z/tear';
const DEFAULT_BRANCH = process.env.GAME_BRANCH || 'main';
const FILES = ['utils.js', 'config.js', 'particles.js', 'projectile.js', 'variants.js', 'affixes.js', 'enemy.js', 'meta.js', 'upgrades.js', 'stages.js', 'achievements.js', 'challenges.js'];
const DEST_PATH = path.join(process.cwd(), 'src', 'scripts', 'game-engine.js');
const LOCAL_GAME_DIR = path.resolve(process.cwd(), '..', 'Tear');

function getLocalCommit() {
  try {
    return execFileSync('git', ['-C', LOCAL_GAME_DIR, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'local-unversioned';
  }
}

function isLocalWorktreeClean() {
  try {
    return execFileSync('git', ['-C', LOCAL_GAME_DIR, 'status', '--porcelain'], { encoding: 'utf8' }).trim() === '';
  } catch {
    return false;
  }
}

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'tear-wiki-sync', ...headers } }, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function resolveRemoteCommit() {
  if (process.env.GAME_COMMIT_SHA) return process.env.GAME_COMMIT_SHA;
  const data = await fetchUrl(`https://api.github.com/repos/${GAME_REPOSITORY}/commits/${DEFAULT_BRANCH}`, { Accept: 'application/vnd.github+json' });
  return JSON.parse(data).sha;
}

async function resolveSource() {
  const requestedMode = process.env.GAME_SOURCE || 'auto';
  const hasLocalGame = fs.existsSync(path.join(LOCAL_GAME_DIR, 'js'));

  if (requestedMode === 'local' && hasLocalGame && !process.env.GAME_COMMIT_SHA) {
    return { mode: 'local', commit: getLocalCommit(), root: path.join(LOCAL_GAME_DIR, 'js') };
  }

  if (requestedMode === 'auto' && hasLocalGame && !process.env.GAME_COMMIT_SHA && isLocalWorktreeClean()) {
    return { mode: 'local', commit: getLocalCommit(), root: path.join(LOCAL_GAME_DIR, 'js') };
  }

  if (requestedMode === 'auto' && hasLocalGame && !process.env.GAME_COMMIT_SHA) {
    console.log('Local game checkout has uncommitted changes; using the committed remote revision instead.');
  }

  const commit = await resolveRemoteCommit();
  return {
    mode: 'remote',
    commit,
    root: `https://raw.githubusercontent.com/${GAME_REPOSITORY}/${commit}/js/`,
  };
}

async function readSourceFile(source, filename) {
  if (source.mode === 'local') return fs.promises.readFile(path.join(source.root, filename), 'utf8');
  return fetchUrl(source.root + filename);
}

async function sync() {
  const source = await resolveSource();
  console.log(`Syncing game engine from ${source.mode} source at ${source.commit}...`);
  try {
    let combined = '';
    for (const file of FILES) {
      console.log(`Syncing ${file}...`);
      const data = await readSourceFile(source, file);
      combined += `\n// --- ${file} ---\n` + data + '\n';
    }
    
    const exports = `
export {
  clamp, lerp, len, lerpAngle, segPointDist, chargeTelegraph,
  CONFIG,
  FX, Projectile,
  VARIANTS, applyVariant,
  AFFIXES, PRESETS, applyAffix, applyPreset,
  Enemy, Charger, Ranged, Flyer, Bomber, Armored, Boss, Support, Wraith, Chimera, Warden, Colossus, Aldric, Echo, Source,
  SHOP,
  UPGRADES, applyUpgrade,
  STAGES,
  ACH, DAILY
};
`;
    combined += exports;
    
    const dir = path.dirname(DEST_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DEST_PATH, combined);
    fs.writeFileSync(path.join(path.dirname(DEST_PATH), 'game-source.json'), JSON.stringify({
      repository: GAME_REPOSITORY,
      commit: source.commit,
    }, null, 2) + '\n');
    console.log(`Successfully synced game engine to ${DEST_PATH}`);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
sync();
