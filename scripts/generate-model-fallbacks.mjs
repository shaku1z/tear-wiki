import fs from 'node:fs';
import path from 'node:path';
import manifest from '../src/data/game-manifest.json' with { type: 'json' };

const models = ['charger', 'ranged', 'flyer', 'bomber', 'armored', 'support', 'wraith', 'chimera', 'warden', 'iron-colossus', 'aldric', 'the-echo', 'the-source'];
const configKey = (model) => model === 'charger' ? 'enemy' : model.replace('iron-', '').replace('the-', '');
const accentKey = (model) => ['warden', 'iron-colossus', 'aldric', 'the-echo', 'the-source'].includes(model) ? 'boss' : model === 'support' ? 'priest' : model;
const output = path.resolve('public/generated/models');
fs.mkdirSync(output, { recursive: true });

for (const model of models) {
  const cfg = manifest.config[configKey(model)] || manifest.config.boss;
  const color = manifest.config.colors[accentKey(model)] || manifest.config.colors.enemyShot;
  const width = Math.max(32, cfg.w || manifest.config.enemy.w);
  const height = Math.max(32, cfg.h || manifest.config.enemy.h);
  const bodyW = Math.min(120, width * .72);
  const bodyH = Math.min(150, height * .72);
  const x = 160 - bodyW / 2;
  const y = 104 - bodyH / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" role="img" aria-label="${model} archive silhouette"><rect width="320" height="180" fill="#0a0b0e"/><g opacity=".14" stroke="${color}"><path d="M0 45h320M0 90h320M0 135h320M80 0v180M160 0v180M240 0v180"/></g><ellipse cx="160" cy="143" rx="${bodyW * .8}" ry="8" fill="${color}" opacity=".15"/><rect x="${x}" y="${y}" width="${bodyW}" height="${bodyH}" fill="${color}" opacity=".88"/><rect x="${160 + bodyW * .12}" y="${y + bodyH * .3}" width="7" height="7" fill="#f7fbff"/><path d="M24 24h30M24 24v30M296 156h-30M296 156v-30" fill="none" stroke="${color}"/><text x="24" y="164" fill="#858a92" font-family="monospace" font-size="9" letter-spacing="2">${model.toUpperCase()}</text></svg>`;
  fs.writeFileSync(path.join(output, `${model}.svg`), svg);
}
console.log(`Generated ${models.length} synchronized model fallbacks.`);
