import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const artifact = JSON.parse(await readFile(new URL('../src/data/game-reference.v1.json', import.meta.url), 'utf8'));
const componentRoot = new URL('../src/components/', import.meta.url);

async function component(name) {
  return readFile(new URL(name, componentRoot), 'utf8');
}

test('modern reference components use the server-only artifact adapter', async () => {
  for (const name of ['AchievementCatalogue.astro', 'StageEnvironment.astro', 'EnemyStats.astro', 'BiomeNavigator.astro']) {
    const source = await component(name);
    assert.match(source, /\.\.\/data\/game-reference\.mjs/);
    assert.doesNotMatch(source, /game-engine\.js|game-manifest/);
  }
  const achievements = await component('AchievementCatalogue.astro');
  assert.match(achievements, /const visibleAchievements = achievements\.filter\(\(achievement\) => !achievement\.hidden\)/);
  assert.match(achievements, /achievement\.description/);
  assert.match(achievements, /const \{ rule \} = achievement/);
  const stages = await component('StageEnvironment.astro');
  assert.match(stages, /stage\?\.theme/);
  assert.match(stages, /stage\?\.narrative/);
  assert.match(stages, /entry\.unlockWave/);
  const enemies = await component('EnemyStats.astro');
  assert.match(enemies, /supportRoleIds/);
  assert.match(enemies, /HP, movement speed, and contact damage are not included/);
  assert.doesNotMatch(enemies, /CONFIG|VARIANTS/);
  const biome = await component('BiomeNavigator.astro');
  assert.match(biome, /stages\.map/);
  assert.match(biome, /stage\.theme/);
  assert.match(biome, /PAINTERS/);
});

test('artifact achievement, stage, and enemy shapes remain exact for the migrated views', () => {
  const achievements = artifact.collections.achievements.items;
  const achievementKeys = ['category', 'description', 'hidden', 'id', 'manual', 'master', 'name', 'rarity', 'rule'];
  assert.ok(achievements.length > 0);
  assert.equal(new Set(achievements.map((achievement) => achievement.id)).size, achievements.length);
  for (const achievement of achievements) {
    for (const key of achievementKeys) assert.ok(Object.hasOwn(achievement, key), `achievement ${achievement.id} lacks ${key}`);
    for (const key of ['category', 'goal', 'kind', 'stat']) assert.ok(Object.hasOwn(achievement.rule, key), `achievement ${achievement.id} rule lacks ${key}`);
  }
  assert.deepEqual([...new Set(achievements.map((achievement) => achievement.category))].sort(), ['boss', 'combat', 'mastery', 'progress', 'skill', 'survival']);
  assert.deepEqual([...new Set(achievements.map((achievement) => achievement.rarity))].sort(), ['common', 'epic', 'legendary', 'rare', 'uncommon']);

  const stages = artifact.collections.stages.items;
  const bosses = new Map(artifact.collections.bosses.items.map((boss) => [boss.id, boss]));
  assert.ok(stages.length > 0);
  assert.equal(new Set(stages.map((stage) => stage.id)).size, stages.length);
  for (const stage of stages) {
    assert.equal(bosses.get(stage.boss)?.stageId, stage.id);
    assert.deepEqual(Object.keys(stage.theme).sort(), ['accent', 'background', 'dark', 'platform']);
    assert.deepEqual(Object.keys(stage.narrative).sort(), ['art', 'chapter']);
    for (const entry of stage.pool) assert.deepEqual(Object.keys(entry).sort(), ['kind', 'unlockWave', 'weight']);
  }

  const enemyCatalog = artifact.collections.enemies.items;
  assert.ok(enemyCatalog.families.length > 0);
  assert.equal(new Set(enemyCatalog.families.map((family) => family.id)).size, enemyCatalog.families.length);
  for (const family of enemyCatalog.families) {
    for (const variant of family.variants) assert.deepEqual(Object.keys(variant).sort(), ['id', 'minWave', 'name', 'weight']);
  }
});
