import https from 'https';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://raw.githubusercontent.com/shaku1z/tear/master/js/';
const FILES = ['utils.js', 'config.js', 'particles.js', 'projectile.js', 'variants.js', 'enemy.js', 'meta.js'];
const DEST_PATH = path.join(process.cwd(), 'src', 'scripts', 'game-engine.js');

function fetchFile(filename) {
  return new Promise((resolve, reject) => {
    https.get(BASE_URL + filename, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`Failed to fetch ${filename}: ${res.statusCode}`));
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function sync() {
  console.log(`Syncing game engine from ${BASE_URL}...`);
  try {
    let combined = '';
    for (const file of FILES) {
      console.log(`Fetching ${file}...`);
      const data = await fetchFile(file);
      combined += `\n// --- ${file} ---\n` + data + '\n';
    }
    
    const exports = `
export {
  clamp, lerp, len, lerpAngle, segPointDist, chargeTelegraph,
  CONFIG,
  FX, Projectile,
  VARIANTS, applyVariant,
  Enemy, Charger, Ranged, Flyer, Bomber, Armored, Boss, Support, Wraith, Chimera, Warden, Colossus, Aldric, Echo, Source,
  SHOP
};
`;
    combined += exports;
    
    const dir = path.dirname(DEST_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DEST_PATH, combined);
    console.log(`Successfully synced game engine to ${DEST_PATH}`);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
sync();
