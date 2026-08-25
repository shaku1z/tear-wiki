import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const artifact = JSON.parse(await readFile(new URL('../src/data/game-reference.v1.json', import.meta.url), 'utf8'));
const achievementsPage = await readFile(new URL('../dist/progression/achievements/index.html', import.meta.url), 'utf8');
const hidden = artifact.collections.achievements.items.filter((achievement) => achievement.hidden);
const visible = artifact.collections.achievements.items.find((achievement) => !achievement.hidden);

for (const achievement of hidden) {
  assert.doesNotMatch(achievementsPage, new RegExp(achievement.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(achievementsPage, new RegExp(achievement.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
assert.match(achievementsPage, new RegExp(visible.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(achievementsPage, new RegExp(visible.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

const stagePage = await readFile(new URL('../dist/stages/the-grounds/index.html', import.meta.url), 'utf8');
assert.match(stagePage, /The Grounds/);
assert.match(stagePage, /Where order is kept\./);
assert.match(stagePage, /The Warden/);

const enemyPage = await readFile(new URL('../dist/enemies/charger/index.html', import.meta.url), 'utf8');
assert.match(enemyPage, /CANONICAL FAMILY ID/);
assert.match(enemyPage, /PUBLISHED CONTRACT BOUNDARY/);
assert.doesNotMatch(enemyPage, /BASE HP|MOVE SPEED|CONTACT DMG/);

const rosterPage = await readFile(new URL('../dist/reference/weapon-roster/index.html', import.meta.url), 'utf8');
assert.match(rosterPage, /Final Five/);
for (const [id, label] of [['greatsword', 'Greatsword'], ['chainblade', 'Chainblade'], ['riftlock', 'Riftlock']]) {
  const weaponPage = await readFile(new URL(`../dist/weapons/${id}/index.html`, import.meta.url), 'utf8');
  assert.match(weaponPage, new RegExp(label));
}

console.log('Verified modern reference pages: hidden achievement data is suppressed, structural stage/enemy views render, and the Final Five weapon routes are built.');
