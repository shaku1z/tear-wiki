import { createHash } from 'node:crypto';

const REPOSITORY = 'shaku1z/tear';
const MAX_INPUT_BYTES = 1024 * 1024;
const ACTIVE_WEAPONS = ['sword', 'hammer', 'greatsword', 'chainblade', 'riftlock'];
const RETIRED_WEAPONS = ['spear', 'ringblade'];
const REQUIRED_COLLECTIONS = ['achievements', 'bosses', 'enemies', 'modes', 'public-tuning', 'stages', 'upgrades', 'weapons'];
const SOURCE_OWNED_CATALOGS = ['achievements', 'bosses', 'modes', 'stages', 'upgrades'];
const CONTENT_ID = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/;

function fail(message) { throw new Error(`Invalid game-reference artifact: ${message}`); }
function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function exactKeys(value, keys, label) {
  if (!isRecord(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail(`${label} keys do not match`);
}
function requireKeys(value, keys, label) {
  if (!isRecord(value)) fail(`${label} must be an object`);
  for (const key of keys) if (!Object.hasOwn(value, key)) fail(`${label}.${key} is required`);
}
function exactArray(value, expected, label) {
  if (!Array.isArray(value) || value.length !== expected.length || value.some((item, index) => item !== expected[index])) fail(`${label} does not match the canonical sequence`);
}
function text(bytes, label) {
  if (!(typeof bytes === 'string' || bytes instanceof Uint8Array)) fail(`${label} must be UTF-8 bytes or a string`);
  const encoded = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  if (encoded.byteLength === 0 || encoded.byteLength > MAX_INPUT_BYTES) fail(`${label} must be nonempty and at most 1 MiB`);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(encoded); } catch { fail(`${label} must be strict UTF-8`); }
}
function contentId(value, label) {
  if (typeof value !== 'string' || !CONTENT_ID.test(value)) fail(`${label} must be a canonical content id`);
  return value;
}
function catalog(collections, name) {
  const envelope = collections[name];
  exactKeys(envelope, ['items', 'status'], `collections.${name}`);
  if (envelope.status !== 'complete') fail(`collections.${name}.status must be complete`);
  if (!Array.isArray(envelope.items) || envelope.items.length === 0) fail(`collections.${name}.items must be a nonempty array`);
  const ids = envelope.items.map((item, index) => {
    if (!isRecord(item)) fail(`collections.${name}.items[${index}] must be an object`);
    return contentId(item.id, `collections.${name}.items[${index}].id`);
  });
  if (new Set(ids).size !== ids.length) fail(`collections.${name} ids must be unique`);
  return { items: envelope.items, ids };
}

/** Validates the signed-pipeline game-reference artifact consumed by the wiki. */
export function validateGameReferenceArtifact({ manifestBytes, receiptBytes, expectedSha, expectedRunId }) {
  if (typeof expectedSha !== 'string' || !/^[0-9a-f]{40}$/.test(expectedSha)) fail('expectedSha must be a 40-character lowercase SHA');
  if (typeof expectedRunId !== 'string' || !/^[1-9][0-9]*$/.test(expectedRunId)) fail('expectedRunId must be a canonical positive integer string');
  const manifestText = text(manifestBytes, 'manifestBytes');
  const receiptText = text(receiptBytes, 'receiptBytes');
  if (!manifestText.endsWith('\n')) fail('manifest must end with a newline');
  let manifest, receipt;
  try { manifest = JSON.parse(manifestText); receipt = JSON.parse(receiptText); } catch { fail('files must be valid JSON'); }
  const manifestSha256 = createHash('sha256').update(manifestText).digest('hex');

  exactKeys(receipt, ['format', 'repository', 'sourceSha', 'gameReferenceFormat', 'gameReferenceSchemaVersion', 'terminologyVersion', 'artifactName', 'manifestFilename', 'manifestSha256', 'receiptFilename', 'retentionDays', 'generatedBy', 'validationRunId', 'validationEvent', 'validationRef'], 'receipt');
  if (typeof receipt.manifestSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(receipt.manifestSha256)) fail('receipt.manifestSha256 must be a lowercase SHA-256');
  const receiptExpected = { format: 'tear-game-reference-artifact-receipt.v1', repository: REPOSITORY, sourceSha: expectedSha, gameReferenceFormat: 'game-reference.v1', gameReferenceSchemaVersion: 2, terminologyVersion: 'g4-terminology-v1', artifactName: `tear-game-reference-v1-${expectedSha}`, manifestFilename: 'game-reference.v1.json', manifestSha256, receiptFilename: 'game-reference.v1.receipt.json', retentionDays: 90, generatedBy: 'pnpm publish:game-reference', validationRunId: expectedRunId, validationEvent: 'push', validationRef: 'refs/heads/main' };
  for (const [key, value] of Object.entries(receiptExpected)) if (receipt[key] !== value) fail(`receipt.${key} does not match`);

  exactKeys(manifest, ['collections', 'format', 'roster', 'schemaVersion', 'source', 'terminologyVersion'], 'manifest');
  if (manifest.format !== 'game-reference.v1' || manifest.schemaVersion !== 2 || manifest.terminologyVersion !== 'g4-terminology-v1') fail('manifest schema envelope does not match');
  exactKeys(manifest.source, ['repository', 'sha'], 'manifest.source');
  if (manifest.source.repository !== REPOSITORY || manifest.source.sha !== expectedSha) fail('manifest source does not match');
  exactKeys(manifest.roster, ['activeWeaponIds', 'id', 'retiredWeaponIds', 'schemaVersion'], 'manifest.roster');
  if (manifest.roster.id !== 'final-five' || manifest.roster.schemaVersion !== 'final-five-v1') fail('manifest roster envelope does not match');
  exactArray(manifest.roster.activeWeaponIds, ACTIVE_WEAPONS, 'active weapon ids');
  exactArray(manifest.roster.retiredWeaponIds, RETIRED_WEAPONS, 'retired weapon ids');

  requireKeys(manifest.collections, REQUIRED_COLLECTIONS, 'collections');
  const catalogs = Object.fromEntries(SOURCE_OWNED_CATALOGS.map((name) => [name, catalog(manifest.collections, name)]));
  const weapons = catalog(manifest.collections, 'weapons');
  exactArray(weapons.ids, ACTIVE_WEAPONS, 'collections.weapons ids');

  const stagesById = new Map(catalogs.stages.items.map((stage) => [stage.id, stage]));
  const bossesById = new Map(catalogs.bosses.items.map((boss) => [boss.id, boss]));
  for (const stage of catalogs.stages.items) {
    const bossId = contentId(stage.boss, `stage ${stage.id} boss`);
    const boss = bossesById.get(bossId);
    if (!boss) fail(`stage ${stage.id} references unknown boss ${bossId}`);
    if (boss.stageId !== stage.id) fail(`stage ${stage.id} and boss ${bossId} do not reference each other`);
  }
  for (const boss of catalogs.bosses.items) {
    const stageId = contentId(boss.stageId, `boss ${boss.id} stageId`);
    const stage = stagesById.get(stageId);
    if (!stage) fail(`boss ${boss.id} references unknown stage ${stageId}`);
    if (stage.boss !== boss.id) fail(`boss ${boss.id} and stage ${stageId} do not reference each other`);
  }

  const enemies = manifest.collections.enemies;
  exactKeys(enemies, ['items', 'status'], 'collections.enemies');
  if (enemies.status !== 'complete') fail('collections.enemies.status must be complete');
  requireKeys(enemies.items, ['affixes', 'families', 'presets'], 'collections.enemies.items');
  if (!Array.isArray(enemies.items.families) || !Array.isArray(enemies.items.affixes) || !Array.isArray(enemies.items.presets)) fail('enemy catalog records must be arrays');
  const familyIds = enemies.items.families.map((item, familyIndex) => {
    requireKeys(item, ['id', 'variants'], 'enemy family record');
    const familyId = contentId(item.id, `enemy family ${familyIndex} id`);
    if (!Array.isArray(item.variants)) fail('enemy family record is malformed');
    const variantIds = item.variants.map((variant, variantIndex) => {
      if (!isRecord(variant)) fail(`enemy family ${familyId} variant ${variantIndex} must be an object`);
      return contentId(variant.id, `enemy family ${familyId} variant ${variantIndex} id`);
    });
    if (new Set(variantIds).size !== variantIds.length) fail(`enemy family ${familyId} variant ids must be unique`);
    return familyId;
  });
  if (new Set(familyIds).size !== familyIds.length) fail('enemy family ids must be unique');
  const affixIds = enemies.items.affixes.map((item, index) => {
    requireKeys(item, ['color', 'id'], 'enemy affix record');
    const id = contentId(item.id, `enemy affix ${index} id`);
    if (typeof item.color !== 'string' || item.color.length === 0) fail('enemy affix record is malformed');
    return id;
  });
  if (new Set(affixIds).size !== affixIds.length) fail('enemy affix ids must be unique');
  const familySet = new Set(familyIds);
  const affixSet = new Set(affixIds);
  const presetIds = [];
  for (const item of enemies.items.presets) {
    requireKeys(item, ['affixIds', 'familyId'], 'enemy preset record');
    const familyId = contentId(item.familyId, 'enemy preset familyId');
    if (!familySet.has(familyId)) fail(`enemy preset references unknown family ${familyId}`);
    if (!Array.isArray(item.affixIds) || item.affixIds.length === 0) fail('enemy preset affixIds must be a nonempty array');
    const ids = item.affixIds.map((id, index) => contentId(id, `enemy preset affixIds[${index}]`));
    if (new Set(ids).size !== ids.length) fail('enemy preset affixIds must be unique');
    for (const id of ids) if (!affixSet.has(id)) fail(`enemy preset references unknown affix ${id}`);
    presetIds.push(`${familyId}:${ids.join(',')}`);
  }
  if (new Set(presetIds).size !== presetIds.length) fail('enemy preset ids must be unique');
  const tuning = manifest.collections['public-tuning'];
  exactKeys(tuning, ['items', 'status'], 'collections.public-tuning');
  if (tuning.status !== 'complete') fail('collections.public-tuning.status must be complete');
  requireKeys(tuning.items, ['difficultyCatalog', 'schemaVersion'], 'collections.public-tuning.items');
  if (tuning.items.schemaVersion !== 1) fail('public tuning schema must be 1');
  if (!Array.isArray(tuning.items.difficultyCatalog) || tuning.items.difficultyCatalog.some((item) => !isRecord(item) || typeof item.id !== 'string')) fail('difficulty catalog records are malformed');
  const difficultyIds = tuning.items.difficultyCatalog.map((item, index) => contentId(item.id, `difficulty ${index} id`));
  if (difficultyIds.length === 0 || new Set(difficultyIds).size !== difficultyIds.length) fail('difficulty ids must be nonempty and unique');
  return { manifest, receipt, manifestSha256 };
}
